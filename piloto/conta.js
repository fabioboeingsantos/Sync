import { api } from './api.js';

// A página concentra as ações pessoais sem diálogos e sempre usa a sessão protegida pelo servidor.
const porId = (id) => document.getElementById(id);
const estadoCarregamento = porId('estado-carregamento-conta');
const pagina = porId('pagina-conta');
const indisponivel = porId('conta-indisponivel');
const feedback = porId('feedback-conta');
const formUsuario = porId('form-nome-usuario');
const formSenha = porId('form-alterar-senha');
const botaoConfirmacao = porId('solicitar-confirmacao-email');
const botaoSair = porId('sair-todos-dispositivos');
let sessaoAtual = null;

// Os perfis antigos receberam um nome técnico na migração; a tela os trata como ainda não configurados.
function nomeConfigurado(nome) {
  return typeof nome === 'string' && nome.length > 0 && !/^usuario\.[a-f0-9]{12}$/i.test(nome);
}

function exibirFeedback(texto, erro = false) {
  feedback.textContent = texto;
  feedback.classList.toggle('erro', erro);
}

function carregarPerfil(sessao) {
  const usuario = sessao.user;
  porId('conta-email').textContent = usuario.email || 'Não disponível';
  porId('conta-acesso').textContent = sessao.restaurantes?.length
    ? sessao.restaurantes.map((restaurante) => restaurante.nome).join(', ')
    : 'Sem vínculo ativo · aguardando liberação do dono';
  const definido = nomeConfigurado(usuario.nome_usuario);
  porId('conta-usuario').textContent = definido ? `@${usuario.nome_usuario}` : 'Ainda não configurado';
  porId('form-nome-usuario').hidden = definido;
  const confirmado = Boolean(sessao.email_verificado_app);
  const selo = porId('estado-confirmacao');
  selo.textContent = confirmado ? 'Confirmado' : 'Pendente';
  selo.classList.toggle('confirmado', confirmado);
  selo.classList.toggle('pendente', !confirmado);
  porId('texto-confirmacao').textContent = confirmado
    ? 'Este endereço foi confirmado e está pronto para receber mensagens da sua conta.'
    : api.modoLocal
      ? 'A confirmação real é enviada apenas na versão online. Aqui você usa contas fictícias de demonstração.'
      : 'Confirme este endereço para mantê-lo validado na sua conta.';
  botaoConfirmacao.hidden = confirmado || api.modoLocal;
}

function ocupar(botao, ocupada) {
  botao.disabled = ocupada;
  if (ocupada) botao.setAttribute('aria-busy', 'true');
  else botao.removeAttribute('aria-busy');
}

async function iniciar() {
  porId('ambiente-local').hidden = !api.modoLocal;
  try {
    sessaoAtual = await api.sessao();
    estadoCarregamento.hidden = true;
    if (!sessaoAtual?.user) {
      indisponivel.hidden = false;
      return;
    }
    pagina.hidden = false;
    carregarPerfil(sessaoAtual);
  } catch {
    estadoCarregamento.textContent = 'Não foi possível carregar sua conta. Atualize a página para tentar novamente.';
    estadoCarregamento.classList.add('erro');
  }
}

formUsuario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const botao = formUsuario.querySelector('[type="submit"]');
  if (!formUsuario.reportValidity()) return;
  ocupar(botao, true);
  exibirFeedback('');
  try {
    const resultado = await api.definirNomeUsuario(formUsuario.elements.nome_usuario.value);
    sessaoAtual.user.nome_usuario = resultado.nome_usuario;
    carregarPerfil(sessaoAtual);
    formUsuario.reset();
    exibirFeedback('Nome de usuário salvo. Agora você também pode entrar com ele.');
  } catch (erro) {
    exibirFeedback(erro.message || 'Não foi possível salvar seu nome de usuário.', true);
  } finally {
    ocupar(botao, false);
  }
});

formSenha.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!formSenha.reportValidity()) return;
  const dados = new FormData(formSenha);
  const senhaNova = String(dados.get('senha_nova'));
  if (senhaNova !== String(dados.get('confirmar_senha'))) {
    exibirFeedback('A nova senha e a confirmação estão diferentes.', true);
    porId('confirmar-senha-nova').focus();
    return;
  }
  const botao = formSenha.querySelector('[type="submit"]');
  ocupar(botao, true);
  exibirFeedback('');
  try {
    const resultado = await api.alterarSenha({
      senha_atual: String(dados.get('senha_atual')),
      senha_nova: senhaNova,
    });
    formSenha.reset();
    exibirFeedback(resultado?.mensagem || 'Senha atualizada. Entre novamente com sua nova senha.');
    window.setTimeout(() => { window.location.assign('../estoque/'); }, 1500);
  } catch (erro) {
    exibirFeedback(erro.message || 'Não foi possível atualizar sua senha.', true);
  } finally {
    ocupar(botao, false);
  }
});

botaoConfirmacao.addEventListener('click', async () => {
  ocupar(botaoConfirmacao, true);
  exibirFeedback('');
  try {
    const resultado = await api.solicitarConfirmacaoEmail();
    exibirFeedback(resultado?.mensagem || 'E-mail enviado. Confira sua caixa de entrada e as pastas Spam, Promoções e Atualizações.');
    if (resultado?.verificado) {
      sessaoAtual = await api.sessao();
      carregarPerfil(sessaoAtual);
    }
  } catch (erro) {
    exibirFeedback(erro.message || 'Não foi possível solicitar a confirmação agora.', true);
  } finally {
    ocupar(botaoConfirmacao, false);
  }
});

botaoSair.addEventListener('click', async () => {
  ocupar(botaoSair, true);
  exibirFeedback('');
  try {
    await api.sair('global');
    window.location.assign('../estoque/');
  } catch (erro) {
    exibirFeedback(erro.message || 'Não foi possível encerrar as sessões agora.', true);
  } finally {
    ocupar(botaoSair, false);
  }
});

iniciar();
