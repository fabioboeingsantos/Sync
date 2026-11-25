import { api } from './api.js';
import { interpretarLote } from './interpretar-lote.js';

// Controla os estados de acesso, consulta e movimentação da tela de estoque.
const porId = (id) => document.getElementById(id);
const formEntrada = porId('form-entrada');
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
const minhaConta = porId('minha-conta');
const abrirCadastro = porId('abrir-cadastro');
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
let parteEmSaida = null;
let envioSaida = null;
let restaurante = null;
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

async function mostrarSessao(focar = false) {
  const restaurantes = await api.restaurantes();
  restaurante = restaurantes?.[0] ?? null;
  porId('entrada').hidden = restaurantes !== null;
  porId('sem-restaurante').hidden = restaurantes?.length !== 0;
  porId('aplicacao').hidden = !restaurante;
  sair.hidden = restaurantes === null;
  // A conta continua acessível para qualquer sessão, mesmo sem vínculo que libere o estoque.
  minhaConta.hidden = restaurantes === null;
  mensagemSessao.textContent = '';

  if (!restaurante) {
    versaoConsulta += 1;
    porId('lotes').replaceChildren();
    painelDescartes.hidden = true;
    historicoDescartes.replaceChildren();
    porId('tabela-estoque').hidden = true;
    ocupado(recarregar, false);
    if (focar) porId(restaurantes === null ? 'titulo-entrada' : 'titulo-sem-restaurante').focus();
    return;
  }

  porId('restaurante').textContent = restaurante.nome;
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
    porId('lotes').replaceChildren(...lotes.map(mostrarLote));
    porId('tabela-estoque').hidden = lotes.length === 0;
    mensagemLista.textContent = lotes.length === 0 ? 'Nenhum lote cadastrado.' : '';
    void atualizarDescartes(restaurante.id, consulta);
    return lotes;
  } catch (erro) {
    if (consulta !== versaoConsulta) return;
    porId('lotes').replaceChildren();
    porId('tabela-estoque').hidden = true;
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
    painelDescartes.hidden = descartes === null;
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

function definirCadastro(aberto) {
  porId('painel-cadastro').hidden = !aberto;
  abrirCadastro.setAttribute('aria-expanded', String(aberto));
  if (aberto) campos.insumo.focus();
  else abrirCadastro.focus();
}

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

sair.addEventListener('click', async () => {
  if (sair.disabled) return;
  ocupado(sair, true);
  try {
    await api.sair();
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
    porId('painel-cadastro').hidden = true;
    abrirCadastro.setAttribute('aria-expanded', 'false');
    await mostrarSessao(true);
  } catch (erro) {
    mensagemSessao.textContent = mensagem(erro, 'Não foi possível sair. Tente novamente.');
  } finally {
    ocupado(sair, false);
  }
});

abrirCadastro.addEventListener('click', () => {
  feedback.textContent = '';
  definirCadastro(true);
});
porId('cancelar-cadastro').addEventListener('click', () => {
  formLote.reset();
  limparErros();
  definirCadastro(false);
});
recarregar.addEventListener('click', atualizarEstoque);

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
    statusAssistente.textContent = 'Descreva o lote para receber sugestões.';
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
      statusAssistente.textContent = 'Informe uma data completa e válida antes de salvar.';
      campos.validade.focus();
    } else {
      statusAssistente.textContent = 'Confira os campos sugeridos, complete os dados e clique em Salvar lote.';
      const faltante = [campos.insumo, campos.quantidade].find((campo) => !campo.value);
      (faltante ?? campos.insumo).focus();
    }
  } catch {
    statusAssistente.textContent = 'Não foi possível interpretar a descrição. Preencha os campos manualmente.';
  }
}

porId('sugerir-lote').addEventListener('click', preencherComAssistente);
formLote.addEventListener('input', (evento) => evento.target.classList.remove('sugestao'));

// Quando disponível, o navegador transforma a fala em texto para a mesma etapa de conferência.
const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
const ditar = porId('ditar-lote');
if (Reconhecimento) {
  ditar.hidden = false;
  porId('aviso-ditado').hidden = false;
  ditar.addEventListener('click', () => {
    try {
      const reconhecimento = new Reconhecimento();
      reconhecimento.lang = 'pt-BR';
      reconhecimento.onresult = (evento) => {
        if (porId('painel-cadastro').hidden) return;
        descricaoLote.value = evento.results[0][0].transcript.slice(0, 600);
        preencherComAssistente();
      };
      reconhecimento.onerror = () => {
        statusAssistente.textContent = 'Ditado indisponível. Você pode digitar ou preencher os campos manualmente.';
      };
      reconhecimento.onend = () => ocupado(ditar, false);
      reconhecimento.start();
      ocupado(ditar, true);
      statusAssistente.textContent = 'Ouvindo…';
    } catch {
      ocupado(ditar, false);
      statusAssistente.textContent = 'Ditado indisponível. Você pode digitar a descrição.';
    }
  });
}

if (api.modoLocal) {
  porId('ambiente-local').hidden = false;
  porId('contas-locais').hidden = false;
}

mostrarSessao().catch((erro) => {
  porId('entrada').hidden = false;
  mensagemSessao.classList.add('erro');
  mensagemSessao.textContent = mensagem(erro, 'Não foi possível verificar o acesso. Recarregue a página e tente novamente.');
});
