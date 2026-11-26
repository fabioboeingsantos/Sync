import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import { domainToASCII } from 'node:url';
import nodemailer from 'nodemailer';

// A política vale ao criar ou redefinir senhas. O login valida a credencial que já existe.
const senhaNovaValida = (senha) => typeof senha === 'string' && senha.length >= 8 && senha.length <= 128;
const mensagemSenhaNova = 'A senha deve ter entre 8 e 128 caracteres.';

// Consulta apenas o domínio. O DNS verifica o serviço de e-mail sem enviar uma mensagem à caixa postal.
const dnsCadastro = new Resolver({ timeout: 1500, tries: 2 });

async function dominioRecebeEmail(dominio) {
  try {
    const registros = await dnsCadastro.resolveMx(dominio);
    // Um MX vazio ou apontando para a raiz informa que o domínio não aceita e-mail (RFC 7505).
    return registros.some(({ exchange }) => exchange && exchange !== '.');
  } catch (erro) {
    if (erro.code === 'ENOTFOUND' || erro.code === 'ENODATA') return false;
    // Falhas temporárias de DNS não indicam que o endereço está inválido.
    return null;
  }
}

// Lê e valida toda configuração privada no servidor, sem incorporá-la ao JavaScript público.
function configuracao() {
  const ambiente = process.env;
  const numero = (nome, padrao, minimo, maximo) => {
    const bruto = ambiente[nome]?.trim();
    const valor = Number(bruto ? bruto : padrao);
    if (!Number.isInteger(valor) || valor < minimo || valor > maximo) throw new Error(`Configuração inválida: ${nome}.`);
    return valor;
  };
  const url = ambiente.VISIONCHEF_SUPABASE_URL?.trim();
  const chavePublica = ambiente.VISIONCHEF_SUPABASE_PUBLISHABLE_KEY?.trim();
  // Remove espaços ou quebras de linha acidentais nas bordas sem alterar o segredo interno.
  const jwtSecret = (ambiente.JWT_SECRET_KEY ?? '').trim();
  if (!url?.startsWith('https://') || !chavePublica?.startsWith('sb_publishable_') || jwtSecret.length < 32) {
    throw new Error('Configuração do backend ausente ou inválida.');
  }
  const algoritmo = ambiente.JWT_ALGORITHM?.trim() || 'HS256';
  if (algoritmo !== 'HS256') throw new Error('O backend aceita somente JWT HS256.');
  const expiraMinutos = numero('JWT_EXPIRATION_MINUTES', 10080, 15, 43200);
  // Mantém a sessão salva automaticamente por 7 dias de inatividade (ou valor maior configurado), com teto absoluto de 30 dias.
  const sessaoDias = numero('JWT_SESSION_DAYS', 7, 1, 30);
  const maxSessaoDias = numero('JWT_MAX_SESSION_DAYS', 30, sessaoDias, 90);
  return {
    url: url.replace(/\/$/, ''), chavePublica, jwtSecret,
    expiraMinutos,
    duracaoSessaoSegundos: Math.max(expiraMinutos * 60, sessaoDias * 86400),
    maxSessaoSegundos: Math.max(expiraMinutos * 60, maxSessaoDias * 86400),
    nomeCookie: ambiente.JWT_COOKIE_NAME?.trim() || 'access_token',
    cookieSeguro: ambiente.JWT_COOKIE_SECURE?.trim().toLowerCase() === 'true',
    limiteLogin: numero('AUTH_LOGIN_LIMIT', 5, 1, 100),
    limiteCadastro: numero('AUTH_SIGNUP_LIMIT', 3, 1, 100),
    // Mantém limite próprio para evitar envio abusivo do e-mail de confirmação.
    limiteConfirmacao: numero('AUTH_CONFIRMATION_LIMIT', 3, 1, 100),
    janela: numero('AUTH_RATE_WINDOW_SECONDS', 900, 30, 86400),
    bloqueio: numero('AUTH_BLOCK_SECONDS', 900, 30, 86400),
    // Credenciais SMTP são privadas e usadas somente pela função Node da Vercel.
    smtpHost: ambiente.SMTP_HOST?.trim(),
    smtpPorta: numero('SMTP_PORT', 587, 1, 65535),
    // Normaliza caixa e espaços para aceitar configurações como "SSL" ou "ssl" na Vercel.
    smtpSeguranca: (ambiente.SMTP_SECURITY?.trim() || 'starttls').toLowerCase(),
    smtpRemetente: ambiente.SMTP_FROM?.trim(),
    smtpUsuario: ambiente.SMTP_USER?.trim(),
    smtpSenha: ambiente.SMTP_PASSWORD?.trim(),
  };
}

// Padroniza respostas JSON e impede que páginas ou caches guardem dados autenticados.
function resposta(dados, status = 200, cabecalhos = {}) {
  return Response.json(dados, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...cabecalhos } });
}

// Mantém status e corpo constantes após uma solicitação válida, independentemente dos limites e do resultado do Auth.
function respostaRecuperacaoGenerica() {
  return resposta({
    enviada: true,
    mensagem: 'Se houver uma conta para esse e-mail, enviaremos um link de recuperação. Confira a caixa de entrada e também Spam/Lixo eletrônico, Promoções ou Atualizações.',
  });
}

// Extrai apenas o código técnico de erro do Supabase Auth, sem registrar e-mail, senha ou token.
function codigoErroAuth(dados) {
  const codigo = dados?.error_code ?? dados?.code ?? null;
  return typeof codigo === 'string' && codigo.trim() ? codigo.trim() : null;
}

// Assina o JWT da aplicação com HS256 e inclui a sessão Supabase para chamadas protegidas por RLS.
function assinarSessao(
  sessao,
  cfg,
  iat = Math.floor(Date.now() / 1000),
  exp = iat + cfg.duracaoSessaoSegundos,
  maxExp = iat + cfg.maxSessaoSegundos,
) {
  const cabecalho = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const expLimitado = Math.min(exp, maxExp);
  const corpo = Buffer.from(JSON.stringify({
    iss: 'sync-visionchef', sub: sessao.user.id, email: sessao.user.email,
    access_token: sessao.access_token, refresh_token: sessao.refresh_token,
    auth_exp: sessao.expires_at ?? Math.floor(Date.now() / 1000) + (sessao.expires_in ?? 3600),
    iat, exp: expLimitado, max_exp: maxExp,
  })).toString('base64url');
  const mensagem = `${cabecalho}.${corpo}`;
  const assinatura = createHmac('sha256', cfg.jwtSecret).update(mensagem).digest('base64url');
  return `${mensagem}.${assinatura}`;
}

// Verifica assinatura, algoritmo, emissor e validade antes de confiar nos dados do cookie.
function verificarSessao(token, cfg) {
  try {
    const [cabecalho, corpo, assinatura] = token.split('.');
    if (!cabecalho || !corpo || !assinatura) return null;
    const valorEsperado = createHmac('sha256', cfg.jwtSecret).update(`${cabecalho}.${corpo}`).digest();
    const valorRecebido = Buffer.from(assinatura, 'base64url');
    if (valorEsperado.length !== valorRecebido.length || !timingSafeEqual(valorEsperado, valorRecebido)) return null;
    const dadosCabecalho = JSON.parse(Buffer.from(cabecalho, 'base64url').toString());
    const dados = JSON.parse(Buffer.from(corpo, 'base64url').toString());
    const agora = Date.now() / 1000;
    if (
      dadosCabecalho.alg !== 'HS256'
      || dados.iss !== 'sync-visionchef'
      || !dados.sub
      || dados.exp <= agora
      || (dados.max_exp && dados.max_exp <= agora)
    ) return null;
    return dados;
  } catch {
    return null;
  }
}

// O cookie só trafega por HTTPS no domínio publicado e nunca fica disponível ao JavaScript da página.
function cookieSessao(token, cfg, requisicao, maxAgeSegundos = cfg.duracaoSessaoSegundos) {
  const segura = cfg.cookieSeguro || new URL(requisicao.url).protocol === 'https:';
  const maxAge = Math.max(60, Math.floor(maxAgeSegundos));
  return `${cfg.nomeCookie}=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${segura ? '; Secure' : ''}`;
}

// Apaga a sessão no mesmo escopo em que o cookie foi criado.
function cookieRemovido(cfg, requisicao) {
  const segura = cfg.cookieSeguro || new URL(requisicao.url).protocol === 'https:';
  return `${cfg.nomeCookie}=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0${segura ? '; Secure' : ''}`;
}

// Lê JSON com limite de tamanho para rejeitar corpos grandes antes de processar credenciais.
async function jsonEntrada(requisicao, limite = 32768) {
  const texto = await requisicao.text();
  if (texto.length > limite) throw Object.assign(new Error('Corpo muito grande.'), { status: 413 });
  return texto ? JSON.parse(texto) : {};
}

// Chama Auth ou PostgREST com a chave pública e o token individual do usuário, preservando RLS.
async function supabase(cfg, caminho, { metodo = 'GET', corpo, token, cabecalhos = {} } = {}) {
  const cab = { apikey: cfg.chavePublica, ...cabecalhos };
  if (token) cab.Authorization = `Bearer ${token}`;
  if (corpo !== undefined) cab['Content-Type'] = 'application/json';
  const respostaRemota = await fetch(new URL(caminho, `${cfg.url}/`), {
    method: metodo, headers: cab, body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await respostaRemota.text();
  let dados;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = null; }
  return { ok: respostaRemota.ok, status: respostaRemota.status, dados };
}

// Anexa o papel ao restaurante para a interface distinguir Dono, Gerente e Funcionário.
async function restaurantesComPapel(cfg, token) {
  const [restaurantes, vinculos] = await Promise.all([
    supabase(cfg, '/rest/v1/restaurantes?select=id,nome&order=nome.asc,id.asc', { token }),
    supabase(cfg, '/rest/v1/membros_restaurante?select=restaurante_id,papel&ativo=eq.true', { token }),
  ]);
  if (!restaurantes.ok) return restaurantes;
  if (!vinculos.ok) return vinculos;
  const papeis = new Map(vinculos.dados.map(({ restaurante_id, papel }) => [restaurante_id, papel]));
  return {
    ...restaurantes,
    dados: restaurantes.dados.map((restaurante) => ({ ...restaurante, papel: papeis.get(restaurante.id) ?? null })),
  };
}

// Gera uma chave de limite sem persistir e-mail, nome de usuário ou endereço IP no banco.
function chaveLimite(ip, categoria, identificador = '') {
  return createHash('sha256').update(`${categoria}|${ip}|${identificador}`).digest('hex');
}

// Pede ao Supabase uma contagem compartilhada entre instâncias da Vercel, assinando a chamada interna.
async function controlarLimite(cfg, operacao, chave, acao = 'verificar') {
  const limites = { login: cfg.limiteLogin, cadastro: cfg.limiteCadastro, confirmacao: cfg.limiteConfirmacao };
  const corpo = JSON.stringify({
    acao, operacao, chave,
    limite: limites[operacao],
    janela_segundos: cfg.janela, bloqueio_segundos: cfg.bloqueio,
  });
  const horario = String(Math.floor(Date.now() / 1000));
  const assinatura = createHmac('sha256', cfg.jwtSecret).update(`${horario}.${corpo}`).digest('hex');
  const remoto = await fetch(new URL('/functions/v1/limitar-autenticacao', cfg.url), {
    method: 'POST',
    headers: {
      apikey: cfg.chavePublica, 'Content-Type': 'application/json',
      'x-vc-timestamp': horario, 'x-vc-signature': assinatura,
    },
    body: corpo,
  });
  if (!remoto.ok) throw Object.assign(new Error('Controle de tentativas indisponível.'), { status: 503 });
  return remoto.json();
}

// Assina operações privadas para a Edge Function que grava o estado facultativo no banco.
async function verificacaoEmail(cfg, dados) {
  const corpo = JSON.stringify(dados);
  const horario = String(Math.floor(Date.now() / 1000));
  const assinatura = createHmac('sha256', cfg.jwtSecret).update(`${horario}.${corpo}`).digest('hex');
  const remoto = await fetch(new URL('/functions/v1/verificacao-email', cfg.url), {
    method: 'POST',
    headers: {
      apikey: cfg.chavePublica, 'Content-Type': 'application/json',
      'x-vc-timestamp': horario, 'x-vc-signature': assinatura,
    },
    body: corpo,
  });
  const resultado = await remoto.json().catch(() => null);
  if (!remoto.ok) throw Object.assign(new Error('Serviço de confirmação indisponível.'), { status: remoto.status, detalhes: resultado });
  return resultado;
}

// Cria uma conexão SMTP somente quando a pessoa solicita a confirmação da própria conta.
async function enviarConfirmacao(cfg, destinatario, token, origem) {
  if (!cfg.smtpHost || !cfg.smtpRemetente || !cfg.smtpUsuario || !cfg.smtpSenha) {
    throw Object.assign(new Error('SMTP não configurado.'), { status: 503 });
  }
  if (!['ssl', 'starttls'].includes(cfg.smtpSeguranca)) throw Object.assign(new Error('Segurança SMTP inválida.'), { status: 503 });
  const transporter = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPorta,
    secure: cfg.smtpSeguranca === 'ssl',
    requireTLS: cfg.smtpSeguranca === 'starttls',
    auth: { user: cfg.smtpUsuario, pass: cfg.smtpSenha },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  const link = `${origem}/#confirmar-email=${token}`;
  // Preserva o endereço autorizado pelo SMTP, usando sempre um nome de exibição institucional.
  const enderecoRemetente = cfg.smtpRemetente.match(/<([^<>]+)>/)?.[1] ?? cfg.smtpRemetente;
  const remetente = { name: 'Equipe VisionChef', address: enderecoRemetente.trim() };
  // Envia versão em texto e HTML com identidade Aço Inox, preheader limpo e tom profissional cordial.
  const resultado = await transporter.sendMail({
    from: remetente,
    to: destinatario,
    subject: 'Confirme seu e-mail no VisionChef',
    text: `Olá,\n\nRecebemos sua solicitação para confirmar este endereço na sua conta do VisionChef.\n\nAcesse o link abaixo para concluir a verificação:\n${link}\n\nEste link é válido por 24 horas e pode ser utilizado uma única vez. Caso você não tenha feito esta solicitação, basta ignorar esta mensagem.\n\nAtenciosamente,\nEquipe VisionChef`,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#f4f6f7;font-family:Arial,sans-serif;color:#182327;"><span style="display:none;max-height:0;overflow:hidden;opacity:0;">Conclua a confirmação do seu endereço na conta VisionChef (link válido por 24 horas).</span><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #2a7f8e;border-radius:14px;overflow:hidden;"><tr><td style="background:#0f4c5c;padding:20px 24px;color:#ffffff;"><p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#a8d5dd;font-weight:700;">Sync · VisionChef</p><h1 style="margin:6px 0 0;font-size:20px;line-height:1.25;">Confirme seu e-mail</h1></td></tr><tr><td style="padding:24px;"><p style="margin:0 0 14px;font-size:15px;line-height:1.55;">Olá,</p><p style="margin:0 0 20px;font-size:15px;line-height:1.55;">Recebemos sua solicitação para confirmar este endereço na sua conta do <strong>VisionChef</strong>. Clique no botão abaixo para concluir:</p><p style="margin:0 0 22px;"><a href="${link}" style="display:inline-block;padding:13px 22px;background:#0f4c5c;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">Confirmar e-mail</a></p><p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#2a7f8e;">Este link é válido por 24 horas e pode ser utilizado uma única vez. Caso não tenha feito esta solicitação, basta ignorar esta mensagem.</p><p style="margin:0;font-size:12px;line-height:1.5;color:#2a7f8e;word-break:break-all;">Se o botão não abrir, copie este endereço no navegador:<br>${link}</p></td></tr></table></body></html>`,
  });
  const aceitos = Array.isArray(resultado?.accepted) ? resultado.accepted.length : 0;
  const rejeitados = Array.isArray(resultado?.rejected) ? resultado.rejected.length : 0;
  // Só considera o envio aceito quando o servidor SMTP confirma pelo menos um destinatário sem rejeição.
  if (aceitos < 1 || rejeitados > 0) {
    throw Object.assign(new Error('Servidor SMTP não aceitou o destinatário.'), { status: 503, code: 'ESMTP_REJECTED' });
  }
  return { aceitos, rejeitados };
}

// Extrai a sessão do cookie, renova tokens Supabase perto do vencimento e estende a janela deslizante de uso.
async function obterSessao(requisicao, cfg) {
  const cookies = requisicao.headers.get('cookie') ?? '';
  const valor = cookies.split(';').map((parte) => parte.trim()).find((parte) => parte.startsWith(`${cfg.nomeCookie}=`))?.slice(cfg.nomeCookie.length + 1);
  const sessao = valor ? verificarSessao(decodeURIComponent(valor), cfg) : null;
  if (!sessao) return { sessao: null, limpar: Boolean(valor) };

  const agora = Math.floor(Date.now() / 1000);
  const maxExp = sessao.max_exp ?? (sessao.iat + cfg.maxSessaoSegundos);
  const novoExp = Math.min(agora + cfg.duracaoSessaoSegundos, maxExp);
  // Estende automaticamente a sessão deslizante quando o uso passa de 1 dia desde a última renovação.
  const precisaEstenderCookie = novoExp - sessao.exp >= 86400;
  const precisaRenovarAuth = sessao.auth_exp <= agora + 60;

  if (!precisaRenovarAuth) {
    if (!precisaEstenderCookie) return { sessao, limpar: false };
    const tokenRenovado = assinarSessao(
      { user: { id: sessao.sub, email: sessao.email }, access_token: sessao.access_token, refresh_token: sessao.refresh_token, expires_at: sessao.auth_exp },
      cfg,
      sessao.iat,
      novoExp,
      maxExp,
    );
    return { sessao: { ...sessao, exp: novoExp, max_exp: maxExp }, limpar: false, renovarCookie: tokenRenovado, maxAgeCookie: novoExp - agora };
  }

  const renovada = await supabase(cfg, '/auth/v1/token?grant_type=refresh_token', {
    metodo: 'POST', corpo: { refresh_token: sessao.refresh_token },
  });
  if (!renovada.ok || !renovada.dados?.access_token) return { sessao: null, limpar: true };
  const atualizada = {
    ...sessao,
    access_token: renovada.dados.access_token,
    refresh_token: renovada.dados.refresh_token,
    auth_exp: renovada.dados.expires_at ?? agora + (renovada.dados.expires_in ?? 3600),
    exp: novoExp,
    max_exp: maxExp,
  };
  const tokenRenovado = assinarSessao(
    { user: { id: atualizada.sub, email: atualizada.email }, access_token: atualizada.access_token, refresh_token: atualizada.refresh_token, expires_at: atualizada.auth_exp },
    cfg,
    sessao.iat,
    novoExp,
    maxExp,
  );
  return { sessao: atualizada, limpar: false, renovarCookie: tokenRenovado, maxAgeCookie: novoExp - agora };
}

// Transforma erros conhecidos do PostgREST em mensagens úteis sem expor detalhes internos.
function erroBanco(remoto) {
  const codigo = remoto.dados?.code;
  const mensagem = codigo === '42501' ? 'Sua conta não tem acesso a esse estoque ou operação.'
    : codigo === '23505' ? 'Este registro já foi enviado com outros dados.'
      : codigo === 'PT404' ? (remoto.dados?.message || 'Registro não encontrado.')
        : codigo === 'PT409' ? (remoto.dados?.message || 'Não foi possível concluir por conflito de estado.')
          : codigo === '22023' ? (remoto.dados?.message || 'Confira os dados informados e tente novamente.')
            : remoto.status === 401 ? 'Entre novamente para continuar.'
              : 'Não foi possível concluir a operação. Confira os dados e tente novamente.';
  const status = codigo === '42501' ? 403
    : codigo === 'PT404' ? 404
      : codigo === 'PT409' || codigo === '23505' ? 409
        : codigo === '22023' ? 400
          : remoto.status || 503;
  return resposta({ erro: mensagem, codigo }, status);
}

// Atende login, cadastro, sessão e dados do estoque sem entregar tokens Supabase ao navegador.
export async function tratarApi(requisicao) {
  const url = new URL(requisicao.url);
  // Aceita a rota direta (com ou sem barra final) e o rewrite da Vercel para /api/index?__rota=...
  const rotaDireta = url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  const rotaRewrite = (url.searchParams.get('__rota') ?? '').replace(/^\/+|\/+$/g, '');
  const caminho = (!rotaDireta || rotaDireta === 'index' || rotaDireta === 'index.js') && rotaRewrite
    ? rotaRewrite
    : rotaDireta;

  // Liveness: confirma que a função Node está ativa sem expor variáveis nem depender de rede externa.
  if (caminho === 'health' && requisicao.method === 'GET') {
    return resposta({ status: 'ok', servico: 'visionchef-api', runtime: 'node', timestamp: new Date().toISOString() }, 200);
  }

  let cfg;
  try { cfg = configuracao(); } catch (erro) {
    // Registra apenas o motivo técnico da validação, sem valores de variáveis ou segredos.
    console.error('Configuração inválida da API:', erro?.message ?? 'desconhecida');
    if (caminho === 'health/ready' && requisicao.method === 'GET') {
      return resposta({ status: 'degraded', dependencias: { configuracao: 'erro', auth: 'nao_verificado' } }, 503);
    }
    return resposta({ erro: 'Backend não configurado.' }, 503);
  }

  // Readiness: valida configuração privada e disponibilidade do Supabase Auth sem expor URL ou chaves.
  if (caminho === 'health/ready' && requisicao.method === 'GET') {
    try {
      const remoto = await fetch(new URL('/auth/v1/health', `${cfg.url}/`), {
        headers: { apikey: cfg.chavePublica },
        signal: AbortSignal.timeout(5000),
      });
      if (!remoto.ok) {
        return resposta({ status: 'degraded', dependencias: { configuracao: 'ok', auth: 'indisponivel' } }, 503);
      }
      return resposta({ status: 'ready', dependencias: { configuracao: 'ok', auth: 'ok' } }, 200);
    } catch {
      return resposta({ status: 'degraded', dependencias: { configuracao: 'ok', auth: 'indisponivel' } }, 503);
    }
  }

  const origem = requisicao.headers.get('origin');
  if (requisicao.method !== 'GET' && requisicao.method !== 'HEAD' && origem !== url.origin) {
    return resposta({ erro: 'Origem não autorizada.' }, 403);
  }

  try {
    if (caminho === 'auth/login' && requisicao.method === 'POST') {
      const dados = await jsonEntrada(requisicao, 8192);
      const identificador = typeof dados.identificador === 'string' ? dados.identificador.trim().toLowerCase() : '';
      const senha = dados.senha;
      if (!identificador || typeof senha !== 'string' || !senha || senha.length > 256) return resposta({ erro: 'Confira o usuário ou e-mail e a senha.' }, 401);
      const ip = requisicao.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconhecido';
      const chave = chaveLimite(ip, 'login', identificador);
      const limite = await controlarLimite(cfg, 'login', chave);
      if (!limite.permitido) return resposta({ erro: 'Muitas tentativas. Aguarde e tente novamente.' }, 429, { 'Retry-After': String(limite.retry_after ?? cfg.bloqueio) });

      let remoto;
      if (identificador.includes('@')) {
        remoto = await supabase(cfg, '/auth/v1/token?grant_type=password', { metodo: 'POST', corpo: { email: identificador, password: senha } });
      } else {
        // O e-mail associado ao nome é resolvido pela função protegida do Supabase.
        const corpo = JSON.stringify({ nome: identificador, senha });
        const horario = String(Math.floor(Date.now() / 1000));
        const assinatura = createHmac('sha256', cfg.jwtSecret).update(`${horario}.${corpo}`).digest('hex');
        const respostaNome = await fetch(new URL('/functions/v1/login-usuario', cfg.url), {
          method: 'POST',
          headers: {
            apikey: cfg.chavePublica, 'Content-Type': 'application/json', Origin: origem,
            'x-vc-timestamp': horario, 'x-vc-signature': assinatura,
          },
          body: corpo,
        });
        remoto = { ok: respostaNome.ok, status: respostaNome.status, dados: await respostaNome.json().catch(() => null) };
      }
      if (!remoto.ok || !remoto.dados?.access_token || !remoto.dados?.refresh_token) {
        const codigo = codigoErroAuth(remoto.dados);
        // Registra apenas status e código técnico do Auth para diagnosticar falhas sem expor credenciais.
        console.warn('Falha no login via Auth:', { status: remoto.status, codigo });
        if (codigo === 'email_not_confirmed') {
          return resposta({ erro: 'Confirme seu e-mail para entrar ou solicite um novo link.', codigo }, 403);
        }
        return resposta({ erro: remoto.status === 429 ? 'Muitas tentativas. Aguarde e tente novamente.' : 'Confira o usuário ou e-mail e a senha.' }, remoto.status === 429 ? 429 : remoto.status >= 500 ? 503 : 401);
      }
      // Se o Auth retornar os tokens sem o perfil, confirma a identidade com o próprio token.
      let sessaoAuth = remoto.dados;
      if (!sessaoAuth.user?.id) {
        const perfilAuth = await supabase(cfg, '/auth/v1/user', { token: sessaoAuth.access_token });
        if (!perfilAuth.ok || !perfilAuth.dados?.id) {
          console.warn('Falha ao obter identidade após o login:', { status: perfilAuth.status });
          return resposta({ erro: 'Não foi possível abrir sua sessão. Tente novamente.' }, 503);
        }
        sessaoAuth = { ...sessaoAuth, user: perfilAuth.dados };
      }
      await controlarLimite(cfg, 'login', chave, 'reset').catch(() => null);
      const token = assinarSessao(sessaoAuth, cfg);
      return resposta({ autenticado: true }, 200, { 'Set-Cookie': cookieSessao(token, cfg, requisicao) });
    }

    if (caminho === 'auth/signup' && requisicao.method === 'POST') {
      const dados = await jsonEntrada(requisicao, 8192);
      const nome = typeof dados.nomeUsuario === 'string' ? dados.nomeUsuario.trim().toLowerCase() : '';
      const email = typeof dados.email === 'string' ? dados.email.trim().toLowerCase() : '';
      const senha = dados.senha;
      if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(nome) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return resposta({ erro: 'Confira o usuário e o e-mail.' }, 400);
      }
      if (!senhaNovaValida(senha)) return resposta({ erro: mensagemSenhaNova }, 400);
      // O domínio precisa ser um nome DNS, sem caracteres que indiquem uma URL.
      const dominioInformado = email.split('@')[1];
      const dominio = /[\\/%:?#\[\]]/.test(dominioInformado) ? '' : domainToASCII(dominioInformado);
      if (!dominio || dominio.split('.').some(rotulo => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(rotulo))) {
        return resposta({ erro: 'Informe um e-mail com domínio válido.' }, 400);
      }
      const ip = requisicao.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconhecido';
      const chave = chaveLimite(ip, 'cadastro');
      const limite = await controlarLimite(cfg, 'cadastro', chave);
      if (!limite.permitido) return resposta({ erro: 'Muitos cadastros em sequência. Aguarde e tente novamente.' }, 429, { 'Retry-After': String(limite.retry_after ?? cfg.bloqueio) });
      // O limite de cadastro também protege as consultas DNS antes de criar a conta no Supabase.
      const aceitaEmail = await dominioRecebeEmail(dominio);
      if (aceitaEmail === null) {
        return resposta({ erro: 'Não foi possível verificar o domínio do e-mail agora. Tente novamente.', codigo: 'consulta_email_indisponivel' }, 503);
      }
      if (!aceitaEmail) return resposta({ erro: 'O domínio desse e-mail não recebe mensagens. Confira o endereço ou use outro e-mail.' }, 400);
      const cadastro = await supabase(cfg, `/auth/v1/signup?redirect_to=${encodeURIComponent(url.origin)}`, {
        metodo: 'POST', corpo: { email, password: senha, data: { nome_usuario: nome } },
      });
      if (!cadastro.ok) {
        const codigo = codigoErroAuth(cadastro.dados);
        console.warn('Falha no cadastro via Auth:', { status: cadastro.status, codigo });
        if (cadastro.status === 429 || codigo === 'over_email_send_rate_limit') {
          return resposta({ erro: 'Muitos envios de e-mail em sequência. Aguarde alguns minutos e tente novamente.', codigo: 'limite_envio_email' }, 429);
        }
        return resposta({ erro: 'Não foi possível criar a conta. Confira os dados ou tente outro usuário e e-mail.' }, cadastro.status >= 500 ? 503 : cadastro.status);
      }
      // Com Confirm Email desligado no Supabase, o cadastro retorna sessão e abre a área da própria conta.
      if (cadastro.dados?.access_token && cadastro.dados?.refresh_token && cadastro.dados?.user?.id) {
        const token = assinarSessao(cadastro.dados, cfg);
        return resposta({ criada: true, autenticado: true }, 201, { 'Set-Cookie': cookieSessao(token, cfg, requisicao) });
      }
      return resposta({ criada: true, autenticado: false, mensagem: 'Conta criada. Entre após concluir a confirmação de e-mail.' }, 201);
    }

    if (caminho === 'auth/recover' && requisicao.method === 'POST') {
      const dados = await jsonEntrada(requisicao, 4096);
      const email = typeof dados.email === 'string' ? dados.email.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return resposta({ erro: 'Informe um e-mail válido.' }, 400);
      const ip = requisicao.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconhecido';
      const chave = chaveLimite(ip, 'login', email);
      const limite = await controlarLimite(cfg, 'login', chave);
      if (!limite.permitido) return respostaRecuperacaoGenerica();
      // Evita consulta prévia de existência: endereços cadastrados e não cadastrados seguem o mesmo fluxo.
      const remoto = await supabase(cfg, `/auth/v1/recover?redirect_to=${encodeURIComponent(url.origin)}`, { metodo: 'POST', corpo: { email } });
      if (!remoto.ok) {
        const codigo = codigoErroAuth(remoto.dados);
        console.warn('Falha na recuperação via Auth:', { status: remoto.status, codigo });
      }
      return respostaRecuperacaoGenerica();
    }

    if (caminho === 'auth/update-password' && requisicao.method === 'POST') {
      const dados = await jsonEntrada(requisicao, 8192);
      const tokenRecuperacao = typeof dados.access_token === 'string' ? dados.access_token : '';
      if (!tokenRecuperacao) return resposta({ erro: 'O link expirou. Solicite uma nova recuperação.' }, 400);
      if (!senhaNovaValida(dados.senha)) return resposta({ erro: mensagemSenhaNova }, 400);
      const remoto = await supabase(cfg, '/auth/v1/user', { metodo: 'PUT', token: tokenRecuperacao, corpo: { password: dados.senha } });
      if (!remoto.ok) {
        console.warn('Falha na redefinição de senha via Auth:', { status: remoto.status, codigo: codigoErroAuth(remoto.dados) });
        return resposta({ erro: 'O link pode ter expirado. Solicite uma nova recuperação.' }, remoto.status === 401 ? 401 : 400);
      }
      return resposta({ atualizada: true }, 200, { 'Set-Cookie': cookieRemovido(cfg, requisicao) });
    }

    if (caminho === 'auth/verify-email' && requisicao.method === 'POST') {
      // Limita tentativas de consumo por IP antes de validar o token enviado no link.
      const ip = requisicao.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconhecido';
      const chave = chaveLimite(ip, 'confirmacao-link');
      const limite = await controlarLimite(cfg, 'confirmacao', chave);
      if (!limite.permitido) return resposta({ erro: 'Muitas tentativas. Aguarde e tente novamente.' }, 429, { 'Retry-After': String(limite.retry_after ?? cfg.bloqueio) });
      const dados = await jsonEntrada(requisicao, 2048);
      const token = typeof dados.token === 'string' ? dados.token : '';
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return resposta({ erro: 'O link é inválido ou expirou.' }, 400);
      try {
        await verificacaoEmail(cfg, { acao: 'consumir', token_hash: createHash('sha256').update(token).digest('hex') });
      } catch (erro) {
        return resposta({ erro: erro.status === 400 ? 'O link é inválido, expirou ou já foi utilizado.' : 'Não foi possível confirmar agora.' }, erro.status === 400 ? 400 : 503);
      }
      return resposta({ verificado: true, mensagem: 'E-mail confirmado.' });
    }

    if (caminho === 'auth/logout' && requisicao.method === 'POST') {
      const dados = await jsonEntrada(requisicao, 2048).catch(() => ({}));
      const escopo = dados?.escopo === 'global' ? 'global' : 'local';
      const estado = await obterSessao(requisicao, cfg);
      if (estado.sessao) {
        await supabase(cfg, `/auth/v1/logout?scope=${escopo}`, { metodo: 'POST', token: estado.sessao.access_token }).catch(() => null);
      }
      return resposta({ autenticado: false, escopo }, 200, { 'Set-Cookie': cookieRemovido(cfg, requisicao) });
    }

    const estado = await obterSessao(requisicao, cfg);
    if (!estado.sessao) {
      const cabecalhos = estado.limpar ? { 'Set-Cookie': cookieRemovido(cfg, requisicao) } : {};
      if (caminho === 'auth/session' && requisicao.method === 'GET') return resposta({ user: null, restaurantes: null }, 200, cabecalhos);
      return resposta({ erro: 'Entre novamente para continuar.' }, 401, cabecalhos);
    }
    const cookieAtualizado = estado.renovarCookie
      ? { 'Set-Cookie': cookieSessao(estado.renovarCookie, cfg, requisicao, estado.maxAgeCookie) }
      : {};
    const token = estado.sessao.access_token;

    if (caminho === 'auth/session' && requisicao.method === 'GET') {
      const [usuario, restaurantes] = await Promise.all([
        supabase(cfg, '/auth/v1/user', { token }),
        restaurantesComPapel(cfg, token),
      ]);
      if (!usuario.ok) return resposta({ erro: 'Entre novamente para continuar.' }, 401, { ...cookieAtualizado, 'Set-Cookie': cookieRemovido(cfg, requisicao) });
      if (!restaurantes.ok) return erroBanco(restaurantes);
      // Mantém a sessão do usuário disponível mesmo se a consulta auxiliar de confirmação falhar temporariamente.
      let confirmacao = { verificado: false, verificado_em: null };
      try {
        confirmacao = await verificacaoEmail(cfg, { acao: 'estado', access_token: token });
      } catch (erro) {
        console.error('Falha ao consultar estado de confirmação de e-mail:', { status: erro?.status ?? 503 });
      }
      // A função lê somente o perfil da identidade autenticada e não expõe a tabela de usuários ao navegador.
      let nomeUsuario = null;
      const perfil = await supabase(cfg, '/rest/v1/rpc/nome_usuario_proprio', { metodo: 'POST', corpo: {}, token });
      if (perfil.ok && typeof perfil.dados === 'string') nomeUsuario = perfil.dados;
      return resposta({ user: { ...usuario.dados, nome_usuario: nomeUsuario }, restaurantes: restaurantes.dados, email_verificado_app: Boolean(confirmacao?.verificado), email_verificado_em: confirmacao?.verificado_em ?? null }, 200, cookieAtualizado);
    }

    if (caminho === 'auth/username' && requisicao.method === 'POST') {
      const dados = await jsonEntrada(requisicao, 2048);
      const nome = typeof dados.nome_usuario === 'string' ? dados.nome_usuario.trim().toLowerCase() : '';
      if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(nome)) {
        return resposta({ erro: 'Use de 3 a 32 letras, números, ponto, hífen ou sublinhado.' }, 400, cookieAtualizado);
      }
      const perfil = await supabase(cfg, '/rest/v1/rpc/definir_nome_usuario_proprio', {
        metodo: 'POST', corpo: { p_nome_usuario: nome }, token,
      });
      if (!perfil.ok) {
        const codigo = perfil.dados?.code;
        const status = codigo === '23505' ? 409 : codigo === 'PT409' ? 409 : codigo === '22023' ? 400 : perfil.status >= 500 ? 503 : perfil.status;
        const erro = codigo === '23505' ? 'Esse nome de usuário já está sendo usado.'
          : codigo === 'PT409' ? 'Sua conta já tem um nome de usuário.'
            : codigo === '22023' ? (perfil.dados?.message ?? 'Confira o nome de usuário.')
              : 'Não foi possível salvar o nome de usuário agora.';
        return resposta({ erro }, status, cookieAtualizado);
      }
      return resposta({ nome_usuario: perfil.dados }, 200, cookieAtualizado);
    }

    if (caminho === 'auth/change-email' && requisicao.method === 'POST') {
      const dados = await jsonEntrada(requisicao, 8192);
      const emailNovo = typeof dados.email_novo === 'string' ? dados.email_novo.trim().toLowerCase() : '';
      const senhaAtual = typeof dados.senha_atual === 'string' ? dados.senha_atual : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNovo) || emailNovo.length > 254) {
        return resposta({ erro: 'Informe um endereço de e-mail válido.' }, 400, cookieAtualizado);
      }
      if (!senhaAtual || senhaAtual.length > 128) return resposta({ erro: 'Informe sua senha atual.' }, 400, cookieAtualizado);

      // Revalida a identidade e a senha no Auth antes de permitir a alteração do endereço.
      const identidade = await supabase(cfg, '/auth/v1/user', { token });
      if (!identidade.ok || !identidade.dados?.email) return resposta({ erro: 'Entre novamente para continuar.' }, 401, cookieAtualizado);
      if (identidade.dados.email.trim().toLowerCase() === emailNovo) {
        return resposta({ erro: 'O novo e-mail deve ser diferente do endereço atual.' }, 400, cookieAtualizado);
      }
      const ip = requisicao.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconhecido';
      const chave = chaveLimite(ip, 'login', estado.sessao.sub);
      const limite = await controlarLimite(cfg, 'login', chave);
      if (!limite.permitido) return resposta({ erro: 'Muitas tentativas. Aguarde antes de confirmar sua senha atual.' }, 429, { ...cookieAtualizado, 'Retry-After': String(limite.retry_after ?? cfg.bloqueio) });
      const validacao = await supabase(cfg, '/auth/v1/token?grant_type=password', {
        metodo: 'POST', corpo: { email: identidade.dados.email, password: senhaAtual },
      });
      if (!validacao.ok || !validacao.dados?.access_token) {
        return resposta({ erro: 'A senha atual não confere.' }, 401, cookieAtualizado);
      }
      await controlarLimite(cfg, 'login', chave, 'reset').catch(() => null);
      const atualizacao = await supabase(cfg, '/auth/v1/user', {
        metodo: 'PUT', token: validacao.dados.access_token, corpo: { email: emailNovo },
      });
      if (!atualizacao.ok) {
        const codigo = codigoErroAuth(atualizacao.dados);
        if (codigo === 'email_exists' || codigo === 'user_already_exists') {
          return resposta({ erro: 'Esse e-mail já está vinculado a outra conta.' }, 409, cookieAtualizado);
        }
        if (atualizacao.status === 429 || codigo === 'over_email_send_rate_limit') {
          return resposta({ erro: 'Muitos pedidos de troca de e-mail. Aguarde alguns minutos e tente novamente.' }, 429, cookieAtualizado);
        }
        return resposta({ erro: atualizacao.status >= 500 ? 'Serviço de autenticação indisponível. Tente novamente.' : 'Não foi possível solicitar a troca de e-mail.' }, atualizacao.status >= 500 ? 503 : 400, cookieAtualizado);
      }
      // A confirmação é controlada pelo Supabase; não registramos senha nem o novo endereço nos logs.
      return resposta({ solicitada: true, mensagem: 'Solicitação aceita. Confira sua caixa de entrada e siga as instruções do Supabase para concluir a troca.' }, 200, cookieAtualizado);
    }

    if (caminho === 'auth/change-password' && requisicao.method === 'POST') {
      const dados = await jsonEntrada(requisicao, 8192);
      const senhaAtual = typeof dados.senha_atual === 'string' ? dados.senha_atual : '';
      const senhaNova = dados.senha_nova;
      if (!senhaAtual || senhaAtual.length > 128) return resposta({ erro: 'Informe sua senha atual.' }, 400, cookieAtualizado);
      if (!senhaNovaValida(senhaNova)) return resposta({ erro: mensagemSenhaNova }, 400, cookieAtualizado);
      if (senhaAtual === senhaNova) return resposta({ erro: 'Escolha uma senha diferente da atual.' }, 400, cookieAtualizado);

      // Confirma a senha atual via Auth; o navegador nunca recebe nem pode recuperar a senha armazenada.
      const identidade = await supabase(cfg, '/auth/v1/user', { token });
      if (!identidade.ok || !identidade.dados?.email) return resposta({ erro: 'Entre novamente para continuar.' }, 401, cookieAtualizado);
      const ip = requisicao.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconhecido';
      const chave = chaveLimite(ip, 'login', estado.sessao.sub);
      const limite = await controlarLimite(cfg, 'login', chave);
      if (!limite.permitido) return resposta({ erro: 'Muitas tentativas. Aguarde antes de confirmar sua senha atual.' }, 429, { ...cookieAtualizado, 'Retry-After': String(limite.retry_after ?? cfg.bloqueio) });
      const validacao = await supabase(cfg, '/auth/v1/token?grant_type=password', {
        metodo: 'POST', corpo: { email: identidade.dados.email, password: senhaAtual },
      });
      if (!validacao.ok || !validacao.dados?.access_token) {
        return resposta({ erro: 'A senha atual não confere.' }, 401, cookieAtualizado);
      }
      await controlarLimite(cfg, 'login', chave, 'reset').catch(() => null);
      const atualizada = await supabase(cfg, '/auth/v1/user', {
        metodo: 'PUT', token: validacao.dados.access_token, corpo: { password: senhaNova },
      });
      if (!atualizada.ok) return resposta({ erro: atualizada.status === 429 ? 'Muitas tentativas. Aguarde e tente novamente.' : mensagemSenhaNova }, atualizada.status === 429 ? 429 : 400, cookieAtualizado);
      await supabase(cfg, '/auth/v1/logout?scope=global', { metodo: 'POST', token: validacao.dados.access_token }).catch(() => null);
      return resposta({ atualizada: true, mensagem: 'Senha atualizada. Entre novamente com sua nova senha.' }, 200, { 'Set-Cookie': cookieRemovido(cfg, requisicao) });
    }

    if (caminho === 'auth/request-email-verification' && requisicao.method === 'POST') {
      const ip = requisicao.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconhecido';
      const chave = chaveLimite(ip, 'confirmacao', estado.sessao.sub);
      const limite = await controlarLimite(cfg, 'confirmacao', chave);
      if (!limite.permitido) return resposta({ erro: 'Muitos pedidos de confirmação. Aguarde e tente novamente.' }, 429, { 'Retry-After': String(limite.retry_after ?? cfg.bloqueio) });
      const usuario = await supabase(cfg, '/auth/v1/user', { token });
      if (!usuario.ok || !usuario.dados?.email) return resposta({ erro: 'Entre novamente para continuar.' }, 401, cookieAtualizado);
      const estadoAtual = await verificacaoEmail(cfg, { acao: 'estado', access_token: token });
      if (estadoAtual.verificado) return resposta({ enviado: false, verificado: true, mensagem: 'Este endereço já foi confirmado.' }, 200, cookieAtualizado);
      const tokenEmail = randomBytes(32).toString('base64url');
      const emitido = await verificacaoEmail(cfg, {
        acao: 'emitir', access_token: token,
        token_hash: createHash('sha256').update(tokenEmail).digest('hex'),
      });
      if (!emitido.emitido) return resposta({ enviado: false, verificado: true, mensagem: 'Este endereço já foi confirmado.' }, 200, cookieAtualizado);
      try {
        const envio = await enviarConfirmacao(cfg, usuario.dados.email, tokenEmail, url.origin);
        // Registra apenas contadores de aceitação SMTP, sem e-mail, token ou credenciais.
        console.info('Confirmação opcional aceita pelo SMTP:', envio);
      } catch (erro) {
        // Registra apenas códigos técnicos seguros, sem senha, credencial SMTP, endereço do usuário ou conteúdo.
        console.error('Falha no envio SMTP da confirmação opcional:', {
          status: erro?.status ?? null,
          code: erro?.code ?? null,
          responseCode: erro?.responseCode ?? null,
          command: erro?.command ?? null,
        });
        return resposta({ erro: 'Não foi possível enviar a confirmação agora. Tente novamente mais tarde.' }, 503, cookieAtualizado);
      }
      return resposta({
        enviado: true,
        mensagem: 'E-mail enviado. Ele costuma chegar em alguns minutos. Confira a caixa de entrada e também Spam/Lixo eletrônico, Promoções ou Atualizações. O link vale por 24 horas.',
      }, 200, cookieAtualizado);
    }

    if (caminho === 'restaurantes' && requisicao.method === 'GET') {
      const remoto = await restaurantesComPapel(cfg, token);
      return remoto.ok ? resposta(remoto.dados, 200, cookieAtualizado) : erroBanco(remoto);
    }

    if (caminho === 'restaurantes' && requisicao.method === 'POST') {
      const dados = await jsonEntrada(requisicao, 2048);
      // O banco identifica a pessoa pelo JWT da sessão e cria somente um restaurante novo.
      const remoto = await supabase(cfg, '/rest/v1/rpc/criar_restaurante_inicial', {
        metodo: 'POST', token, corpo: { p_nome: typeof dados?.nome === 'string' ? dados.nome : null },
      });
      return remoto.ok ? resposta({ ...remoto.dados, papel: 'dono' }, 200, cookieAtualizado) : erroBanco(remoto);
    }

    if (caminho === 'estoque' && requisicao.method === 'GET') {
      const restaurante = url.searchParams.get('restaurante') ?? '';
      if (!/^[0-9a-f-]{36}$/i.test(restaurante)) return resposta({ erro: 'Restaurante inválido.' }, 400);
      const campos = 'lote_id,parte_id,insumo,codigo_fabricante,validade_aplicavel,medida,saldo,situacao,revisao_validade,data_abertura,validade_abertura,validade_embalagem,local_armazenamento';
      const consulta = new URLSearchParams({ select: campos, restaurante_id: `eq.${restaurante}`, order: 'validade_aplicavel.asc,insumo.asc,parte_id.asc' });
      const remoto = await supabase(cfg, `/rest/v1/estoque?${consulta}`, { token });
      return remoto.ok ? resposta(remoto.dados, 200, cookieAtualizado) : erroBanco(remoto);
    }

    if (caminho === 'descartes' && requisicao.method === 'GET') {
      const restaurante = url.searchParams.get('restaurante') ?? '';
      const mes = url.searchParams.get('mes') ?? '';
      if (!/^[0-9a-f-]{36}$/i.test(restaurante)) return resposta({ erro: 'Restaurante inválido.' }, 400);
      if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(mes)) return resposta({ erro: 'Mês do relatório inválido.' }, 400);
      const membro = await supabase(cfg, `/rest/v1/membros_restaurante?select=papel&restaurante_id=eq.${restaurante}&limit=1`, { token });
      if (!membro.ok) return erroBanco(membro);
      if (!['dono', 'gerente'].includes(membro.dados?.[0]?.papel)) return resposta(null, 200, cookieAtualizado);
      // As contas do produto usam America/Sao_Paulo (UTC-3); os limites são meia-noite local, com fim exclusivo.
      const [ano, numeroMes] = mes.split('-').map(Number);
      const inicio = new Date(Date.UTC(ano, numeroMes - 1, 1, 3)).toISOString();
      const fim = new Date(Date.UTC(ano, numeroMes, 1, 3)).toISOString();
      const consulta = new URLSearchParams({ select: 'insumo,codigo_fabricante,medida,quantidade,motivo,validade_aplicavel,registrado_em', restaurante_id: `eq.${restaurante}`, tipo: 'eq.descarte', order: 'registrado_em.desc,id.desc' });
      consulta.append('registrado_em', `gte.${inicio}`);
      consulta.append('registrado_em', `lt.${fim}`);
      const todos = [];
      for (let deslocamento = 0; ; deslocamento += 1000) {
        consulta.set('limit', '1000');
        consulta.set('offset', String(deslocamento));
        const remoto = await supabase(cfg, `/rest/v1/saidas_estoque?${consulta}`, { token });
        if (!remoto.ok) return erroBanco(remoto);
        todos.push(...remoto.dados);
        if (remoto.dados.length < 1000) break;
      }
      return resposta(todos, 200, cookieAtualizado);
    }

    if (caminho === 'equipe' && requisicao.method === 'GET') {
      const restaurante = url.searchParams.get('restaurante') ?? '';
      if (!/^[0-9a-f-]{36}$/i.test(restaurante)) return resposta({ erro: 'Restaurante inválido.' }, 400, cookieAtualizado);
      const remoto = await supabase(cfg, '/rest/v1/rpc/listar_equipe_restaurante', {
        metodo: 'POST', corpo: { p_restaurante_id: restaurante }, token,
      });
      return remoto.ok ? resposta(remoto.dados, 200, cookieAtualizado) : erroBanco(remoto);
    }

    if (caminho === 'equipe/vincular' && requisicao.method === 'POST') {
      const dados = await jsonEntrada(requisicao, 4096);
      const restaurante = typeof dados.p_restaurante_id === 'string' ? dados.p_restaurante_id : '';
      const identificador = typeof dados.p_identificador === 'string' ? dados.p_identificador.trim() : '';
      const papel = typeof dados.p_papel === 'string' ? dados.p_papel.trim().toLowerCase() : 'funcionario';
      if (!/^[0-9a-f-]{36}$/i.test(restaurante) || identificador.length < 3 || identificador.length > 254 || !['funcionario', 'gerente', 'dono'].includes(papel)) {
        return resposta({ erro: 'Confira o usuário ou e-mail e o perfil escolhido.' }, 400, cookieAtualizado);
      }
      const remoto = await supabase(cfg, '/rest/v1/rpc/vincular_membro_restaurante', {
        metodo: 'POST',
        corpo: { p_restaurante_id: restaurante, p_identificador: identificador, p_papel: papel },
        token,
      });
      return remoto.ok ? resposta(remoto.dados, 200, cookieAtualizado) : erroBanco(remoto);
    }

    if (caminho === 'equipe/remover' && requisicao.method === 'POST') {
      const dados = await jsonEntrada(requisicao, 4096);
      const restaurante = typeof dados.p_restaurante_id === 'string' ? dados.p_restaurante_id : '';
      const usuarioId = typeof dados.p_usuario_id === 'string' ? dados.p_usuario_id : '';
      if (!/^[0-9a-f-]{36}$/i.test(restaurante) || !/^[0-9a-f-]{36}$/i.test(usuarioId)) {
        return resposta({ erro: 'Confira os dados da pessoa selecionada.' }, 400, cookieAtualizado);
      }
      const remoto = await supabase(cfg, '/rest/v1/rpc/remover_membro_restaurante', {
        metodo: 'POST',
        corpo: { p_restaurante_id: restaurante, p_usuario_id: usuarioId },
        token,
      });
      return remoto.ok ? resposta({ removido: Boolean(remoto.dados) }, 200, cookieAtualizado) : erroBanco(remoto);
    }

    if (caminho === 'fornecedores' && requisicao.method === 'GET') {
      const restaurante = url.searchParams.get('restaurante') ?? '';
      if (!/^[0-9a-f-]{36}$/i.test(restaurante)) return resposta({ erro: 'Restaurante inválido.' }, 400, cookieAtualizado);
      const remoto = await supabase(cfg, '/rest/v1/rpc/listar_fornecedores_restaurante', {
        metodo: 'POST', corpo: { p_restaurante_id: restaurante }, token,
      });
      return remoto.ok ? resposta(remoto.dados, 200, cookieAtualizado) : erroBanco(remoto);
    }

    if (caminho === 'fornecedores/salvar' && requisicao.method === 'POST') {
      const dados = await jsonEntrada(requisicao, 8192);
      const restaurante = typeof dados.p_restaurante_id === 'string' ? dados.p_restaurante_id : '';
      const fornecedorId = typeof dados.p_fornecedor_id === 'string' && dados.p_fornecedor_id ? dados.p_fornecedor_id : null;
      const nome = typeof dados.p_nome === 'string' ? dados.p_nome.trim() : '';
      if (!/^[0-9a-f-]{36}$/i.test(restaurante) || (fornecedorId && !/^[0-9a-f-]{36}$/i.test(fornecedorId)) || nome.length < 1 || nome.length > 120) {
        return resposta({ erro: 'Confira o nome e os dados do fornecedor.' }, 400, cookieAtualizado);
      }
      const remoto = await supabase(cfg, '/rest/v1/rpc/salvar_fornecedor_restaurante', {
        metodo: 'POST',
        corpo: {
          p_restaurante_id: restaurante,
          p_fornecedor_id: fornecedorId,
          p_nome: nome,
          p_categoria: typeof dados.p_categoria === 'string' ? dados.p_categoria.trim().slice(0, 80) : null,
          p_contato: typeof dados.p_contato === 'string' ? dados.p_contato.trim().slice(0, 120) : null,
          p_email: typeof dados.p_email === 'string' ? dados.p_email.trim().slice(0, 254) : null,
          p_observacoes: typeof dados.p_observacoes === 'string' ? dados.p_observacoes.trim().slice(0, 400) : null,
        },
        token,
      });
      return remoto.ok ? resposta(remoto.dados, 200, cookieAtualizado) : erroBanco(remoto);
    }

    if (caminho === 'fornecedores/status' && requisicao.method === 'POST') {
      const dados = await jsonEntrada(requisicao, 4096);
      const restaurante = typeof dados.p_restaurante_id === 'string' ? dados.p_restaurante_id : '';
      const fornecedorId = typeof dados.p_fornecedor_id === 'string' ? dados.p_fornecedor_id : '';
      const ativo = typeof dados.p_ativo === 'boolean' ? dados.p_ativo : null;
      if (!/^[0-9a-f-]{36}$/i.test(restaurante) || !/^[0-9a-f-]{36}$/i.test(fornecedorId) || ativo === null) {
        return resposta({ erro: 'Confira os dados do fornecedor selecionado.' }, 400, cookieAtualizado);
      }
      const remoto = await supabase(cfg, '/rest/v1/rpc/alterar_status_fornecedor', {
        metodo: 'POST',
        corpo: { p_restaurante_id: restaurante, p_fornecedor_id: fornecedorId, p_ativo: ativo },
        token,
      });
      return remoto.ok ? resposta({ ativo: Boolean(remoto.dados) }, 200, cookieAtualizado) : erroBanco(remoto);
    }

    const rotasRpc = {
      'estoque/cadastrar': 'cadastrar_lote',
      'estoque/corrigir-validade': 'corrigir_validade',
      'estoque/registrar-abertura': 'registrar_abertura',
      'estoque/registrar-saida': 'registrar_saida',
    };
    const nomeRpc = rotasRpc[caminho];
    if (nomeRpc && requisicao.method === 'POST') {
      const corpo = await jsonEntrada(requisicao);
      const remoto = await supabase(cfg, `/rest/v1/rpc/${nomeRpc}`, { metodo: 'POST', corpo, token, cabecalhos: { Prefer: 'return=representation' } });
      return remoto.ok ? resposta(remoto.dados, remoto.status, cookieAtualizado) : erroBanco(remoto);
    }

    return resposta({ erro: 'Rota não encontrada.' }, 404, cookieAtualizado);
  } catch (erro) {
    if (erro.status === 413) return resposta({ erro: 'Dados enviados excedem o limite permitido.' }, 413);
    if (erro instanceof SyntaxError) return resposta({ erro: 'Envie dados em formato JSON válido.' }, 400);
    // Registra apenas rota, etapa e status técnico interno para diagnóstico, sem expor dados do usuário ou segredos.
    console.error('Erro interno na API:', { caminho, status: erro?.status ?? 503, etapa: erro?.message ?? null });
    return resposta({ erro: 'O servidor não conseguiu concluir a solicitação.' }, 503);
  }
}
