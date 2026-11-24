import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api.js';

function AcessoVisionChef({ destino }) {
  const [temAcesso, definirAcesso] = useState(false);
  const [enviando, definirEnvio] = useState(false);
  const [mensagem, definirMensagem] = useState('');
  const envioEmCurso = useRef(false);
  const formulario = useRef(null);

  useEffect(() => {
    let paginaAtiva = true;
    api.restaurantes().then((restaurantes) => {
      // Se a pessoa já começou a digitar, mantém o formulário mesmo que exista uma sessão anterior.
      if (paginaAtiva && restaurantes?.length && !envioEmCurso.current &&
          !formulario.current?.contains(document.activeElement)) {
        definirAcesso(true);
      }
    }).catch(() => {
      // A consulta da sessão é opcional. O formulário continua disponível em caso de falha.
    });
    return () => { paginaAtiva = false; };
  }, []);

  async function entrar(evento) {
    evento.preventDefault();
    if (envioEmCurso.current) return;
    const { identificador, senha } = Object.fromEntries(new FormData(evento.currentTarget));
    // A referência bloqueia envios repetidos antes de o React atualizar o estado do botão.
    envioEmCurso.current = true;
    definirEnvio(true);
    definirMensagem('');

    try {
      await api.entrar(identificador, senha);
      // O estoque usa a sessão criada aqui e confere o vínculo com o restaurante.
      window.location.assign(destino);
    } catch (erro) {
      if (erro.status === 429) {
        definirMensagem('Muitas tentativas. Aguarde e tente novamente.');
      } else if (erro.status === 401 || erro.code === 'invalid_credentials') {
        definirMensagem('Confira o usuário ou e-mail e a senha e tente novamente.');
      } else {
        definirMensagem('Não foi possível entrar agora. Tente novamente.');
      }
      envioEmCurso.current = false;
      definirEnvio(false);
    }
  }

  if (temAcesso) {
    return <a className="botao botao-primario" href={destino}>Abrir estoque</a>;
  }

  return (
    <form className="login-form" id="login-piloto" method="post" aria-label="Entrar no VisionChef"
      ref={formulario} onSubmit={entrar}>
      <label>
        Usuário ou e-mail
        <input name="identificador" type="text" autoComplete="username" autoCapitalize="none"
          spellCheck={false} required />
      </label>
      <label>
        Senha
        <input name="senha" type="password" autoComplete="current-password" required />
      </label>
      <p id="login-feedback" className="login-feedback" role="alert">{mensagem}</p>
      <button type="submit" className="botao botao-primario" disabled={enviando}
        aria-busy={enviando || undefined}>Entrar</button>
    </form>
  );
}

// Preserva a ligação estática até o componente assumir somente a área de acesso da landing.
const elemento = document.getElementById('acesso-visionchef');
const destino = elemento?.querySelector('#acesso-estoque')?.href;
if (destino) createRoot(elemento).render(<AcessoVisionChef destino={destino} />);
