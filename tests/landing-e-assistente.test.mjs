/**
 * Suíte automatizada de verificação da landing page, cores semânticas (temas claro/escuro),
 * proteção contra lotes repetidos, componente VoicePill, simulações do assistente,
 * importação de XML NF-e (Fase 1) e sincronização dos materiais de pitch.
 */
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { normalizarNomeFiscal, gerarXmlNfeExemplo, interpretarXmlNfe } from '../piloto/interpretar-nfe.js';
import { abrirBancoLocal } from '../scripts/banco-local.mjs';
import { montarPiloto } from '../scripts/build.mjs';
import { criarServidorLocal } from '../scripts/dev.mjs';

test('landing page e sistema /estoque/ aplicam 4 cores semânticas nos temas claro e escuro com alerta pulsante em Vence hoje', async () => {
  const syncCss = await readFile(new URL('../Insumo vencendo na cozinha/abertura/sync.css', import.meta.url), 'utf8');
  const estoqueCss = await readFile(new URL('../piloto/estoque.css', import.meta.url), 'utf8');
  const estoqueHtml = await readFile(new URL('../piloto/index.html', import.meta.url), 'utf8');
  const equipeHtml = await readFile(new URL('../piloto/equipe.html', import.meta.url), 'utf8');
  const estoqueJs = await readFile(new URL('../piloto/estoque.js', import.meta.url), 'utf8');

  // Confirma tokens das 4 hipóteses (vencido, hoje, breve, prazo) nos temas escuro e claro da landing.
  assert.match(syncCss, /html\[data-theme="light"\]/);
  assert.match(syncCss, /--st-vencido-cor:/);
  assert.match(syncCss, /--st-hoje-cor:/);
  assert.match(syncCss, /--st-breve-cor:/);
  assert.match(syncCss, /--st-prazo-cor:/);
  assert.match(syncCss, /@keyframes alerta-vence-hoje-card/);
  assert.match(syncCss, /@keyframes alerta-vence-hoje-badge/);
  assert.match(syncCss, /@keyframes alerta-vence-hoje-botao/);
  assert.match(syncCss, /\.filters \.botao\[data-filter="hoje"\]/);

  // Confirma temas claro/escuro, filtros semânticos, data-situacao nas linhas e trava de duplicidade no /estoque/.
  assert.match(estoqueCss, /html\[data-theme="dark"\]/);
  assert.match(estoqueCss, /html\[data-theme="light"\]/);
  assert.match(estoqueCss, /#lotes tr\[data-situacao="hoje"\]/);
  assert.match(estoqueCss, /@keyframes alerta-vence-hoje-linha/);
  assert.match(estoqueHtml, /abertura\/js\/tema\.js/);
  assert.match(estoqueHtml, /data-theme-toggle/);
  assert.match(estoqueHtml, /id="filtros-estoque"/);
  assert.match(equipeHtml, /abertura\/js\/tema\.js/);
  assert.match(equipeHtml, /data-theme-toggle/);
  assert.match(estoqueJs, /linha\.dataset\.situacao = lote\.situacao/);
  assert.match(estoqueJs, /buscarLoteDuplicado/);
});

test('assistente IA e cadastro manual trazem VoicePill, 5 simulações (com erro), trava de duplicidade e NF-e Fase 1', async () => {
  const agenteHtml = await readFile(new URL('../Insumo vencendo na cozinha/htmls/agente-ia-cadastro.html', import.meta.url), 'utf8');
  const manualHtml = await readFile(new URL('../Insumo vencendo na cozinha/htmls/E3-mvp-validade.html', import.meta.url), 'utf8');
  const voiceJsx = await readFile(new URL('../frontend/components/VoicePill.jsx', import.meta.url), 'utf8');
  const voiceCss = await readFile(new URL('../frontend/components/VoicePill.css', import.meta.url), 'utf8');

  // Componente React VoicePill pronto e sem dependências não instaladas.
  assert.match(voiceJsx, /export default function VoicePill/);
  assert.doesNotMatch(voiceJsx, /@hugeicons/);
  assert.match(voiceCss, /\.voice-pill__capsule/);
  assert.match(voiceCss, /\.voice-pill__wave/);

  // A cápsula usa a classe VoicePill junto com as classes obrigatórias de botão do projeto.
  assert.match(agenteHtml, /class="[^"]*\bbotao\b[^"]*\bvoice-pill\b[^"]*"/);
  assert.match(agenteHtml, /data-sim="hoje"/);
  assert.match(agenteHtml, /data-sim="breve"/);
  assert.match(agenteHtml, /data-sim="prazo"/);
  assert.match(agenteHtml, /data-sim="vencido"/);
  assert.match(agenteHtml, /data-sim="erro"/);
  assert.match(agenteHtml, /id="duplicate-warning"/);
  assert.match(agenteHtml, /id="nfe-file-input"/);
  assert.match(agenteHtml, /id="nfe-demo-btn"/);
  assert.match(agenteHtml, /Roadmap fiscal integrado \(Fases 1, 2 e 3\)/);

  // Cadastro manual também possui tema claro/escuro e proteção contra lote repetido.
  assert.match(manualHtml, /abertura\/js\/tema\.js/);
  assert.match(manualHtml, /id="duplicate-warning"/);
  assert.match(manualHtml, /findDuplicateLot/);
});

test('módulo piloto/interpretar-nfe.js normaliza descrições fiscais e gera XML NF-e 4.00 com e sem <rastro>', () => {
  assert.equal(normalizarNomeFiscal('CR LEITE UHT TP 200G CX'), 'Creme de leite');
  assert.equal(normalizarNomeFiscal('QJO MUCARELA FAT 500G'), 'Queijo muçarela');
  assert.equal(normalizarNomeFiscal('FAR TRIGO TIPO 1 5KG'), 'Farinha de trigo');
  assert.equal(normalizarNomeFiscal('ALF AMERICANA HIG 250G'), 'Alface americana');

  // Valida a estrutura do XML de exemplo gerado para a Fase 1 (chave 44 dígitos, 1 item com <rastro> e 3 sem).
  const xml = gerarXmlNfeExemplo('2026-11-25');
  assert.match(xml, /Id="NFe\d{44}"/);
  assert.match(xml, /<nNF>48219<\/nNF>/);
  assert.match(xml, /<rastro>[\s\S]*<nLote>NF-M04<\/nLote>[\s\S]*<dVal>2026-11-27<\/dVal>[\s\S]*<\/rastro>/);
  assert.equal((xml.match(/<det\s+nItem="/g) ?? []).length, 4);

  // Rejeita entradas vazias ou inválidas de forma controlada.
  assert.throws(() => interpretarXmlNfe(''), /arquivo XML/i);
});

test('build local serve ativos .webp, /interpretar-nfe.js, informacoes.html limpo e pitch sincronizado', async (t) => {
  const banco = await abrirBancoLocal();
  t.after(() => banco.close());

  const temporarios = resolve(tmpdir());
  const prefixo = 'visionchef-pente-fino-';
  const pastaPublica = await mkdtemp(join(temporarios, prefixo));
  t.after(async () => {
    assert.equal(dirname(resolve(pastaPublica)), temporarios);
    assert.ok(basename(pastaPublica).startsWith(prefixo));
    await rm(pastaPublica, { recursive: true, force: true });
  });

  await montarPiloto({ destino: pastaPublica, local: true });
  const servidor = criarServidorLocal(banco, pastaPublica);
  t.after(() => new Promise((resolver) => servidor.close(resolver)));
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  const origem = `http://127.0.0.1:${servidor.address().port}`;

  // Garante que imagens .webp e o módulo /interpretar-nfe.js respondem 200 com Content-Type correto.
  const logoWebp = await fetch(`${origem}/Insumo%20vencendo%20na%20cozinha/abertura/imagens/LogoOficial.webp`);
  assert.equal(logoWebp.status, 200);
  assert.equal(logoWebp.headers.get('content-type'), 'image/webp');

  const nfeModulo = await fetch(`${origem}/interpretar-nfe.js`);
  assert.equal(nfeModulo.status, 200);
  assert.match(await nfeModulo.text(), /interpretarXmlNfe/);

  // Garante que informacoes.html não referencia mais .png/.jpg inexistentes no bundle publicado.
  const infoHtml = await (await fetch(`${origem}/informacoes.html`)).text();
  assert.doesNotMatch(infoHtml, /LogoOficial\.png|sol-realista\.jpg|lua-realista\.jpg/);
  assert.match(infoHtml, /LogoOficial\.webp/);
  assert.match(infoHtml, /VoicePill/);

  // Garante sincronismo entre slides, roteiro e estúdio de ensaio de voz.
  const slidesHtml = await readFile(new URL('../Insumo vencendo na cozinha/pitch/E4-pitch-slides.html', import.meta.url), 'utf8');
  const roteiroMd = await readFile(new URL('../Insumo vencendo na cozinha/pitch/roteiro.md', import.meta.url), 'utf8');
  const ensaioHtml = await readFile(new URL('../Insumo vencendo na cozinha/pitch/ensaio-voz.html', import.meta.url), 'utf8');
  for (const conteudo of [slidesHtml, roteiroMd, ensaioHtml]) {
    assert.match(conteudo, /Fase 1/);
    assert.match(conteudo, /Fase 2/);
    assert.match(conteudo, /Fase 3/);
    assert.match(conteudo, /QR Code/i);
  }
});
