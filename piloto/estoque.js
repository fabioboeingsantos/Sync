import { api } from './api.js';
import { interpretarLote } from './interpretar-lote.js';
import { gerarXmlNfeExemplo, interpretarXmlNfe } from './interpretar-nfe.js';

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
const painelCadastro = porId('painel-cadastro');
const modoVision = porId('modo-vision');
const modoManual = porId('modo-manual');
const blocoVision = porId('assistente-lote');
const arquivoNfe = porId('arquivo-nfe');
const fotoValidade = porId('foto-validade');
const estadoOcr = porId('estado-ocr');
const estadoNfe = porId('estado-nfe');
const filaNfe = porId('fila-nfe');
const tituloFilaNfe = porId('titulo-fila-nfe');
const resumoFilaNfe = porId('resumo-fila-nfe');
const itensFilaNfe = porId('itens-fila-nfe');
const limparNfe = porId('limpar-nfe');
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
const abrirRelatorioDesperdicio = porId('abrir-relatorio-desperdicio');
const historicoDescartes = porId('historico-descartes');
const descricaoLote = porId('descricao-lote');
const statusAssistente = porId('status-assistente');
const barraFiltrosEstoque = porId('barra-filtros-estoque');
const filtrosEstoque = porId('filtros-estoque');
const contagemEstoque = porId('contagem-estoque');
const visualizacaoEstoqueControles = porId('visualizacao-estoque');
const chaveVisualizacaoEstoque = 'visionchef-estoque-visualizacao';
// Recupera a preferência local de leitura sem depender dela para carregar ou alterar os dados.
let visualizacaoEstoque = 'grade';
try {
  visualizacaoEstoque = localStorage.getItem(chaveVisualizacaoEstoque) === 'lista' ? 'lista' : 'grade';
} catch {
  visualizacaoEstoque = 'grade';
}
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
let notaFiscalAtual = null;
let itemNfeAtivoUid = null;
let notaFiscalDuplicada = false;
let leituraOcrAtiva = false;

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
    porId('grade-estoque').replaceChildren();
    notaFiscalAtual = null;
    itemNfeAtivoUid = null;
    notaFiscalDuplicada = false;
    renderizarFilaNfe();
    if (linkEquipe) linkEquipe.hidden = true;
    if (abaEquipe) abaEquipe.hidden = true;
    if (perfilBadge) perfilBadge.hidden = true;
    if (abrirFornecedor) abrirFornecedor.hidden = true;
    painelDescartes.hidden = true;
    if (abrirRelatorioDesperdicio) abrirRelatorioDesperdicio.hidden = true;
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

// O restaurante usa America/Sao_Paulo; o mesmo fuso define o mês e o dia do descarte no relatório.
const fusoRelatorio = 'America/Sao_Paulo';
function partesDataNoFuso(data) {
  return Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone: fusoRelatorio, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(data).filter((parte) => parte.type !== 'literal').map(({ type, value }) => [type, value]));
}

// Retorna o período civil atual do restaurante sem depender do fuso configurado no dispositivo.
function mesAtualRelatorio() {
  const partes = partesDataNoFuso(new Date());
  return `${partes.year}-${partes.month}`;
}

// Verifica vencimento na data local do descarte, como faz o relatório do protótipo E3.
function dataDoDescarte(saida) {
  const partes = partesDataNoFuso(new Date(saida.registrado_em));
  return `${partes.year}-${partes.month}-${partes.day}`;
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

// Mantém somente a chave da NF-e por restaurante; o XML e os dados fiscais não são enviados para outro serviço.
function chavesNfeImportadas() {
  if (!restaurante) return [];
  try {
    const salvas = JSON.parse(localStorage.getItem(`visionchef:nfe:${restaurante.id}`) ?? '[]');
    return Array.isArray(salvas) ? salvas : [];
  } catch {
    return [];
  }
}

// Registra a chave depois que pelo menos um item é cadastrado, para alertar sobre reimportações acidentais.
function salvarChaveNfeImportada(chave) {
  if (!restaurante || !chave) return;
  const chaves = chavesNfeImportadas();
  if (chaves.includes(chave)) return;
  try {
    localStorage.setItem(`visionchef:nfe:${restaurante.id}`, JSON.stringify([...chaves, chave]));
  } catch {
    // A nota continua funcionando durante esta sessão mesmo se o navegador bloquear o armazenamento local.
  }
}

// Converte somente unidades compatíveis com o estoque; caixas e pacotes exigem conversão conferida pela pessoa.
function quantidadeNfeParaEstoque(quantidadeFiscal) {
  const partes = String(quantidadeFiscal ?? '').match(/^\s*(\d+(?:[.,]\d+)?)(?:\s+(.+))?\s*$/);
  if (!partes) return { quantidade: '', medida: 'un', aviso: 'Informe quantidade e medida antes de salvar.' };
  const numero = partes[1].replace(',', '.');
  const unidade = (partes[2] ?? '').trim().toLowerCase();
  if (/^(g|gr|gramas?)$/.test(unidade)) return { quantidade: String(Number(numero) / 1000), medida: 'kg', aviso: '' };
  if (/^ml$/.test(unidade)) return { quantidade: String(Number(numero) / 1000), medida: 'L', aviso: '' };
  if (/^(kg|quilo|quilos)$/.test(unidade)) return { quantidade: numero, medida: 'kg', aviso: '' };
  if (/^(l|litro|litros)$/.test(unidade)) return { quantidade: numero, medida: 'L', aviso: '' };
  if (/^(un|und|unid|unidade|unidades)?$/.test(unidade) && Number.isInteger(Number(numero))) {
    return { quantidade: numero, medida: 'un', aviso: '' };
  }
  return {
    quantidade: '',
    medida: 'un',
    aviso: `A NF-e informa “${quantidadeFiscal}”. Converta para unidades, kg ou L no estoque antes de salvar.`,
  };
}

// Preenche a fila de itens da nota sem inserir lotes automaticamente no estoque.
function renderizarFilaNfe() {
  if (!notaFiscalAtual) {
    filaNfe.hidden = true;
    itensFilaNfe.replaceChildren();
    return;
  }
  filaNfe.hidden = false;
  const conferidos = notaFiscalAtual.itens.filter((item) => item.conferido).length;
  tituloFilaNfe.textContent = `NF-e nº ${notaFiscalAtual.numeroNota} · ${notaFiscalAtual.fornecedor}`;
  resumoFilaNfe.textContent = `${notaFiscalAtual.totalComRastro} com lote/validade no XML · ${notaFiscalAtual.totalSemValidade} para conferir · ${conferidos}/${notaFiscalAtual.itens.length} salvos`;
  itensFilaNfe.replaceChildren(...notaFiscalAtual.itens.map((item) => {
    const linha = document.createElement('li');
    linha.className = 'fila-nfe-item';
    if (item.uid === itemNfeAtivoUid) linha.setAttribute('aria-current', 'true');
    const informacao = document.createElement('div');
    informacao.className = 'fila-nfe-item-info';
    const nome = document.createElement('strong');
    nome.textContent = item.nomeSugerido || item.descricaoFiscal;
    const detalhe = document.createElement('small');
    detalhe.textContent = `${item.quantidade || 'Quantidade não informada'} · ${item.temRastro ? `Lote ${item.lote}, validade ${formatarData(item.validade)}` : 'sem validade no XML'}`;
    informacao.append(nome, detalhe);
    const acao = document.createElement('button');
    acao.type = 'button';
    acao.className = 'botao botao-secundario';
    acao.dataset.itemNfe = item.uid;
    acao.textContent = item.conferido ? 'Salvo' : 'Conferir';
    acao.disabled = item.conferido;
    acao.setAttribute('aria-label', `${item.conferido ? 'Item salvo' : 'Conferir'}: ${item.nomeSugerido || item.descricaoFiscal}`);
    linha.append(informacao, acao);
    return linha;
  }));
}

// Seleciona um item da nota e pré-preenche somente os dados que podem ser mapeados com segurança.
function selecionarItemNfe(uid) {
  if (!notaFiscalAtual) return;
  const item = notaFiscalAtual.itens.find((entrada) => entrada.uid === uid);
  if (!item || item.conferido) return;
  itemNfeAtivoUid = uid;
  estadoNfe.textContent = notaFiscalDuplicada
    ? `Atenção: a NF-e nº ${notaFiscalAtual.numeroNota} já foi importada neste navegador. Confira se este item já existe antes de salvar.`
    : `Item ${item.nItem} selecionado. Confira os dados antes de salvar.`;
  estadoNfe.dataset.estado = notaFiscalDuplicada ? 'aviso' : 'ok';
  formLote.reset();
  limparErros();
  for (const campo of [campos.insumo, campos.codigo, campos.quantidade, campos.medida, campos.validade, campos.local]) {
    campo.classList.remove('sugestao');
    delete campo.dataset.fonteNfe;
    campo.removeAttribute('aria-invalid');
  }

  const preencher = (campo, valor) => {
    if (!valor) return;
    campo.value = valor;
    campo.classList.add('sugestao');
    campo.dataset.fonteNfe = 'true';
  };
  const conversao = quantidadeNfeParaEstoque(item.quantidade);
  preencher(campos.insumo, item.nomeSugerido);
  preencher(campos.codigo, item.lote);
  preencher(campos.quantidade, conversao.quantidade);
  campos.medida.value = conversao.medida;
  if (conversao.quantidade) {
    campos.medida.classList.add('sugestao');
    campos.medida.dataset.fonteNfe = 'true';
  }
  preencher(campos.validade, item.validade);
  descricaoLote.value = '';
  renderizarFilaNfe();

  if (conversao.aviso) {
    statusAssistente.textContent = conversao.aviso;
    estadoNfe.textContent = conversao.aviso;
    estadoNfe.dataset.estado = 'aviso';
  } else if (!item.temRastro) {
    statusAssistente.textContent = 'Este item veio sem validade no XML. Informe a data ou dite no microfone para o Vision completar.';
    campos.validade.focus();
  } else {
    statusAssistente.textContent = 'Lote e validade vieram do XML. Confira os campos antes de salvar.';
  }
}

// Importa e interpreta o arquivo local no navegador, aproveitando <rastro> sem salvar itens sem conferência.
function importarXmlNfe(xml) {
  try {
    notaFiscalAtual = interpretarXmlNfe(xml);
    notaFiscalDuplicada = Boolean(notaFiscalAtual.chaveAcesso && chavesNfeImportadas().includes(notaFiscalAtual.chaveAcesso));
    itemNfeAtivoUid = null;
    estadoNfe.textContent = notaFiscalDuplicada
      ? `Atenção: a NF-e nº ${notaFiscalAtual.numeroNota} já foi usada neste navegador. Confira os lotes existentes antes de salvar novamente.`
      : `NF-e nº ${notaFiscalAtual.numeroNota} carregada. Selecione cada item, confira os campos e salve um por vez.`;
    estadoNfe.dataset.estado = notaFiscalDuplicada ? 'aviso' : 'ok';
    renderizarFilaNfe();
    const primeiroPendente = notaFiscalAtual.itens.find((item) => !item.conferido);
    if (primeiroPendente) selecionarItemNfe(primeiroPendente.uid);
  } catch (erro) {
    estadoNfe.textContent = erro.message || 'Não foi possível ler este XML de NF-e.';
    estadoNfe.dataset.estado = 'erro';
    notaFiscalAtual = null;
    itemNfeAtivoUid = null;
    notaFiscalDuplicada = false;
    renderizarFilaNfe();
  }
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

// Cria o cartão da visão em grade com os mesmos dados e ações da tabela de lista.
function mostrarCartaoLote(lote) {
  const cartao = document.createElement('article');
  cartao.className = 'cartao-lote';
  cartao.dataset.situacao = lote.situacao;
  cartao.setAttribute('role', 'listitem');

  const cabecalho = document.createElement('div');
  cabecalho.className = 'cartao-lote-cabecalho';
  const titulo = document.createElement('h3');
  titulo.textContent = lote.insumo;
  const estado = document.createElement('span');
  estado.className = 'estado';
  estado.dataset.situacao = lote.situacao;
  estado.textContent = rotulos[lote.situacao];
  cabecalho.append(titulo, estado);

  const detalhes = document.createElement('dl');
  detalhes.className = 'cartao-lote-detalhes';
  const incluirDetalhe = (rotulo, valor) => {
    if (!valor) return;
    const termo = document.createElement('dt');
    termo.textContent = rotulo;
    const descricao = document.createElement('dd');
    descricao.textContent = valor;
    detalhes.append(termo, descricao);
  };
  incluirDetalhe('Saldo', formatarSaldo(lote.saldo, lote.medida));
  incluirDetalhe('Validade', formatarData(lote.validade_aplicavel));
  incluirDetalhe('Lote', lote.codigo_fabricante);
  incluirDetalhe('Local', lote.local_armazenamento);
  incluirDetalhe('Abertura', lote.data_abertura ? formatarData(lote.data_abertura) : 'Fechado');
  if (lote.data_abertura) {
    incluirDetalhe('Validade da embalagem', formatarData(lote.validade_embalagem));
    incluirDetalhe('Validade após abertura', formatarData(lote.validade_abertura));
  }

  const acoes = document.createElement('div');
  acoes.className = 'acoes cartao-lote-acoes';
  acoes.append(acaoDaParte(lote, 'Corrigir validade', 'corrigir', abrirCorrecao));
  if (!lote.data_abertura && lote.situacao !== 'vencido') {
    acoes.append(acaoDaParte(lote, 'Registrar abertura', 'abrir', iniciarAbertura));
  }
  if (lote.situacao !== 'vencido') {
    acoes.append(acaoDaParte(lote, 'Registrar uso', 'uso', (parte) => iniciarSaida(parte, 'uso')));
  }
  acoes.append(acaoDaParte(lote, 'Registrar descarte', 'descarte', (parte) => iniciarSaida(parte, 'descarte')));
  cartao.append(cabecalho, detalhes, acoes);
  return cartao;
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
  const origem = visualizacaoEstoque === 'grade' ? porId('grade-estoque') : porId('lotes');
  const botao = origem.querySelector(`[data-parte="${CSS.escape(parte)}"][data-acao="${acao}"]`);
  (botao ?? porId('titulo-lista')).focus();
}

// Atualiza a preferência visual e anuncia o modo selecionado aos leitores de tela.
function aplicarVisualizacaoEstoque(persistir = true) {
  const emGrade = visualizacaoEstoque === 'grade';
  porId('grade-estoque').hidden = !emGrade;
  porId('tabela-lista-estoque').hidden = emGrade;
  for (const botao of visualizacaoEstoqueControles.querySelectorAll('[data-visualizacao-estoque]')) {
    botao.setAttribute('aria-pressed', String(botao.dataset.visualizacaoEstoque === visualizacaoEstoque));
  }
  if (persistir) {
    try {
      localStorage.setItem(chaveVisualizacaoEstoque, visualizacaoEstoque);
    } catch {
      // Mantém a seleção durante esta sessão mesmo se o navegador bloquear o armazenamento local.
    }
  }
}

visualizacaoEstoqueControles?.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-visualizacao-estoque]');
  if (!botao) return;
  visualizacaoEstoque = botao.dataset.visualizacaoEstoque === 'lista' ? 'lista' : 'grade';
  aplicarVisualizacaoEstoque();
  if (lotesCarregados.length) aplicarFiltroEstoque();
});
aplicarVisualizacaoEstoque(false);

function aplicarFiltroEstoque() {
  const seletorAtivo = visualizacaoEstoque === 'grade'
    ? '#grade-estoque [data-situacao]'
    : '#lotes tr[data-situacao]';
  const linhas = [...porId('tabela-estoque').querySelectorAll(seletorAtivo)];
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
    porId('grade-estoque').replaceChildren(...lotes.map(mostrarCartaoLote));
    aplicarVisualizacaoEstoque(false);
    porId('tabela-estoque').hidden = lotes.length === 0;
    if (barraFiltrosEstoque) barraFiltrosEstoque.hidden = false;
    mensagemLista.textContent = lotes.length === 0 ? 'Nenhum lote cadastrado.' : '';
    if (lotes.length > 0) aplicarFiltroEstoque();
    void atualizarDescartes(restaurante.id, consulta);
    return lotes;
  } catch (erro) {
    if (consulta !== versaoConsulta) return;
    porId('lotes').replaceChildren();
    porId('grade-estoque').replaceChildren();
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
    const periodo = mesAtualRelatorio();
    const descartes = await api.descartes(id, periodo);
    if (consulta !== versaoConsulta) return;
    // O relatório, assim como equipe e fornecedores, só é exibido à conta dona do restaurante.
    ehDonoAtual = descartes !== null;
    if (linkEquipe) linkEquipe.hidden = !ehDonoAtual;
    if (abaEquipe) abaEquipe.hidden = !ehDonoAtual;
    if (abrirFornecedor) abrirFornecedor.hidden = !ehDonoAtual;
    if (colAcoesFornecedores) colAcoesFornecedores.hidden = !ehDonoAtual;
    if (abrirRelatorioDesperdicio) abrirRelatorioDesperdicio.hidden = !ehDonoAtual;
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
    if (!ehDonoAtual) return;

    const [ano, mes] = periodo.split('-').map(Number);
    const mesExtenso = new Intl.DateTimeFormat('pt-BR', {
      month: 'long', year: 'numeric', timeZone: fusoRelatorio,
    }).format(new Date(Date.UTC(ano, mes - 1, 15, 12)));
    porId('mes-relatorio-desperdicio').textContent = mesExtenso;
    const lista = Array.isArray(descartes) ? descartes : [];
    const vencidos = lista.filter((saida) => saida.validade_aplicavel < dataDoDescarte(saida)).length;
    porId('total-descartes-mes').textContent = String(lista.length);
    porId('total-descartes-vencidos').textContent = String(vencidos);
    historicoDescartes.replaceChildren(...lista.map((saida) => {
      const item = document.createElement('li');
      item.className = 'descarte-relatorio-item';
      const titulo = document.createElement('strong');
      titulo.textContent = saida.insumo;
      const lote = saida.codigo_fabricante ? ` · Lote ${saida.codigo_fabricante}` : '';
      const quantidade = document.createElement('p');
      quantidade.textContent = `Quantidade descartada: ${formatarSaldo(saida.quantidade, saida.medida)}${lote}`;
      const motivo = saida.motivo === 'vencimento' ? 'Vencimento' : 'Outro motivo';
      const detalhes = document.createElement('small');
      detalhes.textContent = `Validade: ${formatarData(saida.validade_aplicavel)} · Motivo: ${motivo} · Descartado em: ${new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short', timeStyle: 'short', timeZone: fusoRelatorio,
      }).format(new Date(saida.registrado_em))}`;
      item.append(titulo, quantidade, detalhes);
      return item;
    }));
    porId('mensagem-descartes').textContent = lista.length ? '' : 'Nenhum descarte registrado neste mês.';
  } catch {
    if (consulta !== versaoConsulta) return;
    historicoDescartes.replaceChildren();
    porId('total-descartes-mes').textContent = '—';
    porId('total-descartes-vencidos').textContent = '—';
    porId('mensagem-descartes').textContent = 'Não foi possível carregar o relatório deste mês. Tente atualizar o estoque.';
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
  painelCadastro.classList.toggle('modo-vision', usarVision);
  if (blocoVision) blocoVision.hidden = !usarVision;
  if (modoVision) modoVision.setAttribute('aria-pressed', String(usarVision));
  if (modoManual) modoManual.setAttribute('aria-pressed', String(!usarVision));
  if (usarVision) descricaoLote?.focus();
  else campos.insumo.focus();
}

function definirCadastro(aberto, modo = 'manual') {
  painelCadastro.hidden = !aberto;
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
    feedbackConta.textContent = resultado?.mensagem ?? 'E-mail enviado. Ele costuma chegar em alguns minutos. Confira a caixa de entrada e também Spam/Lixo eletrônico, Promoções ou Atualizações. O link vale por 24 horas.';
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
    notaFiscalAtual = null;
    itemNfeAtivoUid = null;
    notaFiscalDuplicada = false;
    descricaoLote.value = '';
    statusAssistente.textContent = '';
    feedback.textContent = '';
    porId('lotes').replaceChildren();
    porId('grade-estoque').replaceChildren();
    renderizarFilaNfe();
    estadoNfe.textContent = '';
    porId('tabela-estoque').hidden = true;
    if (barraFiltrosEstoque) barraFiltrosEstoque.hidden = true;
    filtroSituacao = 'todos';
    painelCadastro.hidden = true;
    painelCadastro.classList.remove('modo-vision');
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
  const itemNfeSubmetido = notaFiscalAtual?.itens.find((item) => item.uid === itemNfeAtivoUid) ?? null;
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
    let proximoItemNfe = null;
    if (itemNfeSubmetido) {
      // A fila só avança após o servidor confirmar este lote no estoque.
      itemNfeSubmetido.conferido = true;
      salvarChaveNfeImportada(notaFiscalAtual.chaveAcesso);
      proximoItemNfe = notaFiscalAtual.itens.find((item) => !item.conferido) ?? null;
    }
    itemNfeAtivoUid = null;
    formLote.reset();
    descricaoLote.value = '';
    statusAssistente.textContent = '';
    formLote.querySelectorAll('.sugestao').forEach((campo) => {
      campo.classList.remove('sugestao');
      delete campo.dataset.fonteNfe;
    });
    abrirCadastro.disabled = false;
    await atualizarEstoque();
    if (itemNfeSubmetido) {
      renderizarFilaNfe();
      if (proximoItemNfe) {
        feedback.textContent = 'Lote da NF-e cadastrado. Confira o próximo item da fila.';
        definirCadastro(true, 'vision');
        selecionarItemNfe(proximoItemNfe.uid);
      } else {
        estadoNfe.textContent = `Todos os ${notaFiscalAtual.itens.length} itens da NF-e foram conferidos e salvos no estoque.`;
        estadoNfe.dataset.estado = 'ok';
        feedback.textContent = 'Importação da NF-e concluída.';
      }
    } else {
      feedback.textContent = 'Lote cadastrado.';
      definirCadastro(false);
    }
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
      if (campo.dataset.fonteNfe === 'true') {
        campo.classList.remove('sugestao');
        continue;
      }
      // A sugestão obtida pela foto permanece enquanto a pessoa completa os demais campos por texto ou voz.
      if (campo.dataset.fonteOcr === 'true') continue;
      campo.value = campo.defaultValue ?? 'un';
      campo.classList.remove('sugestao');
    }
    if (!itemNfeAtivoUid && campos.validade.dataset.fonteOcr !== 'true') campos.validade.value = '';
    for (const [nome, valor] of Object.entries(sugestao)) {
      const campo = campos[nome];
      if (!valor) continue;
      campo.value = campo.maxLength > 0 ? valor.slice(0, campo.maxLength) : valor;
      campo.classList.add('sugestao');
      delete campo.dataset.fonteNfe;
      delete campo.dataset.fonteOcr;
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

// Localiza uma data completa associada a um rótulo de validade, evitando confundir fabricação com vencimento.
function extrairValidadeOcr(texto) {
  const normalizado = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const ocorrencia = normalizado.match(/(?:VALIDADE|VALID|VAL|VENC(?:IMENTO)?|EXP(?:IRA(?:TION)?)?)\s*[:#\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i);
  if (!ocorrencia) return '';
  const partes = ocorrencia[1].split(/[./-]/).map(Number);
  const [dia, mes, anoInformado] = partes;
  const ano = String(anoInformado).length === 2 ? 2000 + anoInformado : anoInformado;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return '';
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Extrai códigos apenas quando há um marcador explícito de lote para reduzir sugestões incorretas.
function extrairLoteOcr(texto) {
  const ocorrencia = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/\b(?:LOTE|LOT)\s*[:#\-]?\s*([A-Z0-9][A-Z0-9._/-]{1,23})/i);
  return ocorrencia?.[1]?.replace(/[.,;:]$/, '') ?? '';
}

// Lê a fotografia localmente com Tesseract.js e preenche somente campos vazios para revisão.
fotoValidade?.addEventListener('change', async (evento) => {
  const arquivo = evento.target.files?.[0];
  evento.target.value = '';
  if (!arquivo) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type) || arquivo.size > 12 * 1024 * 1024) {
    estadoOcr.textContent = 'Escolha uma imagem JPG, PNG ou WebP de até 12 MB.';
    estadoOcr.dataset.estado = 'erro';
    return;
  }
  if (leituraOcrAtiva) return;
  leituraOcrAtiva = true;
  estadoOcr.textContent = 'Preparando o OCR local em português…';
  estadoOcr.dataset.estado = '';
  estadoOcr.setAttribute('aria-busy', 'true');
  let worker;
  try {
    // O módulo, worker, motor WebAssembly e idioma são arquivos do próprio site, sem chamadas a APIs ou CDN.
    const { createWorker } = await import('./ocr/tesseract.esm.min.js');
    worker = await createWorker('por', 1, {
      workerPath: new URL('./ocr/worker.min.js', import.meta.url).href,
      corePath: new URL('./ocr/core/', import.meta.url).href,
      langPath: new URL('./ocr/lang/', import.meta.url).href,
      logger: (progresso) => {
        if (progresso.status === 'recognizing text' && Number.isFinite(progresso.progress)) {
          estadoOcr.textContent = `Lendo a imagem no aparelho… ${Math.round(progresso.progress * 100)}%`;
        }
      },
    });
    const resultado = await worker.recognize(arquivo);
    const validade = extrairValidadeOcr(resultado.data.text);
    const lote = extrairLoteOcr(resultado.data.text);
    const preenchidos = [];
    if (lote && !campos.codigo.value.trim()) {
      campos.codigo.value = lote.slice(0, campos.codigo.maxLength || 80);
      campos.codigo.classList.add('sugestao');
      campos.codigo.dataset.fonteOcr = 'true';
      preenchidos.push('lote');
    }
    if (validade && !campos.validade.value) {
      campos.validade.value = validade;
      campos.validade.classList.add('sugestao');
      campos.validade.dataset.fonteOcr = 'true';
      preenchidos.push('validade');
    }
    if (preenchidos.length) {
      estadoOcr.textContent = `Sugestão de ${preenchidos.join(' e ')} preenchida. Confira o rótulo e os campos antes de salvar.`;
      estadoOcr.dataset.estado = 'ok';
      statusAssistente.textContent = 'O OCR sugeriu dados da embalagem. Confira as sugestões destacadas e corrija se necessário.';
    } else if (lote || validade) {
      estadoOcr.textContent = 'O OCR reconheceu dados, mas os campos correspondentes já têm conteúdo. Confira-os manualmente.';
      estadoOcr.dataset.estado = 'ok';
    } else {
      estadoOcr.textContent = 'Não identifiquei lote ou validade com segurança. Tente outra foto aproximada e bem iluminada ou digite os dados.';
      estadoOcr.dataset.estado = 'erro';
    }
  } catch (erro) {
    console.error('Falha na leitura OCR local:', erro);
    estadoOcr.textContent = 'Não foi possível carregar o OCR local. Recarregue a tela e tente outra vez.';
    estadoOcr.dataset.estado = 'erro';
  } finally {
    if (worker) await worker.terminate().catch(() => {});
    estadoOcr.removeAttribute('aria-busy');
    leituraOcrAtiva = false;
  }
});

porId('sugerir-lote').addEventListener('click', preencherComAssistente);
formLote.addEventListener('input', (evento) => {
  evento.target.classList.remove('sugestao');
  delete evento.target.dataset.fonteNfe;
  delete evento.target.dataset.fonteOcr;
  duplicadoConfirmado = null;
});

// Lê o XML local no navegador, com limite de tamanho e tratamento de erro para não enviar a nota ao servidor.
arquivoNfe?.addEventListener('change', async (evento) => {
  const arquivo = evento.target.files?.[0];
  evento.target.value = '';
  if (!arquivo) return;
  if (arquivo.size > 5 * 1024 * 1024) {
    estadoNfe.textContent = 'O XML deve ter até 5 MB.';
    estadoNfe.dataset.estado = 'erro';
    return;
  }
  try {
    importarXmlNfe(await arquivo.text());
  } catch {
    estadoNfe.textContent = 'Não foi possível ler o arquivo selecionado.';
    estadoNfe.dataset.estado = 'erro';
  }
});

// A seleção na fila preenche o mesmo formulário manual para validação antes do cadastro.
itensFilaNfe?.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-item-nfe]');
  if (botao) selecionarItemNfe(botao.dataset.itemNfe);
});

// Limpar a fila remove apenas a nota ainda em conferência; itens salvos continuam no estoque.
limparNfe?.addEventListener('click', () => {
  notaFiscalAtual = null;
  itemNfeAtivoUid = null;
  notaFiscalDuplicada = false;
  formLote.reset();
  limparErros();
  formLote.querySelectorAll('[data-fonte-nfe]').forEach((campo) => {
    campo.classList.remove('sugestao');
    delete campo.dataset.fonteNfe;
  });
  descricaoLote.value = '';
  statusAssistente.textContent = '';
  renderizarFilaNfe();
  estadoNfe.textContent = 'Fila limpa. Os lotes já salvos continuam no estoque.';
  estadoNfe.dataset.estado = 'ok';
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
