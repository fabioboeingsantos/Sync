// Valida pedidos internos assinados e mantém a confirmação opcional separada do Supabase Auth.
function chavePadrao(atual, legada) {
  const valor = Deno.env.get(atual);
  return (valor ? JSON.parse(valor).default : null) ?? Deno.env.get(legada);
}

// Impede acesso direto do navegador; somente a API da Vercel conhece o segredo HMAC.
async function chamadaValida(segredo, horario, assinatura, corpo) {
  if (!segredo || !/^\d{10}$/.test(horario) || !/^[a-f0-9]{64}$/i.test(assinatura)) return false;
  if (Math.abs(Date.now() / 1000 - Number(horario)) > 60) return false;
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = Uint8Array.from(assinatura.match(/.{2}/g), (parte) => Number.parseInt(parte, 16));
  return crypto.subtle.verify('HMAC', chave, bytes, new TextEncoder().encode(`${horario}.${corpo}`));
}

// Consulta o usuário pelo token individual antes de associar qualquer estado de e-mail à conta.
async function obterUsuario(url, chavePublica, token) {
  const resposta = await fetch(new URL('/auth/v1/user', url), {
    headers: { apikey: chavePublica, Authorization: `Bearer ${token}` },
  });
  return resposta.ok ? resposta.json() : null;
}

// Encaminha chamadas privilegiadas apenas para funções SQL restritas ao service_role.
async function chamarRpc(url, chaveServidor, nome, corpo) {
  const cabecalhos = { apikey: chaveServidor, 'Content-Type': 'application/json' };
  if (!chaveServidor.startsWith('sb_secret_')) cabecalhos.Authorization = `Bearer ${chaveServidor}`;
  return fetch(new URL(`/rest/v1/rpc/${nome}`, url), {
    method: 'POST', headers: cabecalhos, body: JSON.stringify(corpo),
  });
}

// Restringe a função a três operações pequenas: consultar, solicitar e consumir confirmação.
Deno.serve(async (requisicao) => {
  const headers = { 'Cache-Control': 'no-store' };
  const responder = (status, corpo) => Response.json(corpo, { status, headers });
  if (requisicao.method !== 'POST') return responder(405, { erro: 'Método não permitido.' });

  const segredo = Deno.env.get('JWT_SECRET_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  const chavePublica = chavePadrao('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
  const chaveServidor = chavePadrao('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
  if (!segredo || !url || !chavePublica || !chaveServidor) return responder(503, { erro: 'Serviço indisponível.' });

  try {
    const texto = await requisicao.text();
    const horario = requisicao.headers.get('x-vc-timestamp') ?? '';
    const assinatura = requisicao.headers.get('x-vc-signature') ?? '';
    if (texto.length > 8192 || !(await chamadaValida(segredo, horario, assinatura, texto))) {
      return responder(401, { erro: 'Chamada interna inválida.' });
    }
    const dados = JSON.parse(texto);

    if (dados.acao === 'consumir') {
      // O token original só chega do link de e-mail; a função recebe apenas seu hash SHA-256.
      if (typeof dados.token_hash !== 'string' || !/^[a-f0-9]{64}$/.test(dados.token_hash)) return responder(400, { erro: 'Link inválido ou expirado.' });
      const consumo = await chamarRpc(url, chaveServidor, 'consumir_verificacao_email', { p_token_hash: dados.token_hash });
      if (!consumo.ok) return responder(503, { erro: 'Não foi possível confirmar o endereço agora.' });
      if (await consumo.json() !== true) return responder(400, { erro: 'Link inválido, expirado ou já utilizado.' });
      return responder(200, { verificado: true });
    }

    // Consultar e emitir exigem uma sessão Auth válida para impedir confirmação em nome de outra pessoa.
    if (!['estado', 'emitir'].includes(dados.acao) || typeof dados.access_token !== 'string') return responder(400, { erro: 'Solicitação inválida.' });
    const usuario = await obterUsuario(url, chavePublica, dados.access_token);
    if (!usuario?.id || !usuario.email) return responder(401, { erro: 'Entre novamente para continuar.' });

    if (dados.acao === 'estado') {
      const estado = await chamarRpc(url, chaveServidor, 'estado_verificacao_email', { p_usuario_id: usuario.id });
      if (!estado.ok) return responder(503, { erro: 'Não foi possível consultar a conta agora.' });
      return responder(200, { ...await estado.json(), email: usuario.email });
    }

    // Aceita apenas hashes gerados pelo backend; não recebe nem persiste o token original.
    if (typeof dados.token_hash !== 'string' || !/^[a-f0-9]{64}$/.test(dados.token_hash)) return responder(400, { erro: 'Solicitação inválida.' });
    const emissao = await chamarRpc(url, chaveServidor, 'emitir_verificacao_email', {
      p_usuario_id: usuario.id, p_token_hash: dados.token_hash,
    });
    if (!emissao.ok) return responder(503, { erro: 'Não foi possível solicitar a confirmação agora.' });
    return responder(200, { emitido: await emissao.json(), email: usuario.email });
  } catch {
    // Erros internos não expõem tokens, credenciais nem detalhes do usuário.
    return responder(503, { erro: 'Serviço de confirmação indisponível.' });
  }
});
