import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api.js';
import GlassSurface from './components/GlassSurface.jsx';
import HorizonBloom from './components/HorizonBloom.jsx';

// Encapsula botões React em GlassSurface preservando a semântica nativa de <button>, submit e aria-busy.
function BotaoGlass({ className = '', height = 50, children, ...props }) {
  return (
    <GlassSurface
      width="100%"
      height={height}
      borderRadius={12}
      distortionScale={-180}
      displace={0.5}
      backgroundOpacity={0.1}
      blur={11}
      saturation={1.25}
      className="glass-botao-wrap"
    >
      <button {...props} className={`botao ${className}`.trim()}>
        {children}
      </button>
    </GlassSurface>
  );
}

// Exibe o campo de senha com botão compacto de olho em alto contraste dentro do próprio input.
function CampoSenha({ rotulo, visivel, aoAlternar, ...props }) {
  return (
    <label>
      {rotulo}
      <span className="campo-senha-sync">
        <input {...props} type={visivel ? 'text' : 'password'} />
        <button
          className="botao-olho-senha"
          type="button"
          onClick={aoAlternar}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visivel}
        >
          {visivel ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.73-2.08 2.02-3.88 3.69-5.22" />
              <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.05 11.05 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <path d="M1 1l22 22" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </span>
    </label>
  );
}

// Oferece ao gerenciador nativo do navegador a opção Salvar/Nunca sem jamais gravar senha no site.
async function oferecerSalvarSenhaNavegador(identificador, senha) {
  try {
    if (typeof window.PasswordCredential !== 'function' || !navigator.credentials?.store) return;
    const credencial = new window.PasswordCredential({
      id: String(identificador ?? '').trim(),
      password: String(senha ?? ''),
    });
    await navigator.credentials.store(credencial);
  } catch {
    // Alguns navegadores ignoram a API ou bloqueiam por política; o fluxo de login segue normalmente.
  }
}

// Este módulo conecta a landing da Sync aos fluxos de sessão, cadastro e recuperação do VisionChef.
function AcessoVisionChef({ destino, somenteFluxosDiretos = false }) {
  const hashBruto = window.location.hash;
  const hash = new URLSearchParams(hashBruto.slice(1));
  const tokenConfirmacao = hash.get('confirmar-email') ?? '';
  const modoInicialHash = tokenConfirmacao ? 'confirmar'
    : hash.get('type') === 'recovery' ? 'redefinir'
      : hashBruto === '#cadastro' ? 'cadastro'
        : hashBruto === '#recuperar' ? 'recuperar'
          : 'entrar';
  const [temAcesso, definirAcesso] = useState(false);
  const [enviando, definirEnvio] = useState(false);
  const [mensagem, definirMensagem] = useState('');
  const [conta, definirConta] = useState(null);
  const [modo, definirModo] = useState(modoInicialHash);
  const [dialogoAberto, definirDialogoAberto] = useState(
    Boolean(tokenConfirmacao) || hash.get('type') === 'recovery' || ['#cadastro', '#recuperar', '#configurar-restaurante'].includes(hashBruto),
  );
  const configurandoRestaurante = ['restaurante', 'criar-restaurante', 'entrar-equipe'].includes(modo);
  const [senhaVisivel, definirSenhaVisivel] = useState(false);
  const envioEmCurso = useRef(false);
  const formulario = useRef(null);
  const dialogo = useRef(null);

  useEffect(() => {
    let paginaAtiva = true;
    (async () => {
      // A configuração só abre para uma sessão autenticada que ainda não tem restaurante.
      const sessao = api.sessao ? await api.sessao() : null;
      const restaurantes = sessao?.restaurantes ?? await api.restaurantes();
      if (!paginaAtiva || envioEmCurso.current || formulario.current?.contains(document.activeElement)) return;
      if (sessao?.user) definirConta(sessao);
      if (restaurantes?.length) definirAcesso(true);
      const hashAtual = window.location.hash;
      const abrirConta = hashAtual === '#minha-conta';
      const abrirConfiguracao = !restaurantes?.length && !tokenConfirmacao && hash.get('type') !== 'recovery';
      if (sessao?.user && abrirConta) {
        // Mantém atalhos antigos compatíveis, mas Minha conta agora sempre é uma página independente.
        window.location.assign('/conta/');
        return;
      }
      if (sessao?.user && abrirConfiguracao) {
        definirModo('restaurante');
        definirDialogoAberto(true);
      } else if (restaurantes?.length && hashAtual === '#configurar-restaurante') {
        window.location.assign(destino);
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
    // Reaproveita os links da página: com sessão ativa no restaurante, leva direto ao estoque sem pedir login de novo.
    const links = document.querySelectorAll('a[href="#prototipos"]');
    const abrir = (evento) => {
      evento.preventDefault();
      const querCadastro = evento.currentTarget.dataset.modoAcesso === 'cadastro';
      if (temAcesso && !querCadastro) {
        window.location.assign(destino);
        return;
      }
      definirMensagem('');
      // Cada CTA pode abrir o mesmo diálogo diretamente no fluxo de entrada ou cadastro.
      definirModo(conta ? (temAcesso ? 'conta' : 'restaurante') : querCadastro ? 'cadastro' : 'entrar');
      definirDialogoAberto(true);
    };
    links.forEach((link) => link.addEventListener('click', abrir));
    return () => links.forEach((link) => link.removeEventListener('click', abrir));
  }, [temAcesso, conta, destino]);

  useEffect(() => {
    // Preserva os atalhos para a conta e para o primeiro acesso ao estoque.
    const aoMudarHash = () => {
      const atual = window.location.hash;
      if (atual === '#cadastro') { definirMensagem(''); definirModo('cadastro'); definirDialogoAberto(true); }
      else if (atual === '#recuperar') { definirMensagem(''); definirModo('recuperar'); definirDialogoAberto(true); }
      else if (atual === '#minha-conta' && conta) window.location.assign('/conta/');
      else if (atual === '#configurar-restaurante') {
        if (temAcesso) { window.location.assign(destino); return; }
        definirMensagem(''); definirModo(conta ? 'restaurante' : 'entrar'); definirDialogoAberto(true);
      }
    };
    window.addEventListener('hashchange', aoMudarHash);
    return () => window.removeEventListener('hashchange', aoMudarHash);
  }, [conta, destino, temAcesso]);

  useEffect(() => {
    // O elemento nativo fornece foco contido, Escape e semântica de diálogo acessível.
    if (!dialogo.current) return;
    if (dialogoAberto && !dialogo.current.open) dialogo.current.showModal();
    if (!dialogoAberto) {
      definirSenhaVisivel(false);
      if (dialogo.current.open) dialogo.current.close();
    }
  }, [dialogoAberto]);

  useEffect(() => {
    // Anuncia o novo passo quando o diálogo troca de tela sem recarregar a página.
    if (dialogoAberto && configurandoRestaurante) dialogo.current?.querySelector('#titulo-acesso')?.focus();
  }, [dialogoAberto, configurandoRestaurante, modo]);

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
      await oferecerSalvarSenhaNavegador(identificador, senha);
      const sessao = api.sessao ? await api.sessao() : null;
      const restaurantes = sessao?.restaurantes ?? await api.restaurantes();
      if (!restaurantes?.length) {
        // O primeiro acesso oferece ações concretas para criar o restaurante ou receber o vínculo.
        if (sessao?.user) definirConta(sessao);
        definirMensagem(sessao?.user ? '' : 'Entre novamente para configurar o acesso ao estoque.');
        definirModo(sessao?.user ? 'restaurante' : 'resultado');
        return;
      }
      window.location.assign(destino);
    } catch (erro) {
      definirMensagem(erro.status === 429
        ? 'Muitas tentativas. Aguarde e tente novamente.'
        : erro.code === 'email_not_confirmed'
          ? erro.message
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
    if (dados.senha.length < 6) {
      definirMensagem('Use uma senha com pelo menos 6 caracteres.');
      return;
    }
    envioEmCurso.current = true;
    definirEnvio(true);
    definirMensagem('');
    try {
      // Só oferece a configuração de restaurante depois de confirmar que a sessão foi aberta.
      const resultado = await api.criarConta({ nomeUsuario: dados.nomeUsuario, email: dados.email, senha: dados.senha });
      if (resultado.autenticado && api.sessao) {
        const sessao = await api.sessao();
        if (sessao?.user) {
          definirConta(sessao);
          definirMensagem('Conta criada. Escolha como você quer acessar o estoque.');
          definirModo('restaurante');
          return;
        }
      }
      definirMensagem(resultado.mensagem ?? 'Conta criada. Entre para configurar seu acesso ao estoque.');
      definirModo('resultado');
    } catch (erro) {
      // Mostra a orientação retornada pela API para senha, domínio e limite de tentativas.
      definirMensagem(erro.status === 400 || erro.status === 429 || erro.code === 'consulta_email_indisponivel'
        ? erro.message
        : 'Não foi possível criar a conta. Confira os dados ou tente outro usuário e e-mail.');
    } finally {
      envioEmCurso.current = false;
      definirEnvio(false);
    }
  }

  // Os dois caminhos só enviam ao estoque após a criação do vínculo ou a leitura de um vínculo ativo.
  async function configurarRestaurante(evento) {
    evento.preventDefault();
    if (envioEmCurso.current) return;
    const nome = new FormData(evento.currentTarget).get('nome')?.trim();
    if (!nome || nome.length < 2) {
      definirMensagem('Informe o nome do restaurante com pelo menos 2 caracteres.');
      return;
    }
    envioEmCurso.current = true;
    definirEnvio(true);
    definirMensagem('');
    try {
      await api.criarRestaurante(nome);
      window.location.assign(destino);
    } catch (erro) {
      definirMensagem(erro.status === 400 || erro.status === 409 ? erro.message : 'Não foi possível criar o restaurante agora. Tente novamente.');
    } finally {
      envioEmCurso.current = false;
      definirEnvio(false);
    }
  }

  async function verificarVinculo() {
    if (envioEmCurso.current) return;
    envioEmCurso.current = true;
    definirEnvio(true);
    definirMensagem('');
    try {
      const sessao = await api.sessao();
      if (!sessao?.user) {
        definirConta(null);
        definirModo('entrar');
        definirMensagem('Sua sessão expirou. Entre novamente.');
      } else if (sessao.restaurantes?.length) {
        window.location.assign(destino);
      } else {
        definirMensagem('O acesso ainda aguarda liberação na seção Equipe do restaurante.');
      }
    } catch {
      definirMensagem('Não foi possível verificar o acesso agora. Tente novamente.');
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

  // Solicita recuperação e exibe retorno claro quando a conta existe ou não está cadastrada.
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
      const resultado = await api.recuperarSenha(email);
      definirMensagem(resultado?.mensagem ?? 'Enviamos um link de recuperação. Ele costuma chegar em alguns minutos. Confira a caixa de entrada e também Spam/Lixo eletrônico, Promoções ou Atualizações.');
      definirModo('resultado');
    } catch (erro) {
      if (erro.status === 404 || erro.status === 400 || erro.status === 429) {
        definirMensagem(erro.message);
      } else {
        definirMensagem('Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.');
      }
    } finally {
      envioEmCurso.current = false;
      definirEnvio(false);
    }
  }

  // Atualiza a senha somente com a sessão temporária aberta pelo link de recuperação.
  async function redefinirSenha(evento) {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(evento.currentTarget));
    if (dados.senha.length < 6 || dados.senha !== dados.confirmarSenha) {
      definirMensagem(dados.senha.length < 6 ? 'Use uma senha com pelo menos 6 caracteres.' : 'As senhas não coincidem.');
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

  const [titulo, subtitulo] = {
    entrar: ['Entre na sua conta', 'Acesse com seu usuário ou e-mail e sua senha.'],
    cadastro: ['Crie sua conta', api.modoLocal ? 'Use dados fictícios para testar o cadastro local.' : 'Depois do cadastro, escolha como acessar o estoque.'],
    restaurante: ['Como você quer acessar o estoque?', 'Escolha o caminho que corresponde à sua função no restaurante.'],
    'criar-restaurante': ['Criar meu restaurante', 'Você será o dono do novo restaurante e poderá liberar acesso à sua equipe.'],
    'entrar-equipe': ['Entrar em uma equipe', 'O dono do restaurante precisa liberar seu acesso usando o e-mail da sua conta.'],
    recuperar: ['Recupere sua senha', 'Informe o e-mail da sua conta para receber o link de redefinição.'],
    redefinir: ['Escolha uma nova senha', 'Informe e confirme a nova senha da sua conta.'],
    confirmar: ['Confirme seu e-mail', 'Abra esta página a partir do link enviado e confirme abaixo para concluir.'],
  }[modo] ?? ['Acesso ao VisionChef', ''];

  return (
    <>
      {!somenteFluxosDiretos && (temAcesso ? <>
        <a className="botao botao-primario" id="acesso-estoque" href={destino}>Abrir estoque</a>
        {/* A área pessoal abre numa página própria, em vez de interromper a landing com um diálogo. */}
        <a className="botao botao-secundario" href="/conta/">Minha conta</a>
      </> : <>
        <a className="botao botao-primario" id="acesso-estoque" href="#prototipos"
          onClick={() => { definirMensagem(''); definirModo(conta ? 'restaurante' : 'entrar'); definirDialogoAberto(true); }}>{conta ? 'Configurar acesso' : 'Entrar no VisionChef'}</a>
        {!conta && <button className="botao botao-secundario botao-criar-conta" type="button"
          onClick={() => { definirMensagem(''); definirModo('cadastro'); definirDialogoAberto(true); }}>Criar conta</button>}
      </>)}
      <dialog className={`dialogo-acesso-sync${["entrar", "cadastro"].includes(modo) ? " acesso-inicial" : ""}`} ref={dialogo} aria-labelledby="titulo-acesso"
        onCancel={(evento) => { evento.preventDefault(); definirDialogoAberto(false); }}
        onClick={(evento) => { if (evento.target === dialogo.current) definirDialogoAberto(false); }}>
        <section className="cartao-acesso">
          {/* Botão compacto de fechar no padrão visual verde arredondado do Cesta do Vale. */}
          <button className="botao-fechar-acesso" type="button" aria-label="Fechar acesso"
            onClick={() => definirDialogoAberto(false)}>×</button>
          <div className="marca-acesso">
            <span className="vc-pictorica vc-pictorica-modal" aria-hidden="true">
              <img src="Insumo%20vencendo%20na%20cozinha/imagens/visionchef-logo.jpg" width="1356" height="759" alt="" />
            </span>
            <p className="marca-acesso-titulo">VisionChef</p>

          </div>
          <hr className="divisor-acesso" />
          <header className="cabecalho-acesso">
            <p className="rotulo-acesso">Acesso ao sistema</p>
            <h2 id="titulo-acesso" tabIndex={-1}>{titulo}</h2>
            {subtitulo && <p className="subtitulo-acesso">{subtitulo}</p>}
          </header>
          {modo === 'entrar' && <form className="formulario-acesso" method="post" autoComplete="on" ref={formulario} onSubmit={entrar}>
            <label>Usuário ou e-mail<input name="identificador" type="text" placeholder="Digite seu usuário ou e-mail" autoComplete="username" autoCapitalize="none" spellCheck={false} required /></label>
            <CampoSenha rotulo="Senha" name="senha" placeholder="Digite sua senha" autoComplete="current-password" required visivel={senhaVisivel} aoAlternar={() => definirSenhaVisivel(!senhaVisivel)} />
            <BotaoGlass className="botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>{enviando ? 'Validando…' : 'Entrar'}</BotaoGlass>
          </form>}
          {modo === 'cadastro' && <form className="formulario-acesso" onSubmit={criarConta}>
            <label>Nome de usuário<input name="nomeUsuario" type="text" placeholder="Digite seu nome de usuário" autoComplete="username" minLength="3" maxLength="32" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" required /></label>
            <label>E-mail<input name="email" type="email" placeholder="Digite seu e-mail" autoComplete="email" maxLength="254" required /></label>
            <CampoSenha rotulo="Senha (mínimo de 6 caracteres)" name="senha" placeholder="Crie sua senha" autoComplete="new-password" minLength="6" maxLength="128" required visivel={senhaVisivel} aoAlternar={() => definirSenhaVisivel(!senhaVisivel)} />
            <CampoSenha rotulo="Confirmar senha" name="confirmarSenha" placeholder="Repita sua senha" autoComplete="new-password" minLength="6" maxLength="128" required visivel={senhaVisivel} aoAlternar={() => definirSenhaVisivel(!senhaVisivel)} />
            <BotaoGlass className="botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>{enviando ? 'Criando…' : 'Criar conta'}</BotaoGlass>
          </form>}
          {/* O primeiro acesso diferencia a criação de um restaurante da autorização de um funcionário. */}
          {modo === 'restaurante' && <div className="primeiro-acesso-opcoes">
            <article className="primeiro-acesso-opcao">
              <h3>Sou dono</h3>
              <p>Crie o restaurante e gerencie o estoque e os acessos da equipe.</p>
              <BotaoGlass className="botao-primario" type="button" onClick={() => { definirMensagem(''); definirModo('criar-restaurante'); }}>Criar meu restaurante</BotaoGlass>
            </article>
            <article className="primeiro-acesso-opcao">
              <h3>Sou funcionário</h3>
              <p>Peça ao dono para liberar seu e-mail. Depois, entre para acessar o estoque.</p>
              <BotaoGlass className="botao-secundario" type="button" onClick={() => { definirMensagem(''); definirModo('entrar-equipe'); }}>Entrar em uma equipe</BotaoGlass>
            </article>
            <a className="botao botao-secundario primeiro-acesso-conta" href="/conta/">Minha conta</a>
          </div>}
          {modo === 'criar-restaurante' && <form className="formulario-acesso" onSubmit={configurarRestaurante}>
            <label>Nome do restaurante<input name="nome" type="text" autoComplete="organization" minLength={2} maxLength={120} required /></label>
            <BotaoGlass className="botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>{enviando ? 'Criando…' : 'Criar restaurante e abrir estoque'}</BotaoGlass>
          </form>}
          {modo === 'entrar-equipe' && <div className="formulario-acesso">
            <p>Peça ao dono para abrir <strong>Equipe → Liberar acesso</strong> e informar <strong>{conta?.user?.email ?? 'o e-mail usado no seu cadastro'}</strong>.</p>
            <BotaoGlass className="botao-primario" type="button" disabled={enviando} aria-busy={enviando || undefined} onClick={verificarVinculo}>{enviando ? 'Verificando…' : 'Verificar meu acesso'}</BotaoGlass>
          </div>}
          {modo === 'recuperar' && <form className="formulario-acesso" onSubmit={recuperarSenha}>
            <label>E-mail da conta<input name="email" type="email" placeholder="Digite o e-mail da sua conta" autoComplete="email" required /></label>
            <BotaoGlass className="botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>Enviar link de recuperação</BotaoGlass>
          </form>}
          {modo === 'redefinir' && <form className="formulario-acesso" onSubmit={redefinirSenha}>
            {/* Mostra o mesmo mínimo obrigatório do cadastro antes de a pessoa digitar. */}
            <CampoSenha rotulo="Nova senha (mínimo de 6 caracteres)" name="senha" placeholder="Digite a nova senha" autoComplete="new-password" minLength="6" maxLength="128" required visivel={senhaVisivel} aoAlternar={() => definirSenhaVisivel(!senhaVisivel)} />
            <CampoSenha rotulo="Confirmar nova senha" name="confirmarSenha" placeholder="Repita a nova senha" autoComplete="new-password" minLength="6" maxLength="128" required visivel={senhaVisivel} aoAlternar={() => definirSenhaVisivel(!senhaVisivel)} />
            <BotaoGlass className="botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>Salvar nova senha</BotaoGlass>
          </form>}
          {modo === 'confirmar' && <form className="formulario-acesso" onSubmit={confirmarEmail}>
            <BotaoGlass className="botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>{enviando ? 'Confirmando…' : 'Confirmar e-mail'}</BotaoGlass>
          </form>}
          {modo === 'resultado' && <p className="mensagem-acesso" role="status">{mensagem}</p>}
          {mensagem && modo !== 'resultado' && <p className="mensagem-acesso" role="alert">{mensagem}</p>}
          {modo === 'entrar' && <nav className="acoes-acesso acoes-acesso-dupla" aria-label="Ações de acesso">
            {/* Mantém hierarquia subordinada ao Entrar (42px em 1 linha), sem opção de reenvio de confirmação. */}
            <BotaoGlass height={42} className="botao-primario acao-link-acesso" type="button" onClick={() => { definirMensagem(''); definirModo('cadastro'); }}>Criar conta</BotaoGlass>
            <BotaoGlass height={42} className="botao-primario acao-link-acesso" type="button" onClick={() => { definirMensagem(''); definirModo('recuperar'); }}>Esqueci minha senha</BotaoGlass>
          </nav>}
          {configurandoRestaurante && modo !== 'restaurante' && <nav className="acoes-acesso" aria-label="Opções de restaurante">
            <BotaoGlass className="botao-secundario" type="button" disabled={enviando} onClick={() => { definirMensagem(''); definirModo('restaurante'); }}>Voltar às opções</BotaoGlass>
          </nav>}
          {!configurandoRestaurante && modo !== 'entrar' && <nav className="acoes-acesso" aria-label="Ações de acesso">
            <BotaoGlass className="botao-secundario" type="button" onClick={() => { definirMensagem(''); definirModo('entrar'); }}>Voltar para entrar</BotaoGlass>
          </nav>}
        </section>
      </dialog>
    </>
  );
}

// O build monta o React no espaço de acesso e no fundo decorativo Horizon Bloom da abertura.
const elemento = document.getElementById('acesso-visionchef');
const destino = elemento?.querySelector('#acesso-estoque')?.href ?? new URL('estoque/', window.location.href).href;
if (elemento) createRoot(elemento).render(<AcessoVisionChef destino={destino} somenteFluxosDiretos={elemento.hasAttribute('data-somente-fluxos-diretos')} />);

const fundoHorizonte = document.getElementById('hero-horizon-bloom');
if (fundoHorizonte) createRoot(fundoHorizonte).render(<HorizonBloom />);
