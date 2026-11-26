import { api } from './api.js';

// Controla a gestão da equipe (/equipe/), disponível ao dono e ao gerente.
const porId = (id) => document.getElementById(id);
const situacaoSessao = porId('situacao-sessao');
const contaTopo = porId('conta-topo');
const botaoSair = porId('sair');
const secaoEntrar = porId('precisa-entrar');
const secaoSemPermissao = porId('sem-permissao');
const secaoEquipe = porId('aplicacao-equipe');
const tituloRestaurante = porId('restaurante');
const feedback = porId('feedback');
const formVincular = porId('form-vincular');
const erroVincular = porId('erro-vincular');
const mensagemLista = porId('mensagem-lista');
const botaoRecarregar = porId('recarregar');
const tabelaEquipe = porId('tabela-equipe');
const corpoMembros = porId('membros');
const dialogoRemover = porId('dialogo-remover');
const membroEmRemocao = porId('membro-em-remocao');
const erroRemover = porId('erro-remover');
const confirmarRemover = porId('confirmar-remover');
const cancelarRemover = porId('cancelar-remover');

let restaurante = null;
let papelAtual = 'funcionario';
let membroSelecionado = null;

function ocupado(botao, estado) {
  botao.disabled = estado;
  if (estado) botao.setAttribute('aria-busy', 'true');
  else botao.removeAttribute('aria-busy');
}

function adicionarCelula(linha, conteudo, rotulo) {
  const celula = linha.insertCell();
  celula.setAttribute('role', 'cell');
  if (rotulo) {
    const legenda = document.createElement('span');
    legenda.className = 'rotulo-celula';
    legenda.setAttribute('aria-hidden', 'true');
    legenda.textContent = rotulo;
    celula.append(legenda);
  }
  celula.append(conteudo);
  return celula;
}

function criarLinhaMembro(membro, totalDonosAtivos) {
  const linha = document.createElement('tr');
  linha.setAttribute('role', 'row');

  const identificacao = membro.nome_usuario || membro.email || 'Conta cadastrada';
  const celulaPessoa = adicionarCelula(linha, identificacao);
  if (membro.email && membro.nome_usuario) {
    const subtitulo = document.createElement('small');
    subtitulo.textContent = membro.email;
    celulaPessoa.append(subtitulo);
  }

  const nomesPerfil = { dono: 'Dono', gerente: 'Gerente', funcionario: 'Funcionário' };
  const papelTexto = nomesPerfil[membro.papel] ?? 'Funcionário';
  adicionarCelula(linha, papelTexto, 'Perfil');

  const estado = document.createElement('span');
  estado.className = 'estado';
  estado.dataset.situacao = membro.ativo ? 'em_dia' : 'vencido';
  estado.textContent = membro.ativo ? 'Ativo' : 'Acesso removido';
  adicionarCelula(linha, estado, 'Situação');

  const acoes = document.createElement('div');
  acoes.className = 'acoes';
  const unicoDono = membro.ativo && membro.papel === 'dono' && totalDonosAtivos <= 1;
  const podeGerenciarMembro = papelAtual === 'dono' || membro.papel !== 'dono';

  if (membro.ativo && !unicoDono && podeGerenciarMembro) {
    const botaoRemover = document.createElement('button');
    botaoRemover.type = 'button';
    botaoRemover.className = 'botao botao-secundario danger';
    botaoRemover.textContent = 'Remover acesso';
    botaoRemover.setAttribute('aria-label', `Remover acesso de ${identificacao}`);
    botaoRemover.addEventListener('click', () => abrirConfirmacaoRemocao(membro));
    acoes.append(botaoRemover);
  } else if (!membro.ativo && podeGerenciarMembro) {
    const botaoReativar = document.createElement('button');
    botaoReativar.type = 'button';
    botaoReativar.className = 'botao botao-secundario';
    botaoReativar.textContent = 'Reativar acesso';
    botaoReativar.setAttribute('aria-label', `Reativar acesso de ${identificacao}`);
    botaoReativar.addEventListener('click', () => reativarMembro(membro, botaoReativar));
    acoes.append(botaoReativar);
  } else {
    const aviso = document.createElement('small');
    aviso.textContent = membro.papel === 'dono' && papelAtual === 'gerente'
      ? 'Acesso do dono reservado ao proprietário'
      : 'Dono principal ativo';
    acoes.append(aviso);
  }

  adicionarCelula(linha, acoes);
  return linha;
}

async function carregarEquipe() {
  if (!restaurante) return;
  ocupado(botaoRecarregar, true);
  botaoRecarregar.hidden = true;
  mensagemLista.textContent = 'Carregando equipe…';
  mensagemLista.classList.remove('erro');

  try {
    const lista = await api.equipe(restaurante.id);
    secaoSemPermissao.hidden = true;
    secaoEquipe.hidden = false;
    tituloRestaurante.textContent = restaurante.nome;

    const totalDonosAtivos = lista.filter((item) => item.ativo && item.papel === 'dono').length;
    corpoMembros.replaceChildren(...lista.map((item) => criarLinhaMembro(item, totalDonosAtivos)));
    tabelaEquipe.hidden = lista.length === 0;
    mensagemLista.textContent = lista.length === 0 ? 'Nenhuma pessoa vinculada a este restaurante.' : '';
  } catch (erro) {
    corpoMembros.replaceChildren();
    tabelaEquipe.hidden = true;
    if (erro.status === 401) {
      await verificarSessao(true);
    } else if (erro.status === 403 || erro.code === '42501') {
      secaoEquipe.hidden = true;
      secaoSemPermissao.hidden = false;
      porId('titulo-sem-permissao').focus();
    } else {
      mensagemLista.textContent = erro.message || 'Não foi possível carregar a equipe.';
      mensagemLista.classList.add('erro');
      botaoRecarregar.hidden = false;
    }
  } finally {
    ocupado(botaoRecarregar, false);
  }
}

async function verificarSessao(focar = false) {
  const sessao = api.sessao ? await api.sessao() : null;
  const restaurantes = sessao?.restaurantes ?? await api.restaurantes();
  const autenticado = Boolean(sessao?.user) || restaurantes !== null;
  restaurante = restaurantes?.[0] ?? null;
  papelAtual = restaurante?.papel ?? 'funcionario';
  const opcaoDono = formVincular.elements.papel.querySelector('option[value="dono"]');
  if (opcaoDono) opcaoDono.hidden = papelAtual !== 'dono';

  const email = sessao?.user?.email ?? '';
  contaTopo.textContent = email;
  contaTopo.hidden = !email;
  botaoSair.hidden = !autenticado;
  situacaoSessao.textContent = '';

  secaoEntrar.hidden = autenticado;
  secaoSemPermissao.hidden = !autenticado || Boolean(restaurante);
  secaoEquipe.hidden = true;

  if (!autenticado) {
    if (focar) porId('titulo-entrar').focus();
    return;
  }
  if (!restaurante) {
    if (focar) porId('titulo-sem-permissao').focus();
    return;
  }

  await carregarEquipe();
  if (focar && !secaoEquipe.hidden) porId('titulo-equipe').focus();
}

function abrirConfirmacaoRemocao(membro) {
  membroSelecionado = membro;
  erroRemover.textContent = '';
  const nome = membro.nome_usuario ? `${membro.nome_usuario} (${membro.email})` : membro.email;
  membroEmRemocao.textContent = `Remover o acesso de ${nome}?`;
  dialogoRemover.showModal();
  confirmarRemover.focus();
}

async function reativarMembro(membro, botao) {
  if (!restaurante || botao.disabled) return;
  ocupado(botao, true);
  feedback.textContent = '';
  feedback.classList.remove('erro');
  try {
    await api.vincularMembro({
      p_restaurante_id: restaurante.id,
      p_identificador: membro.email || membro.nome_usuario,
      p_papel: membro.papel,
    });
    feedback.textContent = 'Acesso reativado.';
    await carregarEquipe();
  } catch (erro) {
    feedback.classList.add('erro');
    feedback.textContent = erro.message || 'Não foi possível reativar o acesso.';
  } finally {
    ocupado(botao, false);
  }
}

formVincular.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const botao = formVincular.querySelector('[type="submit"]');
  if (!restaurante || botao.disabled) return;

  const dados = Object.fromEntries(new FormData(formVincular));
  const identificador = String(dados.identificador ?? '').trim();
  if (identificador.length < 3) {
    erroVincular.textContent = 'Informe o usuário ou o e-mail da conta cadastrada.';
    formVincular.elements.identificador.focus();
    return;
  }

  erroVincular.textContent = '';
  feedback.textContent = '';
  feedback.classList.remove('erro');
  ocupado(botao, true);
  for (const campo of formVincular.elements) campo.disabled = true;

  try {
    const vinculado = await api.vincularMembro({
      p_restaurante_id: restaurante.id,
      p_identificador: identificador,
      p_papel: dados.papel || 'funcionario',
    });
    formVincular.reset();
    const rotulo = vinculado?.nome_usuario || vinculado?.email || identificador;
    feedback.textContent = `Acesso liberado para ${rotulo}.`;
    await carregarEquipe();
  } catch (erro) {
    erroVincular.textContent = erro.message || 'Não foi possível liberar o acesso. Confira os dados e tente novamente.';
  } finally {
    for (const campo of formVincular.elements) campo.disabled = false;
    ocupado(botao, false);
  }
});

cancelarRemover.addEventListener('click', () => dialogoRemover.close());
dialogoRemover.addEventListener('cancel', (evento) => {
  if (confirmarRemover.disabled) evento.preventDefault();
});
dialogoRemover.addEventListener('close', () => {
  membroSelecionado = null;
});

confirmarRemover.addEventListener('click', async () => {
  if (!restaurante || !membroSelecionado || confirmarRemover.disabled) return;
  erroRemover.textContent = '';
  ocupado(confirmarRemover, true);
  cancelarRemover.disabled = true;
  try {
    await api.removerMembro({
      p_restaurante_id: restaurante.id,
      p_usuario_id: membroSelecionado.usuario_id,
    });
    feedback.textContent = 'Acesso removido imediatamente.';
    feedback.classList.remove('erro');
    dialogoRemover.close();
    await carregarEquipe();
  } catch (erro) {
    erroRemover.textContent = erro.message || 'Não foi possível remover o acesso.';
  } finally {
    ocupado(confirmarRemover, false);
    cancelarRemover.disabled = false;
  }
});

botaoRecarregar.addEventListener('click', carregarEquipe);

botaoSair.addEventListener('click', async () => {
  if (botaoSair.disabled) return;
  ocupado(botaoSair, true);
  try {
    await api.sair();
    await verificarSessao(true);
  } finally {
    ocupado(botaoSair, false);
  }
});

if (api.modoLocal) {
  porId('ambiente-local').hidden = false;
}

verificarSessao().catch((erro) => {
  situacaoSessao.classList.add('erro');
  situacaoSessao.textContent = erro.message || 'Não foi possível verificar o acesso. Recarregue a página.';
});
