import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api.js';

// Este módulo conecta a landing da Sync aos fluxos de sessão, cadastro e recuperação do VisionChef.
function AcessoVisionChef({ destino }) {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const tokenConfirmacao = hash.get('confirmar-email') ?? '';
  const [temAcesso, definirAcesso] = useState(false);
  const [enviando, definirEnvio] = useState(false);
  const [mensagem, definirMensagem] = useState('');
  const [conta, definirConta] = useState(null);
  const [modo, definirModo] = useState(tokenConfirmacao ? 'confirmar' : hash.get('type') === 'recovery' ? 'redefinir' : 'entrar');
  const [dialogoAberto, definirDialogoAberto] = useState(Boolean(tokenConfirmacao) || hash.get('type') === 'recovery');
  const [senhaVisivel, definirSenhaVisivel] = useState(false);
  const envioEmCurso = useRef(false);
  const formulario = useRef(null);
  const dialogo = useRef(null);

  useEffect(() => {
    let paginaAtiva = true;
    (async () => {
      // A sessão libera o estoque quando há vínculo; sem vínculo, mantém a pessoa na área da conta.
      const sessao = api.sessao ? await api.sessao() : null;
      const restaurantes = sessao?.restaurantes ?? await api.restaurantes();
      if (!paginaAtiva || envioEmCurso.current || formulario.current?.contains(document.activeElement)) return;
      if (restaurantes?.length) definirAcesso(true);
      if (sessao?.user && !restaurantes?.length) {
        definirConta(sessao);
        definirModo('conta');
        definirDialogoAberto(true);
      }
    })().catch(() => {
      // O formulário continua disponível se a consulta de sessão falhar.
    });
    return () => { paginaAtiva = false; };
  }, []);

  useEffect(() => {
    // A confirmação é preparada no fragmento e só é consumida por um botão explícito da pessoa.
    if (tokenConfirmacao && !api.modoLocal) {
      definirModo('confirmar');
      definirDialogoAberto(true);
    }
  }, [tokenConfirmacao]);

  useEffect(() => {
    // Reaproveita os links da página e abre o mesmo diálogo a partir de qualquer CTA de acesso.
    const links = document.querySelectorAll('a[href="#prototipos"]');
    const abrir = (evento) => {
      evento.preventDefault();
      definirMensagem('');
      definirModo('entrar');
      definirDialogoAberto(true);
    };
    links.forEach((link) => link.addEventListener('click', abrir));
    return () => links.forEach((link) => link.removeEventListener('click', abrir));
  }, []);

  useEffect(() => {
    // O elemento nativo fornece foco contido, Escape e semântica de diálogo acessível.
    if (!dialogo.current) return;
    if (dialogoAberto && !dialogo.current.open) dialogo.current.showModal();
    if (!dialogoAberto && dialogo.current.open) dialogo.current.close();
  }, [dialogoAberto]);

  // Mantém a sessão ativa e encaminha ao estoque somente quando existe vínculo autorizado.
  async function entrar(evento) {
    evento.preventDefault();
    if (envioEmCurso.current) return;
    const { identificador, senha } = Object.fromEntries(new FormData(evento.currentTarget));
    envioEmCurso.current = true;
    definirEnvio(true);
    definirMensagem('');
    try {
      await api.entrar(identificador, senha);
      const sessao = api.sessao ? await api.sessao() : null;
      const restaurantes = sessao?.restaurantes ?? await api.restaurantes();
      if (!restaurantes?.length) {
        // Uma conta sem vínculo pode usar a área da conta, mas continua sem acesso ao estoque.
        if (sessao?.user) definirConta(sessao);
        definirMensagem('Sua conta está ativa. O acesso ao estoque será liberado quando o dono vincular você ao restaurante.');
        definirModo(sessao?.user ? 'conta' : 'resultado');
        return;
      }
      window.location.assign(destino);
    } catch (erro) {
      definirMensagem(erro.status === 429
        ? 'Muitas tentativas. Aguarde e tente novamente.'
        : erro.status === 401 || erro.code === 'invalid_credentials'
          ? 'Confira o usuário ou e-mail e a senha e tente novamente.'
          : 'Não foi possível entrar agora. Tente novamente.');
    } finally {
      envioEmCurso.current = false;
      definirEnvio(false);
    }
  }

  // Cria a identidade Auth sem atribuir papel ou restaurante à conta nova.
  async function criarConta(evento) {
    evento.preventDefault();
    if (envioEmCurso.current) return;
    const dados = Object.fromEntries(new FormData(evento.currentTarget));
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(dados.nomeUsuario.trim().toLowerCase())) {
      definirMensagem('Use um nome de usuário de 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.');
      return;
    }
    if (dados.senha !== dados.confirmarSenha) {
      definirMensagem('As senhas não coincidem.');
      return;
    }
    if (dados.senha.length < 15) {
      definirMensagem('Use uma senha com pelo menos 15 caracteres.');
      return;
    }
    if (api.modoLocal) {
      definirMensagem('O cadastro real fica disponível na versão online. Nesta demonstração local, use as contas de teste exibidas na tela de estoque.');
      definirModo('resultado');
      return;
    }
    envioEmCurso.current = true;
    definirEnvio(true);
    definirMensagem('');
    try {
      // O cadastro abre a própria conta quando a configuração do Supabase permite login sem confirmação obrigatória.
      const resultado = await api.criarConta({ nomeUsuario: dados.nomeUsuario, email: dados.email, senha: dados.senha });
      if (resultado.autenticado && api.sessao) {
        const sessao = await api.sessao();
        definirConta(sessao);
        definirMensagem('Conta criada. A confirmação de e-mail é opcional; o acesso ao estoque depende do vínculo do dono.');
        definirModo('conta');
      } else {
        definirMensagem(resultado.mensagem ?? 'Conta criada. Entre para acessar sua área da conta.');
        definirModo('resultado');
      }
    } catch {
      definirMensagem('Não foi possível criar a conta. Confira os dados ou tente outro usuário e e-mail.');
    } finally {
      envioEmCurso.current = false;
      definirEnvio(false);
    }
  }

  // Solicita a confirmação opcional somente dentro da sessão autenticada da conta.
  async function solicitarConfirmacaoEmail() {
    if (envioEmCurso.current || !api.solicitarConfirmacaoEmail) return;
    envioEmCurso.current = true;
    definirEnvio(true);
    definirMensagem('');
    try {
      const resultado = await api.solicitarConfirmacaoEmail();
      definirMensagem(resultado.mensagem);
      if (resultado.verificado && api.sessao) definirConta(await api.sessao());
    } catch {
      definirMensagem('Não foi possível enviar agora. Tente novamente mais tarde.');
    } finally {
      envioEmCurso.current = false;
      definirEnvio(false);
    }
  }

  // Consome o link após uma ação explícita para reduzir confirmação acidental por scanners de e-mail.
  async function confirmarEmail(evento) {
    evento.preventDefault();
    if (!tokenConfirmacao || envioEmCurso.current) return;
    envioEmCurso.current = true;
    definirEnvio(true);
    definirMensagem('');
    try {
      await api.confirmarEmail(tokenConfirmacao);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      if (api.sessao) {
        const sessao = await api.sessao();
        if (sessao?.user) definirConta(sessao);
      }
      definirMensagem('E-mail confirmado. Isso é opcional e não altera o acesso ao restaurante.');
      definirModo('resultado');
    } catch {
      definirMensagem('O link é inválido, expirou ou já foi utilizado. Solicite uma nova confirmação na sua conta.');
      definirModo('resultado');
    } finally {
      envioEmCurso.current = false;
      definirEnvio(false);
    }
  }

  // Encerra a sessão sem alterar o vínculo do usuário com o restaurante.
  async function sairDaConta() {
    try {
      await api.sair();
      definirConta(null);
      definirAcesso(false);
      definirMensagem('Você saiu da sua conta.');
      definirModo('resultado');
    } catch {
      definirMensagem('Não foi possível sair agora. Tente novamente.');
    }
  }

  // Solicita uma recuperação com resposta genérica para reduzir enumeração de contas.
  async function recuperarSenha(evento) {
    evento.preventDefault();
    if (envioEmCurso.current) return;
    const { email } = Object.fromEntries(new FormData(evento.currentTarget));
    if (api.modoLocal) {
      definirMensagem('A recuperação de senha exige a versão online do VisionChef.');
      definirModo('resultado');
      return;
    }
    envioEmCurso.current = true;
    definirEnvio(true);
    definirMensagem('');
    try {
      await api.recuperarSenha(email);
      definirMensagem('Se houver uma conta para esse e-mail, enviaremos um link de recuperação.');
      definirModo('resultado');
    } catch {
      definirMensagem('Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.');
    } finally {
      envioEmCurso.current = false;
      definirEnvio(false);
    }
  }

  // Atualiza a senha somente com a sessão temporária aberta pelo link de recuperação.
  async function redefinirSenha(evento) {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(evento.currentTarget));
    if (dados.senha.length < 15 || dados.senha !== dados.confirmarSenha) {
      definirMensagem(dados.senha.length < 15 ? 'Use uma senha com pelo menos 15 caracteres.' : 'As senhas não coincidem.');
      return;
    }
    definirEnvio(true);
    try {
      await api.atualizarSenha(dados.senha);
      await api.sair();
      definirMensagem('Senha atualizada. Entre com a nova senha.');
      definirModo('entrar');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch {
      definirMensagem('O link pode ter expirado. Solicite uma nova recuperação de senha.');
    } finally {
      definirEnvio(false);
    }
  }

  return (
    <>
      {temAcesso ? <>
        <a className="botao botao-primario" id="acesso-estoque" href={destino}>Abrir estoque</a>
        {/* A pessoa já vinculada também pode abrir a área da própria conta. */}
        <button className="botao botao-secundario" type="button" onClick={async () => {
          const sessao = await api.sessao?.();
          definirConta(sessao);
          definirMensagem('');
          definirModo('conta');
          definirDialogoAberto(true);
        }}>Minha conta</button>
      </> : <>
        <a className="botao botao-primario" id="acesso-estoque" href="#prototipos"
          onClick={() => { definirMensagem(''); definirModo(conta ? 'conta' : 'entrar'); definirDialogoAberto(true); }}>{conta ? 'Minha conta' : 'Entrar no VisionChef'}</a>
        <button className="botao botao-secundario botao-criar-conta" type="button"
          onClick={() => { definirMensagem(''); definirModo('cadastro'); definirDialogoAberto(true); }}>Criar conta</button>
      </>}
      <dialog className="dialogo-acesso-sync" ref={dialogo} aria-labelledby="titulo-acesso"
        onCancel={(evento) => { evento.preventDefault(); definirDialogoAberto(false); }}
        onClick={(evento) => { if (evento.target === dialogo.current) definirDialogoAberto(false); }}>
        <section className="cartao-acesso">
          <button className="botao-fechar-acesso" type="button" aria-label="Fechar acesso"
            onClick={() => definirDialogoAberto(false)}>×</button>
          <header className="cabecalho-acesso">
            <p className="rotulo-acesso">Sync · VisionChef</p>
            <h2 id="titulo-acesso">{modo === 'entrar' ? 'Entre na sua conta' : modo === 'cadastro' ? 'Crie sua conta' : modo === 'recuperar' ? 'Recupere sua senha' : modo === 'redefinir' ? 'Escolha uma nova senha' : modo === 'conta' ? 'Minha conta' : modo === 'confirmar' ? 'Confirme seu e-mail' : 'Acesso ao VisionChef'}</h2>
            <p>{modo === 'cadastro' ? 'A confirmação do e-mail é opcional. O acesso ao estoque depende do vínculo do dono do restaurante.' : modo === 'conta' ? 'Gerencie a confirmação facultativa do seu endereço. Isso não concede acesso ao estoque.' : modo === 'confirmar' ? 'Abra esta página a partir do link enviado e confirme abaixo para concluir.' : 'A demonstração pública continua disponível na página.'}</p>
          </header>
          {modo === 'entrar' && <form className="formulario-acesso" ref={formulario} onSubmit={entrar}>
            <label>Usuário ou e-mail<input name="identificador" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required /></label>
            <label>Senha<input name="senha" type={senhaVisivel ? 'text' : 'password'} autoComplete="current-password" required /></label>
            <button className="botao botao-secundario" type="button" onClick={() => definirSenhaVisivel(!senhaVisivel)}>{senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}</button>
            <button className="botao botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>{enviando ? 'Validando…' : 'Entrar'}</button>
          </form>}
          {modo === 'cadastro' && <form className="formulario-acesso" onSubmit={criarConta}>
            <label>Nome de usuário<input name="nomeUsuario" type="text" autoComplete="username" minLength="3" maxLength="32" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" required /></label>
            <label>E-mail<input name="email" type="email" autoComplete="email" maxLength="254" required /></label>
            <label>Senha (mínimo de 15 caracteres)<input name="senha" type={senhaVisivel ? 'text' : 'password'} autoComplete="new-password" minLength="15" maxLength="128" required /></label>
            <label>Confirmar senha<input name="confirmarSenha" type={senhaVisivel ? 'text' : 'password'} autoComplete="new-password" minLength="15" maxLength="128" required /></label>
            <button className="botao botao-secundario" type="button" onClick={() => definirSenhaVisivel(!senhaVisivel)}>{senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}</button>
            <button className="botao botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>{enviando ? 'Criando…' : 'Criar conta'}</button>
          </form>}
          {modo === 'recuperar' && <form className="formulario-acesso" onSubmit={recuperarSenha}>
            <label>E-mail da conta<input name="email" type="email" autoComplete="email" required /></label>
            <button className="botao botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>Enviar link de recuperação</button>
          </form>}
          {modo === 'redefinir' && <form className="formulario-acesso" onSubmit={redefinirSenha}>
            <label>Nova senha<input name="senha" type="password" autoComplete="new-password" minLength="15" maxLength="128" required /></label>
            <label>Confirmar nova senha<input name="confirmarSenha" type="password" autoComplete="new-password" minLength="15" maxLength="128" required /></label>
            <button className="botao botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>Salvar nova senha</button>
          </form>}
          {/* A confirmação facultativa só aparece após autenticação, dentro da conta. */}
          {modo === 'conta' && <section className="formulario-acesso" aria-label="Dados da conta">
            <p><strong>E-mail:</strong> {conta?.user?.email ?? 'Não disponível'}</p>
            <p><strong>Confirmação:</strong> {conta?.email_verificado_app ? 'Confirmado' : 'Opcional · ainda não solicitado'}</p>
            {!conta?.email_verificado_app && <button className="botao botao-primario" type="button" disabled={enviando} aria-busy={enviando || undefined} onClick={solicitarConfirmacaoEmail}>{enviando ? 'Enviando…' : 'Solicitar confirmação de e-mail'}</button>}
            {!conta?.restaurantes?.length && <p>Sua conta está ativa, mas o estoque ficará indisponível até o dono vincular você ao restaurante.</p>}
            <button className="botao botao-secundario" type="button" onClick={sairDaConta}>Sair da conta</button>
          </section>}
          {modo === 'confirmar' && <form className="formulario-acesso" onSubmit={confirmarEmail}>
            <button className="botao botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>{enviando ? 'Confirmando…' : 'Confirmar e-mail'}</button>
          </form>}
          {modo === 'resultado' && <p className="mensagem-acesso" role="status">{mensagem}</p>}
          {mensagem && modo !== 'resultado' && <p className="mensagem-acesso" role="alert">{mensagem}</p>}
          <nav className="acoes-acesso" aria-label="Ações de acesso">
            {modo === 'entrar' && <button type="button" onClick={() => { definirMensagem(''); definirModo('recuperar'); }}>Esqueci minha senha</button>}
            {modo !== 'entrar' && modo !== 'conta' && <button type="button" onClick={() => { definirMensagem(''); definirModo('entrar'); }}>Voltar para entrar</button>}
          </nav>
        </section>
      </dialog>
    </>
  );
}

// O build monta o React no espaço de acesso e preserva os links alternativos da landing.
const elemento = document.getElementById('acesso-visionchef');
const destino = elemento?.querySelector('#acesso-estoque')?.href ?? new URL('estoque/', window.location.href).href;
if (elemento) createRoot(elemento).render(<AcessoVisionChef destino={destino} />);
