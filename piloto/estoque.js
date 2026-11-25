import { api } from './api.js';
import { interpretarLote } from './interpretar-lote.js';

// Controla os estados de acesso, consulta e movimentação da tela de estoque.
const porId = (id) => document.getElementById(id);
const formEntrada = porId('form-entrada');
const campoSenhaEntrada = porId('campo-senha-entrada');
const alternarSenhaEntrada = porId('alternar-senha-entrada');
const formLote = porId('form-lote');
const dialogoValidade = porId('dialogo-validade');
const formValidade = porId('form-validade');
const botaoSalvarValidade = formValidade.querySelector('[type="submit"]');
const cancelarValidade = porId('cancelar-validade');
const erroValidade = porId('erro-validade');
const dialogoAbertura = porId('dialogo-abertura');
const formAbertura = porId('form-abertura');
const salvarAbertura = formAbertura.querySelector('[type="submit"]');
const cancelarAbertura = porId('cancelar-abertura');
const erroAbertura = porId('erro-abertura');
const sair = porId('sair');
const linkEquipe = porId('link-equipe');
const minhaConta = porId('minha-conta');
const contaTopo = porId('conta-topo');
const abrirContaSemRestaurante = porId('abrir-conta-sem-restaurante');
const dialogoConta = porId('dialogo-conta');
const contaEmail = porId('conta-email');
const contaAcesso = porId('conta-acesso');
const contaConfirmacao = porId('conta-confirmacao');
const feedbackConta = porId('feedback-conta');
const botaoConfirmarEmail = porId('solicitar-confirmacao-email');
const sairTodosDispositivos = porId('sair-todos-dispositivos');
const fecharConta = porId('fechar-conta');
const abrirCadastro = porId('abrir-cadastro');
const abrirVision = porId('abrir-vision');
const modoVision = porId('modo-vision');
const modoManual = porId('modo-manual');
const blocoVision = porId('assistente-lote');
const exemploVision = porId('exemplo-vision');
const perfilBadge = porId('perfil-badge');
const navModulos = porId('nav-modulos');
const abaEstoque = porId('aba-estoque');
const abaEquipe = porId('aba-equipe');
const abaFornecedores = porId('aba-fornecedores');
const moduloEstoque = porId('modulo-estoque');
const moduloEquipe = porId('modulo-equipe');
const moduloFornecedores = porId('modulo-fornecedores');
const formEquipePainel = porId('form-equipe-painel');
const erroEquipePainel = porId('erro-equipe-painel');
const feedbackEquipe = porId('feedback-equipe');
const mensagemEquipeLista = porId('mensagem-equipe-lista');
const tabelaEquipePainel = porId('tabela-equipe-painel');
const corpoEquipePainel = porId('corpo-equipe-painel');
const dialogoRemoverMembro = porId('dialogo-remover-membro');
const textoRemoverMembro = porId('texto-remover-membro');
const erroRemoverMembro = porId('erro-remover-membro');
const confirmarRemoverMembro = porId('confirmar-remover-membro');
const cancelarRemoverMembro = porId('cancelar-remover-membro');
const abrirFornecedor = porId('abrir-fornecedor');
const painelFornecedor = porId('painel-fornecedor');
const tituloFormFornecedor = porId('titulo-form-fornecedor');
const formFornecedor = porId('form-fornecedor');
const cancelarFornecedor = porId('cancelar-fornecedor');
const erroFornecedor = porId('erro-fornecedor');
const feedbackFornecedores = porId('feedback-fornecedores');
const subtituloFornecedores = porId('subtitulo-fornecedores');
const mensagemFornecedores = porId('mensagem-fornecedores');
const tabelaFornecedores = porId('tabela-fornecedores');
const corpoFornecedores = porId('corpo-fornecedores');
const colAcoesFornecedores = porId('col-acoes-fornecedores');
const recarregar = porId('recarregar');
const mensagemSessao = porId('situacao-sessao');
const feedback = porId('feedback');
const erroCadastro = porId('erro-cadastro');
const mensagemLista = porId('mensagem-lista');
const campos = formLote.elements;
const dialogoSaida = porId('dialogo-saida');
const formSaida = porId('form-saida');
const cancelarSaida = porId('cancelar-saida');
const erroSaida = porId('erro-saida');
const painelDescartes = porId('painel-descartes');
const historicoDescartes = porId('historico-descartes');
const descricaoLote = porId('descricao-lote');
const statusAssistente = porId('status-assistente');
const barraFiltrosEstoque = porId('barra-filtros-estoque');
const filtrosEstoque = porId('filtros-estoque');
const contagemEstoque = porId('contagem-estoque');
let filtroSituacao = 'todos';
let moduloAtivo = 'estoque';
let ehDonoAtual = false;
let membroEmRemocao = null;
let lotesCarregados = [];
let duplicadoConfirmado = null;
let parteEmSaida = null;
let envioSaida = null;
let restaurante = null;
let sessaoAtual = null;
let envioPendente = null;
let versaoConsulta = 0;
let loteEmCorrecao = null;
let parteEmAbertura = null;
let envioAbertura = null;

const rotulos = { em_dia: 'Em dia', breve: 'Vence em até 3 dias', hoje: 'Vence hoje', vencido: 'Vencido' };

function ocupado(botao, estado) {
  // Desabilitar o controle também impede o envio pelo teclado durante a operação.
  botao.disabled = estado;
  if (estado) botao.setAttribute('aria-busy', 'true');
  else botao.removeAttribute('aria-busy');
}

function mensagem(erro, reserva) {
  if (api.modoLocal && erro.status) return erro.message;
  const conhecidas = {
    '42501': 'Sua conta não tem acesso a esse estoque.',
    '23505': 'Este cadastro já foi enviado com outros dados.',
    '23514': 'Confira a quantidade, a medida e a validade do lote.',
    PT404: 'Este lote não foi encontrado. Atualize a lista e tente novamente.',
    invalid_credentials: 'Confira o usuário ou e-mail e a senha e tente novamente.',
  };
  return conhecidas[erro.code] ?? reserva;
}

// Atualiza o resumo da sessão no cabeçalho e no diálogo Minha conta.
function atualizarPainelConta(sessao, restaurantes) {
  const email = sessao?.user?.email ?? '';
  contaTopo.textContent = email;
  contaTopo.hidden = !email;
  contaEmail.textContent = email || (api.modoLocal ? 'Conta de demonstração local' : 'Não disponível');
  contaAcesso.textContent = restaurantes?.length
    ? restaurantes.map((item) => item.nome).join(', ')
    : 'Sem vínculo ativo (aguardando liberação do dono)';
  if (api.modoLocal) {
    contaConfirmacao.textContent = 'Disponível apenas na versão online';
    botaoConfirmarEmail.hidden = true;
  } else if (sessao?.email_verificado_app) {
    contaConfirmacao.textContent = 'Confirmado';
    botaoConfirmarEmail.hidden = true;
  } else {
    contaConfirmacao.textContent = 'Opcional · pendente';
    botaoConfirmarEmail.hidden = !sessao?.user;
  }
}

async function mostrarSessao(focar = false) {
  const sessao = api.sessao ? await api.sessao() : null;
  const restaurantes = sessao?.restaurantes ?? await api.restaurantes();
  sessaoAtual = sessao;
  restaurante = restaurantes?.[0] ?? null;
  const autenticado = Boolean(sessao?.user) || restaurantes !== null;
  porId('entrada').hidden = autenticado;
  porId('sem-restaurante').hidden = !autenticado || Boolean(restaurante);
  porId('aplicacao').hidden = !restaurante;
  sair.hidden = !autenticado;
  // A conta continua acessível para qualquer sessão, mesmo sem vínculo que libere o estoque.
  minhaConta.hidden = !autenticado;
  atualizarPainelConta(sessao, restaurantes);
  mensagemSessao.textContent = '';

  if (!restaurante) {
    versaoConsulta += 1;
    ehDonoAtual = false;
    porId('lotes').replaceChildren();
    if (linkEquipe) linkEquipe.hidden = true;
    if (abaEquipe) abaEquipe.hidden = true;
    if (perfilBadge) perfilBadge.hidden = true;
    if (abrirFornecedor) abrirFornecedor.hidden = true;
    painelDescartes.hidden = true;
    historicoDescartes.replaceChildren();
    porId('tabela-estoque').hidden = true;
    if (barraFiltrosEstoque) barraFiltrosEstoque.hidden = true;
    ocupado(recarregar, false);
    if (focar) porId(!autenticado ? 'titulo-entrada' : 'titulo-sem-restaurante').focus();
    return;
  }

  porId('restaurante').textContent = restaurante.nome;
  alternarModulo('estoque', false);
  if (focar) porId('titulo-estoque').focus();
  await atualizarEstoque();
}

function formatarData(data) {
  // Validade é uma data de calendário. A exibição mantém o dia recebido do banco.
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarSaldo(saldo, medida) {
  // Formata o saldo recebido como texto e preserva os dígitos decimais.
  const [inteiro, fracao = ''] = String(saldo).split('.');
  const decimal = fracao.replace(/0+$/, '');
  return `${inteiro}${decimal ? `,${decimal}` : ''} ${medida}`;
}

function normalizarQuantidade(valor, medida) {
  // O campo aceita vírgula decimal. Unidades são inteiras e todas as quantidades são positivas.
  const quantidade = valor.trim().replace(',', '.');
  const formato = medida === 'un' ? /^\d+$/ : /^\d+(\.\d+)?$/;
  return formato.test(quantidade) && /[1-9]/.test(quantidade) ? quantidade : null;
}

function adicionarCelula(linha, conteudo, rotulo) {
  const celula = linha.insertCell();
  celula.setAttribute('role', 'cell');
  if (rotulo) {
    // No celular, cada célula tem um rótulo visual. A tabela já fornece o nome da coluna aos leitores de tela.
    const legenda = document.createElement('span');
    legenda.className = 'rotulo-celula';
    legenda.setAttribute('aria-hidden', 'true');
    legenda.textContent = rotulo;
    celula.append(legenda);
  }
  celula.append(conteudo);
  return celula;
}

function mostrarLote(lote) {
  const linha = document.createElement('tr');
  linha.setAttribute('role', 'row');
  linha.dataset.situacao = lote.situacao;
  const insumo = adicionarCelula(linha, lote.insumo);
  if (lote.codigo_fabricante) {
    const codigo = document.createElement('small');
    codigo.textContent = `Lote ${lote.codigo_fabricante}`;
    insumo.append(codigo);
  }
  const condicao = document.createElement('small');
  condicao.textContent = lote.data_abertura ? `Aberto em ${formatarData(lote.data_abertura)}` : 'Fechado';
  insumo.append(condicao);
  if (lote.local_armazenamento) {
    const local = document.createElement('small');
    local.textContent = 'Local: ' + lote.local_armazenamento;
    insumo.append(local);
  }
  adicionarCelula(linha, formatarSaldo(lote.saldo, lote.medida), 'Saldo');
  const validade = document.createElement('time');
  validade.dateTime = lote.validade_aplicavel;
  validade.textContent = formatarData(lote.validade_aplicavel);
  adicionarCelula(linha, validade, 'Validade');
  if (lote.data_abertura) {
    const validadesRegistradas = document.createElement('small');
    validadesRegistradas.textContent = `Embalagem: ${formatarData(lote.validade_embalagem)} · Após abertura: ${formatarData(lote.validade_abertura)}`;
    validade.parentElement.append(validadesRegistradas);
  }
  const situacao = document.createElement('span');
  situacao.className = 'estado';
  situacao.dataset.situacao = lote.situacao;
  situacao.textContent = rotulos[lote.situacao];
  adicionarCelula(linha, situacao, 'Situação');
  const acoes = document.createElement('div');
  acoes.className = 'acoes';
  acoes.append(acaoDaParte(lote, 'Corrigir validade', 'corrigir', abrirCorrecao));
  if (!lote.data_abertura && lote.situacao !== 'vencido') {
    acoes.append(acaoDaParte(lote, 'Registrar abertura', 'abrir', iniciarAbertura));
  }
  if (lote.situacao !== 'vencido') {
    acoes.append(acaoDaParte(lote, 'Registrar uso', 'uso', (parte) => iniciarSaida(parte, 'uso')));
  }
  acoes.append(acaoDaParte(lote, 'Registrar descarte', 'descarte', (parte) => iniciarSaida(parte, 'descarte')));
  adicionarCelula(linha, acoes);
  return linha;
}

function acaoDaParte(lote, rotulo, acao, executar) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'botao botao-secundario';
  botao.textContent = rotulo;
  botao.setAttribute('aria-label', `${rotulo} de ${lote.insumo}${lote.codigo_fabricante ? `, lote ${lote.codigo_fabricante}` : ''}`);
  botao.dataset.parte = lote.parte_id;
  botao.dataset.acao = acao;
  botao.addEventListener('click', () => executar(lote));
  return botao;
}

function focarAcao(parte, acao) {
  // A lista é recriada quando o saldo ou a ordem muda, então o foco procura a nova linha.
  const botao = porId('lotes').querySelector(`[data-parte="${CSS.escape(parte)}"][data-acao="${acao}"]`);
  (botao ?? porId('titulo-lista')).focus();
}

function aplicarFiltroEstoque() {
  const linhas = [...porId('lotes').querySelectorAll('tr[data-situacao]')];
  let visiveis = 0;
  for (const linha of linhas) {
    const mostrar = filtroSituacao === 'todos' || linha.dataset.situacao === filtroSituacao;
    linha.hidden = !mostrar;
    if (mostrar) visiveis += 1;
  }
  if (filtrosEstoque) {
    for (const botao of filtrosEstoque.querySelectorAll('[data-filtro-estoque]')) {
      botao.setAttribute('aria-pressed', String(botao.dataset.filtroEstoque === filtroSituacao));
    }
  }
  if (contagemEstoque) {
    contagemEstoque.textContent = visiveis === 1 ? '1 lote exibido.' : `${visiveis} lotes exibidos.`;
  }
  if (linhas.length > 0) {
    porId('tabela-estoque').hidden = visiveis === 0;
    mensagemLista.textContent = visiveis === 0 ? 'Nenhum lote nesta categoria.' : '';
  }
}

filtrosEstoque?.addEventListener('click', (evento) => {
  const selecionado = evento.target.closest('button[data-filtro-estoque]');
  if (!selecionado) return;
  filtroSituacao = selecionado.dataset.filtroEstoque;
  aplicarFiltroEstoque();
});

async function atualizarEstoque() {
  if (!restaurante) return;
  // Ignora respostas antigas se a pessoa sair ou outra consulta começar antes do retorno.
  const consulta = ++versaoConsulta;
  ocupado(recarregar, true);
  recarregar.hidden = true;
  mensagemLista.textContent = 'Carregando lotes…';
  mensagemLista.classList.remove('erro');
  try {
    const lotes = await api.estoque(restaurante.id);
    if (consulta !== versaoConsulta) return;
    lotesCarregados = lotes;
    porId('lotes').replaceChildren(...lotes.map(mostrarLote));
    porId('tabela-estoque').hidden = lotes.length === 0;
    if (barraFiltrosEstoque) barraFiltrosEstoque.hidden = lotes.length === 0;
    mensagemLista.textContent = lotes.length === 0 ? 'Nenhum lote cadastrado.' : '';
    if (lotes.length > 0) aplicarFiltroEstoque();
    void atualizarDescartes(restaurante.id, consulta);
    return lotes;
  } catch (erro) {
    if (consulta !== versaoConsulta) return;
    porId('lotes').replaceChildren();
    porId('tabela-estoque').hidden = true;
    if (barraFiltrosEstoque) barraFiltrosEstoque.hidden = true;
    if (erro.status === 401) {
      await mostrarSessao(true);
      mensagemSessao.textContent = 'Entre novamente para acessar o estoque.';
    } else {
      mensagemLista.textContent = mensagem(erro, 'Não foi possível consultar o estoque.');
      mensagemLista.classList.add('erro');
      recarregar.hidden = false;
    }
  } finally {
    if (consulta === versaoConsulta) ocupado(recarregar, false);
  }
}

async function atualizarDescartes(id, consulta) {
  try {
    const descartes = await api.descartes(id);
    if (consulta !== versaoConsulta) return;
    // O acesso à lista de descartes, gestão de equipe e edição de fornecedores é exclusivo do dono ativo.
    ehDonoAtual = descartes !== null;
    if (linkEquipe) linkEquipe.hidden = !ehDonoAtual;
    if (abaEquipe) abaEquipe.hidden = !ehDonoAtual;
    if (abrirFornecedor) abrirFornecedor.hidden = !ehDonoAtual;
    if (colAcoesFornecedores) colAcoesFornecedores.hidden = !ehDonoAtual;
    if (perfilBadge) {
      perfilBadge.textContent = ehDonoAtual ? 'Perfil: Dono' : 'Perfil: Funcionário';
      perfilBadge.hidden = false;
    }
    if (subtituloFornecedores) {
      subtituloFornecedores.textContent = ehDonoAtual
        ? 'Cadastre, edite e organize os fornecedores do restaurante.'
        : 'Consulta dos fornecedores ativos cadastrados pelo dono do restaurante.';
    }
    painelDescartes.hidden = !ehDonoAtual;
    if (!ehDonoAtual && moduloAtivo === 'equipe') alternarModulo('estoque', false);
    historicoDescartes.replaceChildren(...(descartes ?? []).map((saida) => {
      const item = document.createElement('li');
      const codigo = saida.codigo_fabricante ? ' · Lote ' + saida.codigo_fabricante : '';
      const motivo = saida.motivo === 'vencimento' ? 'Vencimento' : 'Outro motivo';
      const data = new Date(saida.registrado_em).toLocaleString('pt-BR');
      item.textContent = saida.insumo + codigo + ' · ' + formatarSaldo(saida.quantidade, saida.medida) + ' · ' + motivo + ' · ' + data;
      return item;
    }));
    porId('mensagem-descartes').textContent = descartes?.length ? '' : 'Nenhum descarte registrado.';
  } catch {
    if (consulta !== versaoConsulta) return;
    historicoDescartes.replaceChildren();
    porId('mensagem-descartes').textContent = 'Não foi possível consultar o histórico.';
  }
}

function iniciarSaida(parte, tipo) {
  parteEmSaida = { parte, tipo };
  formSaida.reset();
  erroSaida.textContent = '';
  porId('titulo-saida').textContent = tipo === 'uso' ? 'Registrar uso' : 'Registrar descarte';
  porId('lote-em-saida').textContent = parte.insumo;
  porId('saldo-disponivel').textContent = 'Saldo: ' + formatarSaldo(parte.saldo, parte.medida);
  porId('campo-motivo').hidden = tipo === 'uso';
  formSaida.elements.motivo.value = parte.situacao === 'vencido' ? 'vencimento' : 'outro';
  dialogoSaida.showModal();
  formSaida.elements.quantidade.focus();
}

cancelarSaida.addEventListener('click', () => dialogoSaida.close());
dialogoSaida.addEventListener('cancel', (evento) => {
  if (cancelarSaida.disabled) evento.preventDefault();
});
dialogoSaida.addEventListener('close', () => {
  if (parteEmSaida) focarAcao(parteEmSaida.parte.parte_id, parteEmSaida.tipo);
  parteEmSaida = null;
});

formSaida.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const botao = formSaida.querySelector('[type="submit"]');
  if (!restaurante || !parteEmSaida || botao.disabled) return;
  const { parte, tipo } = parteEmSaida;
  const campo = formSaida.elements.quantidade;
  const quantidade = normalizarQuantidade(campo.value, parte.medida);
  if (!quantidade) {
    erroSaida.textContent = 'Informe uma quantidade válida na medida ' + parte.medida + '.';
    campo.focus();
    return;
  }
  const saida = {
    p_restaurante_id: restaurante.id, p_lote_id: parte.lote_id, p_parte_id: parte.parte_id,
    p_tipo: tipo, p_quantidade: quantidade, p_motivo: tipo === 'descarte' ? formSaida.elements.motivo.value : null,
  };
  // Repetir o mesmo envio após uma falha de rede conserva a chave da operação.
  const conteudo = JSON.stringify(saida);
  if (envioSaida?.conteudo !== conteudo) envioSaida = { conteudo, id: crypto.randomUUID() };
  erroSaida.textContent = '';
  for (const controle of formSaida.elements) controle.disabled = true;
  ocupado(botao, true);
  try {
    await api.registrarSaida({ ...saida, p_operacao_id: envioSaida.id });
    envioSaida = null;
    feedback.textContent = tipo === 'descarte' ? 'Descarte registrado.' : 'Uso registrado.';
    await atualizarEstoque();
    dialogoSaida.close();
  } catch (erro) {
    erroSaida.textContent = mensagem(erro, 'Não foi possível registrar. Confira o saldo e a validade antes de tentar novamente.');
  } finally {
    for (const controle of formSaida.elements) controle.disabled = false;
    ocupado(botao, false);
  }
});

function mostrarValidadeAtual() {
  porId('validade-atual').textContent = `Validade atual da embalagem: ${formatarData(loteEmCorrecao.validade_embalagem)}`;
}

function abrirCorrecao(lote) {
  loteEmCorrecao = lote;
  erroValidade.textContent = '';
  feedback.textContent = '';
  porId('lote-em-correcao').textContent = lote.codigo_fabricante
    ? `${lote.insumo} · Lote ${lote.codigo_fabricante}`
    : lote.insumo;
  mostrarValidadeAtual();
  formValidade.elements.validade.value = lote.validade_embalagem;
  ocupado(botaoSalvarValidade, false);
  dialogoValidade.showModal();
  formValidade.elements.validade.focus();
}

cancelarValidade.addEventListener('click', () => dialogoValidade.close());
dialogoValidade.addEventListener('cancel', (evento) => {
  if (cancelarValidade.disabled) evento.preventDefault();
});
dialogoValidade.addEventListener('close', () => {
  focarAcao(loteEmCorrecao.parte_id, 'corrigir');
  loteEmCorrecao = null;
});

formValidade.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!restaurante || !loteEmCorrecao || botaoSalvarValidade.disabled) return;
  const novaValidade = formValidade.elements.validade;
  const correcao = {
    p_restaurante_id: restaurante.id,
    p_lote_id: loteEmCorrecao.lote_id,
    p_validade: novaValidade.value,
    p_revisao: loteEmCorrecao.revisao_validade,
  };
  erroValidade.textContent = '';
  ocupado(botaoSalvarValidade, true);
  novaValidade.disabled = true;
  cancelarValidade.disabled = true;
  let podeSalvar = true;

  try {
    await api.corrigirValidade(correcao);
    feedback.textContent = 'Validade atualizada.';
    await atualizarEstoque();
    dialogoValidade.close();
  } catch (erro) {
    if (erro.code === 'PT409') {
      // Exibe a data que outra pessoa salvou e mantém a data digitada para uma nova conferência.
      const lotes = await atualizarEstoque();
      const atualizado = lotes?.find((lote) => lote.parte_id === loteEmCorrecao.parte_id);
      if (atualizado) {
        loteEmCorrecao = atualizado;
        mostrarValidadeAtual();
        erroValidade.textContent = 'Outra pessoa mudou a validade. Confira a data atual antes de salvar novamente.';
      } else {
        podeSalvar = false;
        erroValidade.textContent = 'Feche esta janela e recarregue o estoque antes de corrigir o lote.';
      }
    } else {
      erroValidade.textContent = mensagem(erro, 'Não foi possível salvar a validade. Tente novamente.');
    }
  } finally {
    ocupado(botaoSalvarValidade, false);
    botaoSalvarValidade.disabled = !podeSalvar;
    novaValidade.disabled = false;
    cancelarValidade.disabled = false;
    if (dialogoValidade.open) (podeSalvar ? novaValidade : cancelarValidade).focus();
  }
});

function iniciarAbertura(parte) {
  parteEmAbertura = parte;
  formAbertura.reset();
  erroAbertura.textContent = '';
  feedback.textContent = '';
  porId('lote-em-abertura').textContent = parte.insumo;
  porId('saldo-fechado').textContent = `Saldo fechado: ${formatarSaldo(parte.saldo, parte.medida)}`;
  dialogoAbertura.showModal();
  formAbertura.elements.quantidade.focus();
}

cancelarAbertura.addEventListener('click', () => dialogoAbertura.close());
dialogoAbertura.addEventListener('cancel', (evento) => {
  if (salvarAbertura.disabled) evento.preventDefault();
});
dialogoAbertura.addEventListener('close', () => {
  focarAcao(parteEmAbertura.parte_id, 'abrir');
  parteEmAbertura = null;
});

formAbertura.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!restaurante || !parteEmAbertura || salvarAbertura.disabled) return;
  const dados = Object.fromEntries(new FormData(formAbertura));
  const quantidade = normalizarQuantidade(dados.quantidade, parteEmAbertura.medida);
  if (!quantidade) {
    erroAbertura.textContent = parteEmAbertura.medida === 'un'
      ? 'Informe uma quantidade inteira maior que zero.'
      : 'Informe uma quantidade maior que zero, como 0,5.';
    formAbertura.elements.quantidade.focus();
    return;
  }
  // Os campos de data fornecem valores ISO, que podem ser comparados sem conversão de fuso horário.
  if (dados.validade < dados.data) {
    erroAbertura.textContent = 'A validade após abertura deve ser igual ou posterior à data de abertura.';
    formAbertura.elements.validade.focus();
    return;
  }

  const abertura = {
    p_restaurante_id: restaurante.id, p_lote_id: parteEmAbertura.lote_id,
    p_parte_id: parteEmAbertura.parte_id, p_quantidade: quantidade,
    p_data_abertura: dados.data, p_validade_abertura: dados.validade,
  };
  // Se a conexão cair após o envio, repetir os mesmos dados reaproveita a chave da operação.
  const conteudo = JSON.stringify(abertura);
  if (envioAbertura?.conteudo !== conteudo) envioAbertura = { conteudo, id: crypto.randomUUID() };
  erroAbertura.textContent = '';
  const controles = [...formAbertura.elements];
  for (const controle of controles) controle.disabled = true;
  ocupado(salvarAbertura, true);
  try {
    await api.registrarAbertura({ ...abertura, p_operacao_id: envioAbertura.id });
    envioAbertura = null;
    feedback.textContent = 'Abertura registrada. O saldo do lote foi atualizado.';
    await atualizarEstoque();
    dialogoAbertura.close();
  } catch (erro) {
    erroAbertura.textContent = erro.code === 'PT409' && !api.modoLocal
      ? 'O saldo ou a situação do lote mudou. Confira o estoque antes de tentar novamente.'
      : mensagem(erro, 'Não foi possível registrar a abertura. Tente novamente.');
  } finally {
    for (const controle of controles) controle.disabled = false;
    ocupado(salvarAbertura, false);
  }
});

function limparErros() {
  erroCadastro.textContent = '';
  for (const campo of formLote.querySelectorAll('[aria-invalid]')) {
    campo.removeAttribute('aria-invalid');
    campo.removeAttribute('aria-describedby');
  }
}

function erroNoCampo(campo, texto) {
  // Move o foco ao campo inválido e associa a mensagem aos leitores de tela.
  erroCadastro.textContent = texto;
  campo.setAttribute('aria-invalid', 'true');
  campo.setAttribute('aria-describedby', 'erro-cadastro');
  campo.focus();
}

function definirModoCadastro(modo = 'manual') {
  const usarVision = modo === 'vision';
  if (blocoVision) blocoVision.hidden = !usarVision;
  if (modoVision) modoVision.setAttribute('aria-pressed', String(usarVision));
  if (modoManual) modoManual.setAttribute('aria-pressed', String(!usarVision));
  if (usarVision) descricaoLote?.focus();
  else campos.insumo.focus();
}

function definirCadastro(aberto, modo = 'manual') {
  porId('painel-cadastro').hidden = !aberto;
  abrirCadastro.setAttribute('aria-expanded', String(aberto && modo === 'manual'));
  if (abrirVision) abrirVision.setAttribute('aria-expanded', String(aberto && modo === 'vision'));
  if (aberto) definirModoCadastro(modo);
  else (modo === 'vision' && abrirVision ? abrirVision : abrirCadastro).focus();
}

// Alterna entre os módulos administrativos dentro da conta (Estoque, Equipe e Fornecedores).
function alternarModulo(destino, carregar = true) {
  if (destino === 'equipe' && !ehDonoAtual) destino = 'estoque';
  moduloAtivo = destino;
  if (moduloEstoque) moduloEstoque.hidden = destino !== 'estoque';
  if (moduloEquipe) moduloEquipe.hidden = destino !== 'equipe';
  if (moduloFornecedores) moduloFornecedores.hidden = destino !== 'fornecedores';
  for (const botao of navModulos?.querySelectorAll('[data-modulo]') ?? []) {
    botao.setAttribute('aria-pressed', String(botao.dataset.modulo === destino));
  }
  if (!carregar || !restaurante) return;
  if (destino === 'equipe') void carregarEquipePainel();
  if (destino === 'fornecedores') void carregarFornecedoresPainel();
}

navModulos?.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-modulo]');
  if (!botao) return;
  alternarModulo(botao.dataset.modulo, true);
});

// O botão Equipe no cabeçalho também abre diretamente a aba Equipe dentro da conta.
linkEquipe?.addEventListener('click', (evento) => {
  if (!restaurante || !ehDonoAtual) return;
  evento.preventDefault();
  alternarModulo('equipe', true);
  porId('titulo-equipe-painel')?.focus();
});

// ---------- MÓDULO EQUIPE INTEGRADO (EXCLUSIVO DONO) ----------
async function carregarEquipePainel() {
  if (!restaurante || !ehDonoAtual) return;
  mensagemEquipeLista.textContent = 'Carregando equipe…';
  mensagemEquipeLista.classList.remove('erro');
  try {
    const membros = await api.equipe(restaurante.id);
    const totalDonosAtivos = membros.filter((m) => m.ativo && m.papel === 'dono').length;
    corpoEquipePainel.replaceChildren(...membros.map((membro) => {
      const linha = document.createElement('tr');
      linha.setAttribute('role', 'row');
      const nome = membro.nome_usuario || membro.email || 'Conta cadastrada';
      const celPessoa = adicionarCelula(linha, nome);
      if (membro.email && membro.nome_usuario) {
        const sub = document.createElement('small');
        sub.textContent = membro.email;
        celPessoa.append(sub);
      }
      adicionarCelula(linha, membro.papel === 'dono' ? 'Dono' : 'Funcionário', 'Perfil');
      const badge = document.createElement('span');
      badge.className = 'estado';
      badge.dataset.situacao = membro.ativo ? 'em_dia' : 'vencido';
      badge.textContent = membro.ativo ? 'Ativo' : 'Acesso removido';
      adicionarCelula(linha, badge, 'Situação');

      const acoes = document.createElement('div');
      acoes.className = 'acoes';
      const unicoDono = membro.ativo && membro.papel === 'dono' && totalDonosAtivos <= 1;
      if (membro.ativo && !unicoDono) {
        const btnRem = document.createElement('button');
        btnRem.type = 'button';
        btnRem.className = 'botao botao-secundario danger';
        btnRem.textContent = 'Remover acesso';
        btnRem.addEventListener('click', () => {
          membroEmRemocao = membro;
          erroRemoverMembro.textContent = '';
          textoRemoverMembro.textContent = `Remover o acesso de ${membro.nome_usuario ? `${membro.nome_usuario} (${membro.email})` : membro.email}?`;
          dialogoRemoverMembro.showModal();
          confirmarRemoverMembro.focus();
        });
        acoes.append(btnRem);
      } else if (!membro.ativo) {
        const btnReat = document.createElement('button');
        btnReat.type = 'button';
        btnReat.className = 'botao botao-secundario';
        btnReat.textContent = 'Reativar acesso';
        btnReat.addEventListener('click', async () => {
          ocupado(btnReat, true);
          try {
            await api.vincularMembro({
              p_restaurante_id: restaurante.id,
              p_identificador: membro.email || membro.nome_usuario,
              p_papel: membro.papel,
            });
            feedbackEquipe.textContent = 'Acesso reativado.';
            await carregarEquipePainel();
          } catch (erro) {
            feedbackEquipe.textContent = erro.message || 'Não foi possível reativar o acesso.';
          } finally {
            ocupado(btnReat, false);
          }
        });
        acoes.append(btnReat);
      } else {
        const nota = document.createElement('small');
        nota.textContent = 'Dono principal ativo';
        acoes.append(nota);
      }
      adicionarCelula(linha, acoes);
      return linha;
    }));
    tabelaEquipePainel.hidden = membros.length === 0;
    mensagemEquipeLista.textContent = membros.length === 0 ? 'Nenhuma pessoa vinculada a este restaurante.' : '';
  } catch (erro) {
    tabelaEquipePainel.hidden = true;
    mensagemEquipeLista.classList.add('erro');
    mensagemEquipeLista.textContent = erro.message || 'Não foi possível carregar a equipe.';
  }
}

formEquipePainel?.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const botao = formEquipePainel.querySelector('[type="submit"]');
  if (!restaurante || !ehDonoAtual || botao.disabled) return;
  const dados = Object.fromEntries(new FormData(formEquipePainel));
  const identificador = String(dados.identificador ?? '').trim();
  if (identificador.length < 3) {
    erroEquipePainel.textContent = 'Informe o usuário ou e-mail da conta cadastrada.';
    return;
  }
  erroEquipePainel.textContent = '';
  feedbackEquipe.textContent = '';
  ocupado(botao, true);
  try {
    const vinculado = await api.vincularMembro({
      p_restaurante_id: restaurante.id,
      p_identificador: identificador,
      p_papel: dados.papel || 'funcionario',
    });
    formEquipePainel.reset();
    feedbackEquipe.textContent = `Acesso liberado para ${vinculado?.nome_usuario || vinculado?.email || identificador}.`;
    await carregarEquipePainel();
  } catch (erro) {
    erroEquipePainel.textContent = erro.message || 'Não foi possível liberar o acesso.';
  } finally {
    ocupado(botao, false);
  }
});

cancelarRemoverMembro?.addEventListener('click', () => dialogoRemoverMembro.close());
confirmarRemoverMembro?.addEventListener('click', async () => {
  if (!restaurante || !membroEmRemocao || confirmarRemoverMembro.disabled) return;
  erroRemoverMembro.textContent = '';
  ocupado(confirmarRemoverMembro, true);
  try {
    await api.removerMembro({ p_restaurante_id: restaurante.id, p_usuario_id: membroEmRemocao.usuario_id });
    feedbackEquipe.textContent = 'Acesso removido imediatamente.';
    dialogoRemoverMembro.close();
    membroEmRemocao = null;
    await carregarEquipePainel();
  } catch (erro) {
    erroRemoverMembro.textContent = erro.message || 'Não foi possível remover o acesso.';
  } finally {
    ocupado(confirmarRemoverMembro, false);
  }
});

// ---------- MÓDULO FORNECEDORES INTEGRADO (DONO GERENCIA · FUNCIONÁRIO CONSULTA) ----------
function abrirFormularioFornecedor(fornecedor = null) {
  if (!ehDonoAtual) return;
  formFornecedor.reset();
  erroFornecedor.textContent = '';
  formFornecedor.elements.id.value = fornecedor?.id ?? '';
  formFornecedor.elements.nome.value = fornecedor?.nome ?? '';
  formFornecedor.elements.categoria.value = fornecedor?.categoria ?? '';
  formFornecedor.elements.contato.value = fornecedor?.contato ?? '';
  formFornecedor.elements.email.value = fornecedor?.email ?? '';
  formFornecedor.elements.observacoes.value = fornecedor?.observacoes ?? '';
  tituloFormFornecedor.textContent = fornecedor ? 'Editar fornecedor' : 'Novo fornecedor';
  painelFornecedor.hidden = false;
  formFornecedor.elements.nome.focus();
}

abrirFornecedor?.addEventListener('click', () => abrirFormularioFornecedor(null));
cancelarFornecedor?.addEventListener('click', () => {
  formFornecedor.reset();
  erroFornecedor.textContent = '';
  painelFornecedor.hidden = true;
});

async function carregarFornecedoresPainel() {
  if (!restaurante) return;
  mensagemFornecedores.textContent = 'Carregando fornecedores…';
  mensagemFornecedores.classList.remove('erro');
  try {
    const lista = await api.fornecedores(restaurante.id);
    corpoFornecedores.replaceChildren(...lista.map((item) => {
      const linha = document.createElement('tr');
      linha.setAttribute('role', 'row');
      const celNome = adicionarCelula(linha, item.nome);
      if (item.observacoes) {
        const obs = document.createElement('small');
        obs.textContent = item.observacoes;
        celNome.append(obs);
      }
      adicionarCelula(linha, item.categoria || '—', 'Categoria');
      const celContato = adicionarCelula(linha, item.contato || item.email || '—', 'Contato');
      if (item.contato && item.email) {
        const mail = document.createElement('small');
        mail.textContent = item.email;
        celContato.append(mail);
      }
      const badge = document.createElement('span');
      badge.className = 'estado';
      badge.dataset.situacao = item.ativo ? 'em_dia' : 'vencido';
      badge.textContent = item.ativo ? 'Ativo' : 'Inativo';
      adicionarCelula(linha, badge, 'Situação');

      if (ehDonoAtual) {
        const acoes = document.createElement('div');
        acoes.className = 'acoes';
        const btnEditar = document.createElement('button');
        btnEditar.type = 'button';
        btnEditar.className = 'botao botao-secundario';
        btnEditar.textContent = 'Editar';
        btnEditar.addEventListener('click', () => abrirFormularioFornecedor(item));
        const btnStatus = document.createElement('button');
        btnStatus.type = 'button';
        btnStatus.className = item.ativo ? 'botao botao-secundario danger' : 'botao botao-secundario';
        btnStatus.textContent = item.ativo ? 'Desativar' : 'Reativar';
        btnStatus.addEventListener('click', async () => {
          ocupado(btnStatus, true);
          try {
            await api.alterarStatusFornecedor({
              p_restaurante_id: restaurante.id,
              p_fornecedor_id: item.id,
              p_ativo: !item.ativo,
            });
            feedbackFornecedores.textContent = item.ativo ? 'Fornecedor desativado.' : 'Fornecedor reativado.';
            await carregarFornecedoresPainel();
          } catch (erro) {
            feedbackFornecedores.textContent = erro.message || 'Não foi possível atualizar o fornecedor.';
          } finally {
            ocupado(btnStatus, false);
          }
        });
        acoes.append(btnEditar, btnStatus);
        adicionarCelula(linha, acoes);
      }
      return linha;
    }));
    tabelaFornecedores.hidden = lista.length === 0;
    mensagemFornecedores.textContent = lista.length === 0
      ? (ehDonoAtual ? 'Nenhum fornecedor cadastrado. Use “Novo fornecedor” para começar.' : 'Nenhum fornecedor ativo cadastrado pelo restaurante.')
      : '';
  } catch (erro) {
    tabelaFornecedores.hidden = true;
    mensagemFornecedores.classList.add('erro');
    mensagemFornecedores.textContent = erro.message || 'Não foi possível carregar os fornecedores.';
  }
}

formFornecedor?.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const botao = formFornecedor.querySelector('[type="submit"]');
  if (!restaurante || !ehDonoAtual || botao.disabled) return;
  const dados = Object.fromEntries(new FormData(formFornecedor));
  const nome = String(dados.nome ?? '').trim();
  if (!nome) {
    erroFornecedor.textContent = 'Informe o nome do fornecedor.';
    formFornecedor.elements.nome.focus();
    return;
  }
  erroFornecedor.textContent = '';
  feedbackFornecedores.textContent = '';
  ocupado(botao, true);
  try {
    await api.salvarFornecedor({
      p_restaurante_id: restaurante.id,
      p_fornecedor_id: dados.id || null,
      p_nome: nome,
      p_categoria: dados.categoria || null,
      p_contato: dados.contato || null,
      p_email: dados.email || null,
      p_observacoes: dados.observacoes || null,
    });
    formFornecedor.reset();
    painelFornecedor.hidden = true;
    feedbackFornecedores.textContent = dados.id ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.';
    await carregarFornecedoresPainel();
  } catch (erro) {
    erroFornecedor.textContent = erro.message || 'Não foi possível salvar o fornecedor.';
  } finally {
    ocupado(botao, false);
  }
});

// Alterna visibilidade da senha na tela direta /estoque/ com o botão compacto de olho.
alternarSenhaEntrada?.addEventListener('click', () => {
  const visivel = campoSenhaEntrada.type === 'text';
  campoSenhaEntrada.type = visivel ? 'password' : 'text';
  alternarSenhaEntrada.setAttribute('aria-pressed', String(!visivel));
  alternarSenhaEntrada.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
});

formEntrada.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const botao = formEntrada.querySelector('[type="submit"]');
  if (botao.disabled) return;
  ocupado(botao, true);
  mensagemSessao.textContent = '';
  mensagemSessao.classList.remove('erro');
  const { identificador, senha } = Object.fromEntries(new FormData(formEntrada));
  try {
    await api.entrar(identificador, senha);
    // Oferece ao cofre nativo do navegador a escolha Salvar/Nunca sem gravar a senha na página.
    try {
      if (typeof window.PasswordCredential === 'function' && navigator.credentials?.store) {
        await navigator.credentials.store(new window.PasswordCredential({
          id: String(identificador ?? '').trim(),
          password: String(senha ?? ''),
        }));
      }
    } catch {
      // Segue normalmente se o navegador não suportar ou recusar a API de credenciais.
    }
    formEntrada.reset();
    await mostrarSessao(true);
  } catch (erro) {
    mensagemSessao.classList.add('erro');
    if (erro.status === 429) mensagemSessao.textContent = 'Muitas tentativas. Aguarde e tente novamente.';
    else mensagemSessao.textContent = mensagem(erro, erro.status === 401
      ? 'Confira o usuário ou e-mail e a senha e tente novamente.'
      : 'Não foi possível entrar. Tente novamente.');
  } finally {
    ocupado(botao, false);
  }
});

// Abre o diálogo Minha conta com dados atualizados da sessão e opção de confirmação de e-mail.
async function abrirMinhaConta() {
  feedbackConta.textContent = '';
  feedbackConta.classList.remove('erro');
  if (api.sessao) {
    try {
      const atualizada = await api.sessao();
      if (atualizada?.user) {
        sessaoAtual = atualizada;
        atualizarPainelConta(atualizada, atualizada.restaurantes);
      }
    } catch {
      // Mantém os últimos dados da sessão já carregados se a atualização falhar.
    }
  }
  if (!dialogoConta.open) dialogoConta.showModal();
}

minhaConta.addEventListener('click', abrirMinhaConta);
abrirContaSemRestaurante?.addEventListener('click', abrirMinhaConta);
fecharConta.addEventListener('click', () => dialogoConta.close());
dialogoConta.addEventListener('click', (evento) => {
  if (evento.target === dialogoConta) dialogoConta.close();
});

botaoConfirmarEmail.addEventListener('click', async () => {
  if (botaoConfirmarEmail.disabled || !api.solicitarConfirmacaoEmail) return;
  ocupado(botaoConfirmarEmail, true);
  feedbackConta.textContent = '';
  feedbackConta.classList.remove('erro');
  try {
    const resultado = await api.solicitarConfirmacaoEmail();
    feedbackConta.textContent = resultado?.mensagem ?? 'Enviamos um link para o e-mail da sua conta.';
    if (resultado?.verificado && api.sessao) {
      sessaoAtual = await api.sessao();
      atualizarPainelConta(sessaoAtual, sessaoAtual?.restaurantes);
    }
  } catch (erro) {
    feedbackConta.classList.add('erro');
    feedbackConta.textContent = erro.status === 429
      ? 'Muitos pedidos de confirmação. Aguarde e tente novamente.'
      : 'Não foi possível enviar a confirmação agora. Tente novamente mais tarde.';
  } finally {
    ocupado(botaoConfirmarEmail, false);
  }
});

async function encerrarSessao(botaoAcionado, escopo = 'local') {
  if (botaoAcionado.disabled) return;
  ocupado(botaoAcionado, true);
  try {
    await api.sair(escopo);
    if (dialogoConta.open) dialogoConta.close();
    formLote.reset();
    limparErros();
    envioPendente = null;
    envioAbertura = null;
    envioSaida = null;
    descricaoLote.value = '';
    statusAssistente.textContent = '';
    feedback.textContent = '';
    porId('lotes').replaceChildren();
    porId('tabela-estoque').hidden = true;
    if (barraFiltrosEstoque) barraFiltrosEstoque.hidden = true;
    filtroSituacao = 'todos';
    porId('painel-cadastro').hidden = true;
    abrirCadastro.setAttribute('aria-expanded', 'false');
    await mostrarSessao(true);
    if (escopo === 'global') {
      mensagemSessao.classList.remove('erro');
      mensagemSessao.textContent = 'Você saiu de todos os dispositivos.';
    }
  } catch (erro) {
    mensagemSessao.textContent = mensagem(erro, 'Não foi possível sair. Tente novamente.');
  } finally {
    ocupado(botaoAcionado, false);
  }
}

sair.addEventListener('click', () => encerrarSessao(sair, 'local'));
sairTodosDispositivos?.addEventListener('click', () => encerrarSessao(sairTodosDispositivos, 'global'));

abrirCadastro.addEventListener('click', () => {
  feedback.textContent = '';
  definirCadastro(true, 'manual');
});
abrirVision?.addEventListener('click', () => {
  feedback.textContent = '';
  definirCadastro(true, 'vision');
});
modoVision?.addEventListener('click', () => definirModoCadastro('vision'));
modoManual?.addEventListener('click', () => definirModoCadastro('manual'));
exemploVision?.addEventListener('click', () => {
  descricaoLote.value = 'Creme de leite, lote A12, 2 caixas, validade 30/11/2026, freezer';
  preencherComAssistente();
});
porId('cancelar-cadastro').addEventListener('click', () => {
  formLote.reset();
  limparErros();
  definirCadastro(false);
});
recarregar.addEventListener('click', atualizarEstoque);

function normalizarTextoChave(valor) {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function buscarLoteDuplicado(insumo, codigo, validade) {
  const nomeChave = normalizarTextoChave(insumo);
  const codigoChave = normalizarTextoChave(codigo);
  return lotesCarregados.find((item) => {
    if (normalizarTextoChave(item.insumo) !== nomeChave) return false;
    if (item.validade_embalagem !== validade && item.validade_aplicavel !== validade) return false;
    const itemCodigo = normalizarTextoChave(item.codigo_fabricante);
    return itemCodigo === codigoChave || !itemCodigo || !codigoChave;
  }) ?? null;
}

formLote.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const botao = formLote.querySelector('[type="submit"]');
  if (!restaurante || botao.disabled) return;
  limparErros();
  const dados = Object.fromEntries(new FormData(formLote));
  const quantidade = normalizarQuantidade(dados.quantidade, dados.medida);
  if (!dados.insumo.trim()) {
    erroNoCampo(campos.insumo, 'Informe o nome do insumo.');
    return;
  }
  if (!quantidade) {
    erroNoCampo(campos.quantidade, dados.medida === 'un'
      ? 'Informe uma quantidade inteira maior que zero.'
      : 'Informe uma quantidade maior que zero, como 0,5.');
    return;
  }

  const lote = {
    p_restaurante_id: restaurante.id,
    p_insumo: dados.insumo.trim(),
    p_codigo_fabricante: dados.codigo.trim() || null,
    p_local: dados.local.trim() || null,
    p_validade: dados.validade,
    p_medida: dados.medida,
    p_quantidade: quantidade,
  };

  // Evita cadastro acidental de lote repetido; um segundo clique confirma o envio intencional.
  const chaveDup = `${normalizarTextoChave(lote.p_insumo)}|${normalizarTextoChave(lote.p_codigo_fabricante)}|${lote.p_validade}`;
  const existente = buscarLoteDuplicado(lote.p_insumo, lote.p_codigo_fabricante, lote.p_validade);
  if (existente && duplicadoConfirmado !== chaveDup) {
    duplicadoConfirmado = chaveDup;
    const codigoInfo = existente.codigo_fabricante ? ` (Lote ${existente.codigo_fabricante})` : '';
    erroCadastro.textContent = `Lote repetido: “${existente.insumo}”${codigoInfo} com validade ${formatarData(existente.validade_aplicavel)} já está no estoque. Confira na lista ou clique novamente em “Salvar lote” para cadastrar mesmo assim.`;
    botao.focus();
    return;
  }
  duplicadoConfirmado = null;
  // Uma nova tentativa com os mesmos dados reaproveita a chave de cadastro.
  const conteudo = JSON.stringify(lote);
  if (envioPendente?.conteudo !== conteudo) envioPendente = { conteudo, id: crypto.randomUUID() };
  const controles = [...campos];
  for (const controle of controles) controle.disabled = true;
  abrirCadastro.disabled = true;
  sair.disabled = true;
  ocupado(botao, true);

  try {
    await api.cadastrar({ ...lote, p_operacao_id: envioPendente.id });
    envioPendente = null;
    formLote.reset();
    descricaoLote.value = '';
    statusAssistente.textContent = '';
    formLote.querySelectorAll('.sugestao').forEach((campo) => campo.classList.remove('sugestao'));
    feedback.textContent = 'Lote cadastrado.';
    abrirCadastro.disabled = false;
    definirCadastro(false);
    await atualizarEstoque();
  } catch (erro) {
    erroCadastro.textContent = mensagem(erro, 'Não foi possível salvar. Tente novamente.');
  } finally {
    for (const controle of controles) controle.disabled = false;
    abrirCadastro.disabled = false;
    sair.disabled = false;
    ocupado(botao, false);
  }
});

function preencherComAssistente() {
  if (!descricaoLote.value.trim()) {
    statusAssistente.textContent = 'Descreva o lote para o Vision preencher os campos.';
    descricaoLote.focus();
    return;
  }
  try {
    const sugestao = interpretarLote(descricaoLote.value);
    // Trocar a descrição remove apenas sugestões antigas. Uma data ambígua exige nova conferência.
    for (const campo of formLote.querySelectorAll('.sugestao')) {
      campo.value = campo.defaultValue ?? 'un';
      campo.classList.remove('sugestao');
    }
    campos.validade.value = '';
    for (const [nome, valor] of Object.entries(sugestao)) {
      const campo = campos[nome];
      if (!valor) continue;
      campo.value = campo.maxLength > 0 ? valor.slice(0, campo.maxLength) : valor;
      campo.classList.add('sugestao');
    }
    if (!sugestao.validade) {
      statusAssistente.textContent = 'Vision: informe uma data completa e válida antes de salvar.';
      campos.validade.focus();
    } else {
      statusAssistente.textContent = 'Vision preencheu os campos destacados. Confira os dados e clique em Salvar lote.';
      const faltante = [campos.insumo, campos.quantidade].find((campo) => !campo.value);
      (faltante ?? campos.insumo).focus();
    }
  } catch {
    statusAssistente.textContent = 'O Vision não conseguiu interpretar essa descrição. Preencha os campos manualmente.';
  }
}

porId('sugerir-lote').addEventListener('click', preencherComAssistente);
formLote.addEventListener('input', (evento) => {
  evento.target.classList.remove('sugestao');
  duplicadoConfirmado = null;
});

// Quando disponível, o navegador transforma a fala em texto para o assistente Vision conferir.
const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
const ditar = porId('ditar-lote');
ditar?.addEventListener('click', () => {
  if (!Reconhecimento) {
    statusAssistente.textContent = 'Seu navegador não suporta ditado por voz. Digite a descrição acima para o Vision preencher.';
    descricaoLote.focus();
    return;
  }
  try {
    const reconhecimento = new Reconhecimento();
    reconhecimento.lang = 'pt-BR';
    reconhecimento.onresult = (evento) => {
      if (porId('painel-cadastro').hidden) return;
      descricaoLote.value = evento.results[0][0].transcript.slice(0, 600);
      preencherComAssistente();
    };
    reconhecimento.onerror = () => {
      statusAssistente.textContent = 'Ditado indisponível agora. Digite a descrição para o Vision ou preencha manualmente.';
    };
    reconhecimento.onend = () => ocupado(ditar, false);
    reconhecimento.start();
    ocupado(ditar, true);
    statusAssistente.textContent = 'Vision ouvindo… fale o insumo, quantidade e validade.';
  } catch {
    ocupado(ditar, false);
    statusAssistente.textContent = 'Ditado indisponível. Você pode digitar a descrição para o Vision.';
  }
});

if (api.modoLocal) {
  porId('ambiente-local').hidden = false;
  porId('contas-locais').hidden = false;
}

mostrarSessao().catch((erro) => {
  porId('entrada').hidden = false;
  mensagemSessao.classList.add('erro');
  mensagemSessao.textContent = mensagem(erro, 'Não foi possível verificar o acesso. Recarregue a página e tente novamente.');
});
