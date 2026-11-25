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
function AcessoVisionChef({ destino }) {
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
    Boolean(tokenConfirmacao) || hash.get('type') === 'recovery' || hashBruto === '#cadastro' || hashBruto === '#recuperar',
  );
  const [senhaVisivel, definirSenhaVisivel] = useState(false);
  const envioEmCurso = useRef(false);
  const formulario = useRef(null);
  const dialogo = useRef(null);

  useEffect(() => {
    let paginaAtiva = true;
    (async () => {
      // A sessão libera o estoque quando há vínculo; sem vínculo ou via #minha-conta, abre a área da conta.
      const sessao = api.sessao ? await api.sessao() : null;
      const restaurantes = sessao?.restaurantes ?? await api.restaurantes();
      if (!paginaAtiva || envioEmCurso.current || formulario.current?.contains(document.activeElement)) return;
      if (sessao?.user) definirConta(sessao);
      if (restaurantes?.length) definirAcesso(true);
      const abrirConta = window.location.hash === '#minha-conta';
      if (sessao?.user && (!restaurantes?.length || abrirConta)) {
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
      definirModo(querCadastro ? 'cadastro' : conta ? 'conta' : 'entrar');
      definirDialogoAberto(true);
    };
    links.forEach((link) => link.addEventListener('click', abrir));
    return () => links.forEach((link) => link.removeEventListener('click', abrir));
  }, [temAcesso, conta, destino]);

  useEffect(() => {
    // Permite abrir cadastro, recuperação ou conta via hash (#cadastro, #recuperar, #minha-conta) sem recarregar.
    const aoMudarHash = () => {
      const atual = window.location.hash;
      if (atual === '#cadastro') { definirMensagem(''); definirModo('cadastro'); definirDialogoAberto(true); }
      else if (atual === '#recuperar') { definirMensagem(''); definirModo('recuperar'); definirDialogoAberto(true); }
      else if (atual === '#minha-conta' && conta) { definirMensagem(''); definirModo('conta'); definirDialogoAberto(true); }
    };
    window.addEventListener('hashchange', aoMudarHash);
    return () => window.removeEventListener('hashchange', aoMudarHash);
  }, [conta]);

  useEffect(() => {
    // O elemento nativo fornece foco contido, Escape e semântica de diálogo acessível.
    if (!dialogo.current) return;
    if (dialogoAberto && !dialogo.current.open) dialogo.current.showModal();
    if (!dialogoAberto) {
      definirSenhaVisivel(false);
      if (dialogo.current.open) dialogo.current.close();
    }
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
      await oferecerSalvarSenhaNavegador(identificador, senha);
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

  // Encerra a sessão atual ou todas as sessões abertas em outros dispositivos sem alterar vínculos.
  async function sairDaConta(escopo = 'local') {
    try {
      await api.sair(escopo);
      definirConta(null);
      definirAcesso(false);
      definirMensagem(escopo === 'global' ? 'Você saiu de todos os dispositivos.' : 'Você saiu da sua conta.');
      definirModo('resultado');
    } catch {
      definirMensagem('Não foi possível sair agora. Tente novamente.');
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
      definirMensagem(resultado?.mensagem ?? 'Enviamos um link de recuperação para o seu e-mail.');
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
          {/* Botão compacto de fechar no padrão visual verde arredondado do Cesta do Vale. */}
          <button className="botao-fechar-acesso" type="button" aria-label="Fechar acesso"
            onClick={() => definirDialogoAberto(false)}>×</button>
          <div className="marca-acesso">
            <span className="vc-pictorica vc-pictorica-modal" aria-hidden="true">
              <img src="Insumo%20vencendo%20na%20cozinha/imagens/visionchef-logo.jpg" width="1356" height="759" alt="" />
            </span>
            <p className="marca-acesso-titulo">VisionChef</p>
            <p className="marca-acesso-subtitulo">Acesso da equipe e do restaurante</p>
          </div>
          <hr className="divisor-acesso" />
          <header className="cabecalho-acesso">
            <p className="rotulo-acesso">Acesso ao sistema</p>
            <h2 id="titulo-acesso">{modo === 'entrar' ? 'Entre na sua conta' : modo === 'cadastro' ? 'Crie sua conta' : modo === 'recuperar' ? 'Recupere sua senha' : modo === 'redefinir' ? 'Escolha uma nova senha' : modo === 'conta' ? 'Minha conta' : modo === 'confirmar' ? 'Confirme seu e-mail' : 'Acesso ao VisionChef'}</h2>
            <p className="subtitulo-acesso">{modo === 'entrar' ? 'Acesse com seu usuário ou e-mail e sua senha.' : modo === 'cadastro' ? 'A confirmação do e-mail é opcional. O acesso ao estoque depende do vínculo do dono do restaurante.' : modo === 'recuperar' ? 'Informe o e-mail da sua conta para receber o link de redefinição.' : modo === 'conta' ? 'Gerencie a confirmação facultativa do seu endereço. Isso não concede acesso ao estoque.' : modo === 'confirmar' ? 'Abra esta página a partir do link enviado e confirme abaixo para concluir.' : 'A demonstração pública continua disponível na página.'}</p>
          </header>
          {modo === 'entrar' && <form className="formulario-acesso" method="post" autoComplete="on" ref={formulario} onSubmit={entrar}>
            <label>Usuário ou e-mail<input name="identificador" type="text" placeholder="Digite seu usuário ou e-mail" autoComplete="username" autoCapitalize="none" spellCheck={false} required /></label>
            <CampoSenha rotulo="Senha" name="senha" placeholder="Digite sua senha" autoComplete="current-password" required visivel={senhaVisivel} aoAlternar={() => definirSenhaVisivel(!senhaVisivel)} />
            <BotaoGlass className="botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>{enviando ? 'Validando…' : 'Entrar'}</BotaoGlass>
          </form>}
          {modo === 'cadastro' && <form className="formulario-acesso" onSubmit={criarConta}>
            <label>Nome de usuário<input name="nomeUsuario" type="text" placeholder="Digite seu nome de usuário" autoComplete="username" minLength="3" maxLength="32" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" required /></label>
            <label>E-mail<input name="email" type="email" placeholder="Digite seu e-mail" autoComplete="email" maxLength="254" required /></label>
            <CampoSenha rotulo="Senha (mínimo de 15 caracteres)" name="senha" placeholder="Crie sua senha" autoComplete="new-password" minLength="15" maxLength="128" required visivel={senhaVisivel} aoAlternar={() => definirSenhaVisivel(!senhaVisivel)} />
            <CampoSenha rotulo="Confirmar senha" name="confirmarSenha" placeholder="Repita sua senha" autoComplete="new-password" minLength="15" maxLength="128" required visivel={senhaVisivel} aoAlternar={() => definirSenhaVisivel(!senhaVisivel)} />
            <BotaoGlass className="botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>{enviando ? 'Criando…' : 'Criar conta'}</BotaoGlass>
          </form>}
          {modo === 'recuperar' && <form className="formulario-acesso" onSubmit={recuperarSenha}>
            <label>E-mail da conta<input name="email" type="email" placeholder="Digite o e-mail da sua conta" autoComplete="email" required /></label>
            <BotaoGlass className="botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>Enviar link de recuperação</BotaoGlass>
          </form>}
          {modo === 'redefinir' && <form className="formulario-acesso" onSubmit={redefinirSenha}>
            <CampoSenha rotulo="Nova senha" name="senha" placeholder="Digite a nova senha" autoComplete="new-password" minLength="15" maxLength="128" required visivel={senhaVisivel} aoAlternar={() => definirSenhaVisivel(!senhaVisivel)} />
            <CampoSenha rotulo="Confirmar nova senha" name="confirmarSenha" placeholder="Repita a nova senha" autoComplete="new-password" minLength="15" maxLength="128" required visivel={senhaVisivel} aoAlternar={() => definirSenhaVisivel(!senhaVisivel)} />
            <BotaoGlass className="botao-primario" type="submit" disabled={enviando} aria-busy={enviando || undefined}>Salvar nova senha</BotaoGlass>
          </form>}
          {/* A confirmação facultativa só aparece após autenticação, dentro da conta. */}
          {modo === 'conta' && <section className="formulario-acesso" aria-label="Dados da conta">
            <p><strong>E-mail:</strong> {conta?.user?.email ?? 'Não disponível'}</p>
            <p><strong>Confirmação:</strong> {conta?.email_verificado_app ? 'Confirmado' : 'Opcional · ainda não solicitado'}</p>
            {!conta?.email_verificado_app && <BotaoGlass className="botao-primario" type="button" disabled={enviando} aria-busy={enviando || undefined} onClick={solicitarConfirmacaoEmail}>{enviando ? 'Enviando…' : 'Solicitar confirmação de e-mail'}</BotaoGlass>}
            {!conta?.restaurantes?.length && <p>Sua conta está ativa, mas o estoque ficará indisponível até o dono vincular você ao restaurante.</p>}
            <BotaoGlass className="botao-secundario" type="button" onClick={() => sairDaConta('local')}>Sair da conta</BotaoGlass>
            <BotaoGlass className="botao-secundario danger" type="button" onClick={() => sairDaConta('global')}>Sair de todos os dispositivos</BotaoGlass>
          </section>}
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
          {modo !== 'entrar' && modo !== 'conta' && <nav className="acoes-acesso" aria-label="Ações de acesso">
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
if (elemento) createRoot(elemento).render(<AcessoVisionChef destino={destino} />);

const fundoHorizonte = document.getElementById('hero-horizon-bloom');
if (fundoHorizonte) createRoot(fundoHorizonte).render(<HorizonBloom />);
