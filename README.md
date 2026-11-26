# VisionChef

O piloto profissional permite cadastrar e consultar lotes, corrigir a validade e registrar abertura ou fracionamento. A tela de estoque fica em `piloto/` e o componente React de acesso à [landing page](index.html) fica em `frontend/`. Os materiais de apoio estão no [índice do simulado](<Insumo vencendo na cozinha/README.md>).

Consulte o [mapa da raiz](docs/MAPA-DA-RAIZ.md) para localizar arquivos e escolher onde colocar mudanças.

## Rodar o piloto no computador

Com Node.js 24 e npm, abra um terminal na raiz do projeto e execute:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abra diretamente a [tela de estoque](http://127.0.0.1:8080/estoque/) e use uma das contas de teste. A página inicial apresenta o VisionChef e as demonstrações do produto, sem botões de entrar ou criar conta. Depois do login, a página abre o estoque. A senha compartilhada para essas contas fictícias é `senha123`.

| Usuário | E-mail | O que permite verificar |
| --- | --- | --- |
| `dono.piloto` | `dono@piloto.test` | Cadastra e consulta os lotes do restaurante piloto. |
| `funcionario.piloto` | `funcionario@piloto.test` | Acessa o mesmo estoque do dono com outra conta. |
| `gerente.piloto` | `gerente@piloto.test` | Acessa estoque, relatório, fornecedores e equipe; não pode alterar acessos de donos. |
| `dono.outro` | `dono@outro.test` | Acessa apenas o estoque de outro restaurante fictício. |

O campo **Usuário ou e-mail** aceita qualquer uma das duas opções para a mesma conta. O nome de usuário tem de 3 a 32 caracteres. Pode conter letras sem acento, números, ponto, hífen e sublinhado e deve começar por letra ou número. A exclusividade vale em todo o sistema e ignora maiúsculas e minúsculas.

No estoque, use **Corrigir validade** ao lado do lote, confira a data atual e salve a nova. A lista usa a nova data para ordenar e mostrar a situação do lote.

Em um lote fechado, use **Registrar abertura** e informe quanto foi aberto, a data da operação e a validade após abertura. A lista mostra a parte aberta com a menor validade aplicável. O saldo fechado que restar aparece em uma linha própria.

O servidor local usa PostgreSQL embarcado via PGlite e aplica as migrações em `supabase/migrations/`. As contas e as sessões são de teste. O banco fica na pasta ignorada `.dados-local/` e preserva os registros após fechar a página. Para encerrar o servidor, use `Ctrl+C` no terminal.

## Verificações e integração

- `npm.cmd test` roda os testes de cadastro, correção, abertura, ordenação por validade, repetição de envio, validação de quantidade e isolamento entre restaurantes. Os testes usam um banco descartável em memória.
- `npm.cmd run build` gera a interface integrada em `dist/`. As funções Node da Vercel leem as variáveis privadas em runtime; o build não incorpora URL, chave Supabase ou segredo JWT ao JavaScript do navegador.
- O acesso integrado passa por `/api`, que mantém a sessão em cookie HttpOnly e encaminha as operações ao Supabase com o token individual do usuário. Login por nome e limitação de tentativas usam funções Edge assinadas e migrações PostgreSQL. Consulte a lista de configuração no [guia de implantação](docs/architecture/implantacao.md); publicar migrações e funções continua sendo uma etapa separada do build.
- Use **Registrar uso** ou **Registrar descarte** na linha do lote. A quantidade sai do saldo e o dono consulta o relatório mensal de desperdício, com baixas reais, quantidades e descartes de lotes vencidos.
- Em **Cadastrar lote**, abra **Preencher com assistente**, descreva o insumo e confira os campos sugeridos antes de salvar. Datas ambíguas exigem confirmação manual. No modo Vision, **Fotografar ou escolher imagem** executa OCR local em português para sugerir lote e validade; a foto não é enviada e a pessoa precisa conferir as sugestões.
- A configuração da prévia protegida está no [guia de implantação](docs/architecture/implantacao.md). Use um projeto Supabase de teste antes de convidar a equipe.

Veja os [requisitos do piloto](docs/product/requirements.md), o [desenho técnico](docs/architecture/piloto.md) e as [futuras implantações](docs/futuras-implantacoes/README.md).

## Configuração do projeto

O `requirements.txt` fica na raiz para registrar que o projeto não possui dependências Python; portanto, não use `pip install -r requirements.txt`. As dependências e versões do aplicativo estão em `package.json` e `package-lock.json`, e a instalação é feita com `npm ci`. O `package.json` define os comandos acima. O Vite compila o componente React para a seção de acesso. O backend Node acessa o Supabase e usa Nodemailer com SMTP privado apenas para a confirmação facultativa. O PGlite roda o banco local e os testes. O `package-lock.json` fixa as versões instaladas por `npm.cmd ci`. O OCR usa `tesseract.js` (Apache-2.0) e `@tesseract.js-data/por` (MIT); o build serve worker, motor WebAssembly e idioma a partir da própria aplicação, sem API ou CDN. Esses arquivos só são baixados pelo navegador quando a pessoa escolhe uma imagem.
