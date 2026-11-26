// Este adaptador usa as rotas fictícias do servidor local com a mesma interface usada pela tela integrada.
async function solicitar(caminho, corpo) {
  const opcoes = corpo === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
  };
  const resposta = await fetch(`/demo/${caminho}`, opcoes);
  const dados = await resposta.json();
  if (!resposta.ok) throw Object.assign(new Error(dados.erro), { status: resposta.status, code: dados.codigo });
  return dados;
}

export const api = {
  modoLocal: true,
  entrar: (identificador, senha) => solicitar('entrar', { identificador, senha }),
  // O fluxo inicial fica testável com contas e restaurantes fictícios no servidor local.
  criarConta: (dados) => solicitar('cadastrar', dados),
  criarRestaurante: (nome) => solicitar('restaurantes', { nome }),
  async sessao() {
    try { return await solicitar('sessao'); }
    catch (erro) { if (erro.status === 401) return null; throw erro; }
  },
  sair: (escopo = 'local') => solicitar('sair', { escopo }),
  // O servidor local mantém o nome, a troca de senha e os estados da conta pela mesma interface da versão online.
  definirNomeUsuario: (nomeUsuario) => solicitar('perfil/nome-usuario', { nomeUsuario }),
  alterarSenha: ({ senha_atual, senha_nova }) => solicitar('redefinir-senha', { senhaAtual: senha_atual, novaSenha: senha_nova }),
  solicitarConfirmacaoEmail: () => solicitar('confirmacao-email', {}),
  restaurantes: async () => {
    try {
      return await solicitar('restaurantes');
    } catch (erro) {
      // A tela usa null para sessão ausente e uma lista vazia para sessão sem restaurante autorizado.
      if (erro.status === 401) return null;
      throw erro;
    }
  },
  estoque: (restaurante) => solicitar(`lotes?restaurante=${encodeURIComponent(restaurante)}`),
  cadastrar: (lote) => solicitar('lotes', lote),
  corrigirValidade: (correcao) => solicitar('lotes/validade', correcao),
  registrarAbertura: (abertura) => solicitar('lotes/abertura', abertura),
  registrarSaida: (saida) => solicitar('lotes/saida', saida),
  // O banco local aplica o mesmo filtro mensal da API hospedada.
  descartes: (restaurante, mes) => solicitar('descartes?restaurante=' + encodeURIComponent(restaurante) + '&mes=' + encodeURIComponent(mes)),
  equipe: (restaurante) => solicitar('equipe?restaurante=' + encodeURIComponent(restaurante)),
  vincularMembro: (dados) => solicitar('equipe/vincular', dados),
  removerMembro: (dados) => solicitar('equipe/remover', dados),
  fornecedores: (restaurante) => solicitar('fornecedores?restaurante=' + encodeURIComponent(restaurante)),
  salvarFornecedor: (dados) => solicitar('fornecedores/salvar', dados),
  alterarStatusFornecedor: (dados) => solicitar('fornecedores/status', dados),
};
