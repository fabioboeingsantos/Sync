// Verifica chamadas internas assinadas pelo backend Vercel e aplica limites em PostgreSQL.
function chaveServidor(nomeAtual, nomeLegado) {
  const valor = Deno.env.get(nomeAtual);
  return (valor ? JSON.parse(valor).default : null) ?? Deno.env.get(nomeLegado);
}

async function assinaturaValida(segredo, horario, assinatura, corpo) {
  if (!segredo || !/^\d{10}$/.test(horario) || !/^[a-f0-9]{64}$/i.test(assinatura)) return false;
  if (Math.abs(Date.now() / 1000 - Number(horario)) > 60) return false;
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytesAssinatura = Uint8Array.from(assinatura.match(/.{2}/g), (byte) => Number.parseInt(byte, 16));
  return crypto.subtle.verify('HMAC', chave, bytesAssinatura, new TextEncoder().encode(`${horario}.${corpo}`));
}

// O endpoint não aceita pedidos do navegador; só o backend com o segredo pode acioná-lo.
Deno.serve(async (requisicao) => {
  const headers = { 'Cache-Control': 'no-store' };
  if (requisicao.method !== 'POST') return Response.json({ erro: 'Método não permitido.' }, { status: 405, headers });
  const segredoAssinatura = Deno.env.get('JWT_SECRET_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  const chaveServidorAuth = chaveServidor('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
  if (!segredoAssinatura || !url || !chaveServidorAuth) return Response.json({ erro: 'Serviço indisponível.' }, { status: 503, headers });

  try {
    const horario = requisicao.headers.get('x-vc-timestamp') ?? '';
    const assinatura = requisicao.headers.get('x-vc-signature') ?? '';
    const corpo = await requisicao.text();
    if (corpo.length > 4096 || !(await assinaturaValida(segredoAssinatura, horario, assinatura, corpo))) {
      return Response.json({ erro: 'Chamada interna inválida.' }, { status: 401, headers });
    }
    const dados = JSON.parse(corpo);
    const respostaBanco = await fetch(new URL('/rest/v1/rpc/controle_limite_autenticacao', url), {
      method: 'POST',
      headers: {
        apikey: chaveServidorAuth,
        'Content-Type': 'application/json',
        ...(!chaveServidorAuth.startsWith('sb_secret_') ? { Authorization: `Bearer ${chaveServidorAuth}` } : {}),
      },
      body: JSON.stringify({
        p_acao: dados.acao, p_operacao: dados.operacao, p_chave: dados.chave,
        p_limite: dados.limite, p_janela_segundos: dados.janela_segundos,
        p_bloqueio_segundos: dados.bloqueio_segundos,
      }),
    });
    if (!respostaBanco.ok) return Response.json({ erro: 'Serviço de limite indisponível.' }, { status: 503, headers });
    return Response.json(await respostaBanco.json(), { status: 200, headers });
  } catch {
    return Response.json({ erro: 'Serviço de limite indisponível.' }, { status: 503, headers });
  }
});
