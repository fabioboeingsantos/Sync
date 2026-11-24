const formatoNome = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const erroCredenciais = 'Confira o usuário ou e-mail e a senha.';
const erroServico = 'Não foi possível entrar agora. Tente novamente.';

// Confere assinatura HMAC e prazo curto para que somente a API Sync obtenha tokens Supabase.
async function chamadaInternaValida(segredo, horario, assinatura, corpo) {
  if (!segredo || !/^\d{10}$/.test(horario) || !/^[a-f0-9]{64}$/i.test(assinatura)) return false;
  if (Math.abs(Date.now() / 1000 - Number(horario)) > 60) return false;
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytesAssinatura = Uint8Array.from(assinatura.match(/.{2}/g), (byte) => Number.parseInt(byte, 16));
  return crypto.subtle.verify('HMAC', chave, bytesAssinatura, new TextEncoder().encode(`${horario}.${corpo}`));
}

// Resolve o nome no servidor e entrega tokens somente à API que manterá a sessão HttpOnly.
export function criarLoginUsuario({ url, chavePublica, chaveServidor, chaveAssinatura, origens, solicitar = fetch }) {
  return async (requisicao) => {
    const origem = requisicao.headers.get('Origin');
    const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
    if (origem && !origens.has(origem)) return Response.json({ erro: 'Origem não autorizada.' }, { status: 403, headers });
    if (origem) headers.set('Access-Control-Allow-Origin', origem);
    if (requisicao.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'apikey, content-type, x-vc-timestamp, x-vc-signature');
      return new Response(null, { status: 204, headers });
    }
    const responder = (status, corpo) => Response.json(corpo, { status, headers });
    if (requisicao.method !== 'POST') return responder(405, { erro: 'Método não permitido.' });
    if (!url || !chavePublica || !chaveServidor || !chaveAssinatura) return responder(503, { erro: erroServico });

    let nome;
    let senha;
    try {
      if (Number(requisicao.headers.get('Content-Length')) > 4096) return responder(413, { erro: erroCredenciais });
      const corpo = await requisicao.text();
      if (corpo.length > 4096) return responder(413, { erro: erroCredenciais });
      const horario = requisicao.headers.get('x-vc-timestamp') ?? '';
      const assinatura = requisicao.headers.get('x-vc-signature') ?? '';
      if (!(await chamadaInternaValida(chaveAssinatura, horario, assinatura, corpo))) return responder(401, { erro: erroCredenciais });
      const dados = JSON.parse(corpo);
      nome = typeof dados?.nome === 'string' ? dados.nome.trim().toLowerCase() : '';
      senha = dados?.senha;
      if (!formatoNome.test(nome) || typeof senha !== 'string' || !senha) return responder(401, { erro: erroCredenciais });
    } catch {
      return responder(400, { erro: erroCredenciais });
    }

    try {
      const headersServidor = { apikey: chaveServidor, 'Content-Type': 'application/json' };
      if (!chaveServidor.startsWith('sb_secret_')) headersServidor.Authorization = `Bearer ${chaveServidor}`;
      const consulta = await solicitar(new URL('/rest/v1/rpc/email_para_nome_usuario', url), {
        method: 'POST', headers: headersServidor, body: JSON.stringify({ p_nome_usuario: nome }),
      });
      if (!consulta.ok) return responder(503, { erro: erroServico });
      const email = await consulta.json();
      const login = await solicitar(new URL('/auth/v1/token?grant_type=password', url), {
        method: 'POST',
        headers: { apikey: chavePublica, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || 'login-sem-conta@visionchef.invalid', password: senha }),
      });
      if (login.status === 429) return responder(429, { erro: 'Muitas tentativas. Aguarde e tente novamente.' });
      if (!email || login.status === 400 || login.status === 401) return responder(401, { erro: erroCredenciais });
      if (!login.ok) return responder(503, { erro: erroServico });
      const { access_token, refresh_token, expires_at, expires_in, user } = await login.json();
      if (!access_token || !refresh_token || !user?.id) return responder(503, { erro: erroServico });
      return responder(200, { access_token, refresh_token, expires_at, expires_in, user });
    } catch {
      // Erros internos não revelam o e-mail resolvido, a senha nem as chaves do servidor.
      return responder(503, { erro: erroServico });
    }
  };
}
