// O navegador conversa apenas com a API Sync; tokens e chaves privadas permanecem no servidor.
async function solicitar(caminho, { metodo = 'GET', corpo } = {}) {
  const resposta = await fetch(`/api/${caminho}`, {
    method: metodo,
    credentials: 'same-origin',
    headers: corpo === undefined ? {} : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  let dados;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = null; }
  if (!resposta.ok) throw Object.assign(new Error(dados?.erro ?? 'Não foi possível concluir a solicitação.'), { status: resposta.status, code: dados?.codigo });
  return dados;
}

// A sessão é um cookie HttpOnly; ausência de sessão é representada por null para a landing.
async function restaurantes() {
  try { return await solicitar('restaurantes'); }
  catch (erro) { if (erro.status === 401) return null; throw erro; }
}

// Consulta o perfil autenticado e o estado facultativo de confirmação dentro da área da conta.
async function sessao() {
  try { return await solicitar('auth/session'); }
  catch (erro) { if (erro.status === 401) return null; throw erro; }
}

// Encaminha alterações do estoque ao backend, que repassa o JWT individual e mantém a RLS ativa.
export const api = {
  modoLocal: false,
  entrar: (identificador, senha) => solicitar('auth/login', { metodo: 'POST', corpo: { identificador, senha } }),
  criarConta: ({ nomeUsuario, email, senha }) => solicitar('auth/signup', { metodo: 'POST', corpo: { nomeUsuario, email, senha } }),
  recuperarSenha: (email) => solicitar('auth/recover', { metodo: 'POST', corpo: { email } }),
  sessao,
  solicitarConfirmacaoEmail: () => solicitar('auth/request-email-verification', { metodo: 'POST', corpo: {} }),
  confirmarEmail: (token) => solicitar('auth/verify-email', { metodo: 'POST', corpo: { token } }),
  atualizarSenha: (senha) => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    return solicitar('auth/update-password', { metodo: 'POST', corpo: { senha, access_token: hash.get('access_token') } });
  },
  sair: (escopo = 'local') => solicitar('auth/logout', { metodo: 'POST', corpo: { escopo } }),
  restaurantes,
  // O servidor vincula a conta atual como dona durante a criação do primeiro restaurante.
  criarRestaurante: (nome) => solicitar('restaurantes', { metodo: 'POST', corpo: { nome } }),
  estoque: (restaurante) => solicitar(`estoque?restaurante=${encodeURIComponent(restaurante)}`),
  cadastrar: (lote) => solicitar('estoque/cadastrar', { metodo: 'POST', corpo: lote }),
  corrigirValidade: (correcao) => solicitar('estoque/corrigir-validade', { metodo: 'POST', corpo: correcao }),
  registrarAbertura: (abertura) => solicitar('estoque/registrar-abertura', { metodo: 'POST', corpo: abertura }),
  registrarSaida: (saida) => solicitar('estoque/registrar-saida', { metodo: 'POST', corpo: saida }),
  descartes: (restaurante) => solicitar(`descartes?restaurante=${encodeURIComponent(restaurante)}`),
  equipe: (restaurante) => solicitar(`equipe?restaurante=${encodeURIComponent(restaurante)}`),
  vincularMembro: (dados) => solicitar('equipe/vincular', { metodo: 'POST', corpo: dados }),
  removerMembro: (dados) => solicitar('equipe/remover', { metodo: 'POST', corpo: dados }),
  fornecedores: (restaurante) => solicitar(`fornecedores?restaurante=${encodeURIComponent(restaurante)}`),
  salvarFornecedor: (dados) => solicitar('fornecedores/salvar', { metodo: 'POST', corpo: dados }),
  alterarStatusFornecedor: (dados) => solicitar('fornecedores/status', { metodo: 'POST', corpo: dados }),
};
