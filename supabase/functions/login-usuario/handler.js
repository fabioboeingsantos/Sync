const formatoNome = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const erroCredenciais = 'Confira o usuário ou e-mail e a senha.';
const erroServico = 'Não foi possível entrar agora. Tente novamente.';

// Resolve o e-mail no servidor e entrega somente a sessão após o Supabase validar a senha.
export function criarLoginUsuario({ url, chavePublica, chaveServidor, origens, solicitar = fetch }) {
  return async (requisicao) => {
    const origem = requisicao.headers.get('Origin');
    const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
    if (origem && !origens.has(origem)) return Response.json({ erro: 'Origem não autorizada.' }, { status: 403, headers });
    if (origem) headers.set('Access-Control-Allow-Origin', origem);

    if (requisicao.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'apikey, content-type');
      return new Response(null, { status: 204, headers });
    }

    const responder = (status, corpo) => Response.json(corpo, { status, headers });
    if (requisicao.method !== 'POST') return responder(405, { erro: 'Método não permitido.' });
    if (!url || !chavePublica || !chaveServidor) return responder(503, { erro: erroServico });

    let nome;
    let senha;
    try {
      if (Number(requisicao.headers.get('Content-Length')) > 4096) return responder(413, { erro: erroCredenciais });
      const corpo = await requisicao.text();
      if (corpo.length > 4096) return responder(413, { erro: erroCredenciais });
      const dados = JSON.parse(corpo);
      nome = typeof dados?.nome === 'string' ? dados.nome.trim().toLowerCase() : '';
      senha = dados?.senha;
      if (!formatoNome.test(nome) || typeof senha !== 'string' || !senha) return responder(401, { erro: erroCredenciais });
    } catch {
      return responder(400, { erro: erroCredenciais });
    }

    try {
      const headersServidor = { apikey: chaveServidor, 'Content-Type': 'application/json' };
      // Chaves atuais usam apikey. Projetos com service_role legado também enviam o JWT no Authorization.
      if (!chaveServidor.startsWith('sb_secret_')) headersServidor.Authorization = `Bearer ${chaveServidor}`;
      const consulta = await solicitar(new URL('/rest/v1/rpc/email_para_nome_usuario', url), {
        method: 'POST', headers: headersServidor, body: JSON.stringify({ p_nome_usuario: nome }),
      });
      if (!consulta.ok) return responder(503, { erro: erroServico });
      const email = await consulta.json();

      // O Auth continua verificando credenciais e seus limites de tentativa, também para nomes desconhecidos.
      const login = await solicitar(new URL('/auth/v1/token?grant_type=password', url), {
        method: 'POST',
        headers: { apikey: chavePublica, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || 'login-sem-conta@visionchef.invalid', password: senha }),
      });
      if (login.status === 429) return responder(429, { erro: 'Muitas tentativas. Aguarde e tente novamente.' });
      if (!email || login.status === 400 || login.status === 401) return responder(401, { erro: erroCredenciais });
      if (!login.ok) return responder(503, { erro: erroServico });

      const { access_token, refresh_token } = await login.json();
      if (!access_token || !refresh_token) return responder(503, { erro: erroServico });
      return responder(200, { access_token, refresh_token });
    } catch {
      // Erros internos não expõem o e-mail resolvido, a senha ou as chaves usadas na consulta.
      return responder(503, { erro: erroServico });
    }
  };
}

