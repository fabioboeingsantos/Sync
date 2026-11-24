import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api.js';

// Este módulo conecta a landing da Sync aos fluxos de sessão, cadastro e recuperação do VisionChef.
function AcessoVisionChef({ destino }) {
  const [temAcesso, definirAcesso] = useState(false);
  const [enviando, definirEnvio] = useState(false);
  const [mensagem, definirMensagem] = useState('');
  const [modo, definirModo] = useState(new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery' ? 'redefinir' : 'entrar');
  const [dialogoAberto, definirDialogoAberto] = useState(new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery');
  const [senhaVisivel, definirSenhaVisivel] = useState(false);
  const envioEmCurso = useRef(false);
  const formulario = useRef(null);
  const dialogo = useRef(null);

  useEffect(() => {
    let paginaAtiva = true;
    api.restaurantes().then((restaurantes) => {
      // Uma sessão só libera o atalho do estoque se o usuário já tiver vínculo ativo.
      if (paginaAtiva && restaurantes?.length && !envioEmCurso.current &&
          !formulario.current?.contains(document.activeElement)) definirAcesso(true);
    }).catch(() => {
      // O formulário continua disponível se a consulta de sessão falhar.
    });
    return () => { paginaAtiva = false; };
  }, []);

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

  // Autentica a conta e exige vínculo ativo antes de abrir o estoque real.
  async function entrar(evento) {
    evento.preventDefault();
    if (envioEmCurso.current) return;
    const { identificador, senha } = Object.fromEntries(new FormData(evento.currentTarget));
    envioEmCurso.current = true;
    definirEnvio(true);
    definirMensagem('');
    try {
      await api.entrar(identificador, senha);
      const restaurantes = await api.restaurantes();
      if (!restaurantes?.length) {
        // Uma conta sem vínculo não recebe acesso; a sessão é encerrada até a aprovação do dono.
        await api.sair();
        definirMensagem('Conta autenticada, mas ainda sem acesso a um restaurante. Solicite a liberação ao dono.');
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
      // O backend não cria sessão pública no cadastro; exige confirmação e vínculo pelo dono.
      await api.criarConta({ nomeUsuario: dados.nomeUsuario, email: dados.email, senha: dados.senha });
      definirMensagem('Conta criada. Confirme o e-mail, se solicitado, e peça ao dono do restaurante para liberar seu acesso.');
      definirModo('resultado');
    } catch {
      definirMensagem('Não foi possível criar a conta. Confira os dados ou tente outro usuário e e-mail.');
    } finally {
      envioEmCurso.current = false;
      definirEnvio(false);
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

  if (temAcesso) return <a className="botao botao-primario" href={destino}>Abrir estoque</a>;

  return (
    <>
      <a className="botao botao-primario" id="acesso-estoque" href="#prototipos"
        onClick={() => { definirModo('entrar'); definirDialogoAberto(true); }}>Entrar no VisionChef</a>
      <button className="botao botao-secundario botao-criar-conta" type="button"
        onClick={() => { definirMensagem(''); definirModo('cadastro'); definirDialogoAberto(true); }}>Criar conta</button>
      <dialog className="dialogo-acesso-sync" ref={dialogo} aria-labelledby="titulo-acesso"
        onCancel={(evento) => { evento.preventDefault(); definirDialogoAberto(false); }}
        onClick={(evento) => { if (evento.target === dialogo.current) definirDialogoAberto(false); }}>
        <section className="cartao-acesso">
          <button className="botao-fechar-acesso" type="button" aria-label="Fechar acesso"
            onClick={() => definirDialogoAberto(false)}>×</button>
          <header className="cabecalho-acesso">
            <p className="rotulo-acesso">Sync · VisionChef</p>
            <h2 id="titulo-acesso">{modo === 'entrar' ? 'Entre na sua conta' : modo === 'cadastro' ? 'Crie sua conta' : modo === 'recuperar' ? 'Recupere sua senha' : modo === 'redefinir' ? 'Escolha uma nova senha' : 'Acesso ao VisionChef'}</h2>
            <p>{modo === 'cadastro' ? 'Sua conta só terá acesso ao estoque depois que o dono vincular você ao restaurante.' : 'A demonstração pública continua disponível na página, sem entrar na conta do restaurante.'}</p>
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
          {modo === 'resultado' && <p className="mensagem-acesso" role="status">{mensagem}</p>}
          {mensagem && modo !== 'resultado' && <p className="mensagem-acesso" role="alert">{mensagem}</p>}
          <nav className="acoes-acesso" aria-label="Ações de acesso">
            {modo === 'entrar' && <>
              <button type="button" onClick={() => { definirMensagem(''); definirModo('cadastro'); }}>Criar conta</button>
              <button type="button" onClick={() => { definirMensagem(''); definirModo('recuperar'); }}>Esqueci minha senha</button>
            </>}
            {modo !== 'entrar' && <button type="button" onClick={() => { definirMensagem(''); definirModo('entrar'); }}>Voltar para entrar</button>}
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
