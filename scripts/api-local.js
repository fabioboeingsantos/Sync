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
  sair: () => solicitar('sair', {}),
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
};
