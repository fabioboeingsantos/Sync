import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arquivosPublicos, montarPiloto, raiz } from './build.mjs';
import {
  abrirBancoLocal, autenticarContaLocal, cadastrarLote, comoUsuario, corrigirValidade, criarContaLocal,
  listarEquipe, listarEstoque, listarRestaurantes, listarDescartes, redefinirSenhaLocal,
  registrarAbertura, registrarSaida, removerMembro, vincularMembro,
} from './banco-local.mjs';

// O servidor de desenvolvimento atende apenas os arquivos públicos listados aqui e as rotas de teste.
const tipos = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4',
};
const arquivos = new Map([
  ...arquivosPublicos.map((arquivo) => [encodeURI(`/${arquivo}`), arquivo]),
  ['/index.html', 'index.html'],
  ['/', 'index.html'],
  ['/estoque/', 'estoque/index.html'],
  ['/estoque/index.html', 'estoque/index.html'],
  ['/equipe/', 'equipe/index.html'],
  ['/equipe/index.html', 'equipe/index.html'],
  ['/estoque.js', 'estoque.js'],
  ['/equipe.js', 'equipe.js'],
  ['/interpretar-lote.js', 'interpretar-lote.js'],
  ['/interpretar-nfe.js', 'interpretar-nfe.js'],
  ['/entrada.js', 'entrada.js'],
  ['/api.js', 'api.js'],
  ['/css/estoque.css', 'css/estoque.css'],
]);

async function lerJson(req) {
  let corpo = '';
  for await (const trecho of req.setEncoding('utf8')) {
    corpo += trecho;
    if (corpo.length > 4096) throw new RangeError('Corpo da solicitação muito grande.');
  }
  return JSON.parse(corpo);
}

function json(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
}

export function criarServidorLocal(banco, pastaPublica) {
  // As sessões fictícias ficam em memória e expiram independentemente dos dados do estoque.
  const sessoes = new Map();
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Restringe este servidor de teste ao próprio computador e rejeita envios de outras origens.
    const origem = `http://127.0.0.1:${req.socket.localPort}`;
    if (`http://${req.headers.host}` !== origem ||
        (req.method === 'POST' && req.headers.origin && req.headers.origin !== origem)) {
      json(res, 403, { erro: 'Origem inválida.' });
      return;
    }

    const url = new URL(req.url, origem);
    const arquivo = arquivos.get(url.pathname);
    try {
      // O endereço da pasta mantém os links relativos das telas de estoque e equipe consistentes.
      if (req.method === 'GET' && (url.pathname === '/estoque' || url.pathname === '/equipe')) {
        res.writeHead(308, { Location: `${url.pathname}/${url.search}` });
        res.end();
        return;
      }
      if (req.method === 'GET' && arquivo) {
        const conteudo = await readFile(resolve(pastaPublica, arquivo));
        res.writeHead(200, { 'Content-Type': tipos[extname(arquivo)] });
        res.end(conteudo);
        return;
      }

      const sessao = req.headers.cookie?.match(/(?:^|;\s*)visionchef_demo=([0-9a-f]{64})(?:;|$)/)?.[1];
      const conta = sessoes.get(sessao);

      if (req.method === 'POST' && url.pathname === '/demo/entrar') {
        const { identificador, senha } = (await lerJson(req)) ?? {};
        // Valida credenciais somente contra o hash armazenado no banco local (com lazy rehash automático).
        const identidade = await autenticarContaLocal(banco, identificador, senha);
        if (!identidade) {
          json(res, 401, { erro: 'Confira o usuário ou e-mail e a senha de teste.' });
          return;
        }
        sessoes.delete(sessao);
        const token = randomBytes(32).toString('hex');
        sessoes.set(token, { id: identidade.id, expira: Date.now() + 7 * 86_400_000 });
        res.setHeader('Set-Cookie', `visionchef_demo=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
        json(res, 200, { autenticado: true });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/demo/cadastrar') {
        const { nomeUsuario, email, senha } = (await lerJson(req)) ?? {};
        try {
          const criada = await criarContaLocal(banco, { nomeUsuario, email, senha });
          json(res, 201, { criada: true, usuario: criada.nome });
        } catch (erroCadastro) {
          const status = erroCadastro.status ?? (erroCadastro.code === '23505' ? 409 : 400);
          json(res, status, { erro: status === 409 ? 'Usuário ou e-mail já cadastrado.' : 'Confira o usuário, o e-mail e a senha.' });
        }
        return;
      }

      if (req.method === 'POST' && url.pathname === '/demo/sair') {
        const dados = await lerJson(req).catch(() => ({}));
        const escopo = dados?.escopo === 'global' ? 'global' : 'local';
        if (escopo === 'global' && conta?.id) {
          // Encerra todas as sessões ativas da conta em outros navegadores/dispositivos.
          for (const [chaveSessao, dadosSessao] of sessoes.entries()) {
            if (dadosSessao.id === conta.id) sessoes.delete(chaveSessao);
          }
        } else {
          sessoes.delete(sessao);
        }
        res.setHeader('Set-Cookie', 'visionchef_demo=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
        json(res, 200, { autenticado: false, escopo });
        return;
      }

      if (!conta || conta.expira <= Date.now()) {
        sessoes.delete(sessao);
        json(res, 401, { erro: 'Entre novamente para acessar o estoque.' });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/demo/redefinir-senha') {
        const { senhaAtual, novaSenha } = (await lerJson(req)) ?? {};
        const { rows: [usuario] } = await banco.query('select email from auth.users where id = $1', [conta.id]);
        const validado = usuario ? await autenticarContaLocal(banco, usuario.email, senhaAtual) : null;
        if (!validado) {
          json(res, 401, { erro: 'Confira a senha atual.' });
          return;
        }
        try {
          await redefinirSenhaLocal(banco, conta.id, novaSenha);
        } catch {
          json(res, 400, { erro: 'A nova senha deve ter entre 15 e 128 caracteres.' });
          return;
        }
        // Revoga todas as sessões ativas da conta após a troca de senha.
        for (const [chaveSessao, dadosSessao] of sessoes.entries()) {
          if (dadosSessao.id === conta.id) sessoes.delete(chaveSessao);
        }
        res.setHeader('Set-Cookie', 'visionchef_demo=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
        json(res, 200, { atualizada: true });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/demo/restaurantes') {
        json(res, 200, await comoUsuario(banco, conta.id, listarRestaurantes));
      } else if (req.method === 'GET' && url.pathname === '/demo/lotes') {
        const restaurante = url.searchParams.get('restaurante');
        json(res, 200, await comoUsuario(banco, conta.id, (tx) => listarEstoque(tx, restaurante)));
      } else if (req.method === 'POST' && url.pathname === '/demo/lotes') {
        const lote = await lerJson(req);
        json(res, 200, await comoUsuario(banco, conta.id, (tx) => cadastrarLote(tx, lote)));
      } else if (req.method === 'POST' && url.pathname === '/demo/lotes/validade') {
        const correcao = await lerJson(req);
        json(res, 200, await comoUsuario(banco, conta.id, (tx) => corrigirValidade(tx, correcao)));
      } else if (req.method === 'POST' && url.pathname === '/demo/lotes/abertura') {
        const abertura = await lerJson(req);
        json(res, 200, await comoUsuario(banco, conta.id, (tx) => registrarAbertura(tx, abertura)));
      } else if (req.method === 'POST' && url.pathname === '/demo/lotes/saida') {
        const saida = await lerJson(req);
        json(res, 200, await comoUsuario(banco, conta.id, (tx) => registrarSaida(tx, saida)));
      } else if (req.method === 'GET' && url.pathname === '/demo/descartes') {
        const restaurante = url.searchParams.get('restaurante');
        json(res, 200, await comoUsuario(banco, conta.id, (tx) => listarDescartes(tx, restaurante)));
      } else if (req.method === 'GET' && url.pathname === '/demo/equipe') {
        const restaurante = url.searchParams.get('restaurante');
        json(res, 200, await comoUsuario(banco, conta.id, (tx) => listarEquipe(tx, restaurante)));
      } else if (req.method === 'POST' && url.pathname === '/demo/equipe/vincular') {
        const dados = await lerJson(req);
        json(res, 200, await comoUsuario(banco, conta.id, (tx) => vincularMembro(tx, dados)));
      } else if (req.method === 'POST' && url.pathname === '/demo/equipe/remover') {
        const dados = await lerJson(req);
        json(res, 200, await comoUsuario(banco, conta.id, (tx) => removerMembro(tx, dados)));
      } else {
        json(res, 404, { erro: 'Endereço indisponível.' });
      }
    } catch (erro) {
      if (erro.code === '42501') {
        json(res, 403, { erro: 'Sua conta não tem acesso a esse estoque.' });
      } else if (erro.code === 'PT409' || erro.code === 'PT404') {
        // Reproduz os códigos de conflito e item ausente que a API integrada retorna.
        json(res, Number(erro.code.slice(2)), { erro: erro.message, codigo: erro.code });
      } else if (erro.code === '23505') {
        json(res, 409, { erro: 'Este cadastro já foi enviado com outros dados.' });
      } else if (erro.code?.startsWith('22') || erro.code?.startsWith('23') || erro instanceof SyntaxError || erro instanceof RangeError) {
        json(res, 400, { erro: 'Confira os dados do lote.' });
      } else {
        console.error('Erro no ambiente local:', erro);
        json(res, 500, { erro: 'O ambiente local não conseguiu completar a operação.' });
      }
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dados = resolve(raiz, '.dados-local');
  const pastaPublica = resolve(dados, 'site');
  await mkdir(dados, { recursive: true });
  await montarPiloto({ destino: pastaPublica, local: true });
  const banco = await abrirBancoLocal(resolve(dados, 'postgres'));
  const servidor = criarServidorLocal(banco, pastaPublica);
  servidor.on('error', async (erro) => {
    console.error('Não foi possível iniciar o servidor local:', erro.message);
    await banco.close();
    process.exitCode = 1;
  });
  servidor.listen(Number(process.env.HTTP_PORT || process.env.VISIONCHEF_PORT || 8080), '127.0.0.1', () => {
    console.log(`VisionChef local: http://127.0.0.1:${servidor.address().port}`);
  });
  const encerrar = () => servidor.close(() => banco.close());
  process.once('SIGINT', encerrar);
  process.once('SIGTERM', encerrar);
}

