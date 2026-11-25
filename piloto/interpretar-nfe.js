/**
 * Módulo de leitura e normalização de NF-e (XML padrão SEFAZ 4.00) para o VisionChef.
 *
 * Finalidade:
 * - Executar a Fase 1 do roadmap fiscal diretamente no navegador (ou ambiente com DOMParser),
 *   sem custo de API externa nem exposição de certificado digital.
 * - Extrair metadados da nota (chave de acesso de 44 dígitos, número, fornecedor) e os itens (<det>),
 *   aproveitando automaticamente o grupo <rastro> (<nLote>, <dVal>, <dFab>, <qLote>) quando vier preenchido.
 * - Normalizar nomes fiscais abreviados (ex.: "CR LEITE UHT TP 200G") para nomes limpos de cozinha
 *   e sinalizar os itens sem validade no XML para conferência assistida por voz/texto.
 *
 * Regras de negócio:
 * - A IA/parser nunca grava lotes sozinho: cada item extraído passa pela conferência humana.
 * - A chave de acesso (chNFe) permite bloquear a importação duplicada da mesma nota fiscal.
 */

// Mapa de tradução de abreviações fiscais comuns em notas de distribuidores e atacarejos brasileiros.
const REGRAS_NORMALIZACAO_FISCAL = [
  [/\bCR\.?\s*LEITE\b/gi, 'Creme de leite'],
  [/\bQJO\.?\s*MUCARELA\b/gi, 'Queijo muçarela'],
  [/\bQJO\.?\s*PARMESAO\b/gi, 'Queijo parmesão'],
  [/\bFAR\.?\s*TRIGO\b/gi, 'Farinha de trigo'],
  [/\bALF\.?\s*AMERICANA\b/gi, 'Alface americana'],
  [/\bIOG\.?\s*NATURAL\b/gi, 'Iogurte natural'],
  [/\bPOLPA\s*TOM\.?\b/gi, 'Polpa de tomate'],
  [/\bLEITE\s*COND\.?\b/gi, 'Leite condensado'],
  [/\bMANTEIGA\s*C\/SAL\b/gi, 'Manteiga com sal'],
  [/\bFILE\s*PEITO\s*FRANGO\b/gi, 'Filé de peito de frango'],
];

// Unidades comerciais fiscais (uCom) convertidas para rótulos amigáveis na cozinha.
const UNIDADES_FISCAIS = {
  UN: 'un',
  UND: 'un',
  UNID: 'un',
  CX: 'caixas',
  CXA: 'caixas',
  FD: 'fardos',
  PCT: 'pacotes',
  PT: 'potes',
  BD: 'bandejas',
  BDJ: 'bandejas',
  KG: 'kg',
  G: 'g',
  GR: 'g',
  L: 'L',
  LT: 'L',
  ML: 'ml',
  SC: 'sacos',
};

/**
 * Busca o texto do primeiro elemento descendente pelo nome local da tag,
 * ignorando namespaces XML (padrão http://www.portalfiscal.inf.br/nfe).
 */
function lerTag(no, nomeLocal) {
  if (!no) return '';
  const encontrado = no.getElementsByTagNameNS('*', nomeLocal)[0] ?? no.getElementsByTagName(nomeLocal)[0];
  return encontrado?.textContent?.trim() ?? '';
}

/**
 * Normaliza a descrição fiscal de um produto (<xProd>) para exibição humana na cozinha,
 * removendo códigos técnicos comuns de atacado sem perder a identificação do insumo.
 */
export function normalizarNomeFiscal(descricaoBruta) {
  let nome = String(descricaoBruta ?? '').trim();
  if (!nome) return '';

  for (const [padrao, substituicao] of REGRAS_NORMALIZACAO_FISCAL) {
    if (padrao.test(nome)) {
      return substituicao;
    }
  }

  // Limpa sufixos fiscais comuns de embalagem para deixar o nome mais legível ao cozinheiro.
  nome = nome
    .replace(/\b(UHT|TP|TETRA\s*PAK|TIPO\s*\d+|RESF|CONG|HIG|FAT|PCT|CX|FD)\b/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:G|KG|ML|L|UN)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!nome) return String(descricaoBruta).trim();
  const minusculo = nome.toLowerCase();
  return minusculo.charAt(0).toUpperCase() + minusculo.slice(1);
}

/**
 * Formata quantidade numérica do XML (<qCom> / <qLote>) e converte a unidade comercial (<uCom>).
 */
function formatarQuantidadeFiscal(valorBruto, unidadeBruta) {
  const numero = Number(String(valorBruto ?? '').replace(',', '.'));
  const unidadeChave = String(unidadeBruta ?? '').trim().toUpperCase();
  const unidadeAmigavel = UNIDADES_FISCAIS[unidadeChave] ?? String(unidadeBruta ?? '').trim().toLowerCase();

  if (!Number.isFinite(numero) || numero <= 0) {
    return unidadeAmigavel;
  }

  const formatado = Number.isInteger(numero)
    ? String(numero)
    : numero.toFixed(3).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');

  return unidadeAmigavel ? `${formatado} ${unidadeAmigavel}` : formatado;
}

/**
 * Valida se a data ISO extraída de <dVal> ou <dFab> (AAAA-MM-DD) representa um dia real no calendário.
 */
function validarDataIso(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [ano, mes, dia] = iso.split('-').map(Number);
  const teste = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    teste.getUTCFullYear() !== ano ||
    teste.getUTCMonth() !== mes - 1 ||
    teste.getUTCDate() !== dia
  ) {
    return '';
  }
  return iso;
}

/**
 * Interpreta uma string XML de NF-e (modelo 55) e retorna os dados estruturados da nota
 * junto com a fila de itens prontos para conferência no estoque PVPS.
 *
 * @param {string} xmlTexto Conteúdo bruto do arquivo .xml da NF-e.
 * @param {typeof DOMParser} [ParserCtor] Construtor DOMParser (padrão global do navegador).
 */
export function interpretarXmlNfe(xmlTexto, ParserCtor = globalThis.DOMParser) {
  if (!xmlTexto || typeof xmlTexto !== 'string') {
    throw new Error('Selecione um arquivo XML de NF-e válido.');
  }
  if (typeof ParserCtor !== 'function') {
    throw new Error('DOMParser indisponível neste ambiente.');
  }

  const doc = new ParserCtor().parseFromString(xmlTexto, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('O arquivo enviado não é um XML válido.');
  }

  const infNFe = doc.getElementsByTagNameNS('*', 'infNFe')[0] ?? doc.getElementsByTagName('infNFe')[0];
  if (!infNFe) {
    throw new Error('XML sem bloco <infNFe>. Envie uma NF-e padrão SEFAZ.');
  }

  // Extrai a chave de acesso de 44 dígitos (presente no atributo Id="NFe..." ou em <protNFe>/<chNFe>).
  const idAtributo = infNFe.getAttribute('Id') ?? '';
  const chaveBruta = lerTag(doc, 'chNFe') || idAtributo.replace(/^NFe/i, '');
  const chaveAcesso = chaveBruta.replace(/\D/g, '').slice(0, 44);
  const numeroNota = lerTag(infNFe, 'nNF') || 'S/N';
  const emitenteNo = infNFe.getElementsByTagNameNS('*', 'emit')[0] ?? infNFe.getElementsByTagName('emit')[0];
  const fornecedor = lerTag(emitenteNo, 'xFant') || lerTag(emitenteNo, 'xNome') || 'Fornecedor não identificado';
  const cnpjFornecedor = lerTag(emitenteNo, 'CNPJ');

  const detalhes = Array.from(
    infNFe.getElementsByTagNameNS('*', 'det').length
      ? infNFe.getElementsByTagNameNS('*', 'det')
      : infNFe.getElementsByTagName('det'),
  );

  if (detalhes.length === 0) {
    throw new Error('Nenhum item (<det>) foi encontrado nesta NF-e.');
  }

  const itens = [];

  for (const det of detalhes) {
    const nItem = det.getAttribute('nItem') || String(itens.length + 1);
    const prod = det.getElementsByTagNameNS('*', 'prod')[0] ?? det.getElementsByTagName('prod')[0];
    if (!prod) continue;

    const descricaoFiscal = lerTag(prod, 'xProd');
    const codigoProduto = lerTag(prod, 'cProd');
    const ean = lerTag(prod, 'cEAN');
    const unidade = lerTag(prod, 'uCom');
    const quantidadeComercial = lerTag(prod, 'qCom');

    // Um mesmo item (<det>) pode conter 0, 1 ou vários blocos <rastro> (lotes com validades distintas).
    const rastros = Array.from(
      det.getElementsByTagNameNS('*', 'rastro').length
        ? det.getElementsByTagNameNS('*', 'rastro')
        : det.getElementsByTagName('rastro'),
    );

    if (rastros.length > 0) {
      rastros.forEach((rastro, indiceRastro) => {
        const lote = lerTag(rastro, 'nLote').toUpperCase();
        const validade = validarDataIso(lerTag(rastro, 'dVal'));
        const qtdRastro = lerTag(rastro, 'qLote') || quantidadeComercial;
        itens.push({
          uid: `${nItem}-${indiceRastro}`,
          nItem,
          codigoProduto,
          ean: ean && ean !== 'SEM GTIN' ? ean : '',
          descricaoFiscal,
          nomeSugerido: normalizarNomeFiscal(descricaoFiscal),
          quantidade: formatarQuantidadeFiscal(qtdRastro, unidade),
          lote,
          validade,
          temRastro: Boolean(validade),
          conferido: false,
        });
      });
    } else {
      // Cenário predominante em alimentos no Brasil: XML sem <rastro>; validade será conferida na cozinha.
      itens.push({
        uid: `${nItem}-0`,
        nItem,
        codigoProduto,
        ean: ean && ean !== 'SEM GTIN' ? ean : '',
        descricaoFiscal,
        nomeSugerido: normalizarNomeFiscal(descricaoFiscal),
        quantidade: formatarQuantidadeFiscal(quantidadeComercial, unidade),
        lote: '',
        validade: '',
        temRastro: false,
        conferido: false,
      });
    }
  }

  return {
    chaveAcesso,
    numeroNota,
    fornecedor,
    cnpjFornecedor,
    itens,
    totalComRastro: itens.filter((item) => item.temRastro).length,
    totalSemValidade: itens.filter((item) => !item.temRastro).length,
  };
}

/**
 * Gera um XML de NF-e 4.00 realista para demonstração em sala/apresentação,
 * ilustrando a realidade brasileira: 1 item com <rastro> preenchido e 3 itens sem validade no XML.
 *
 * @param {string} dataReferenciaIso Data base (AAAA-MM-DD) usada para calcular validades relativas.
 */
export function gerarXmlNfeExemplo(dataReferenciaIso) {
  const [ano, mes, dia] = dataReferenciaIso.split('-').map(Number);
  const somarDias = (delta) => {
    const dt = new Date(Date.UTC(ano, mes - 1, dia + delta));
    return [
      dt.getUTCFullYear(),
      String(dt.getUTCMonth() + 1).padStart(2, '0'),
      String(dt.getUTCDate()).padStart(2, '0'),
    ].join('-');
  };

  const fabricacao = somarDias(-10);
  const validadeRastro = somarDias(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe42261112345678000195550010000482191000482197" versao="4.00">
      <ide>
        <nNF>48219</nNF>
        <dhEmi>${dataReferenciaIso}T08:15:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000195</CNPJ>
        <xNome>DISTRIBUIDORA VALE ALIMENTOS LTDA</xNome>
        <xFant>Vale Alimentos Atacado</xFant>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>LAC-204</cProd>
          <cEAN>7891000204019</cEAN>
          <xProd>QJO MUCARELA FAT 500G</xProd>
          <uCom>PCT</uCom>
          <qCom>4.0000</qCom>
        </prod>
        <rastro>
          <nLote>NF-M04</nLote>
          <qLote>4.000</qLote>
          <dFab>${fabricacao}</dFab>
          <dVal>${validadeRastro}</dVal>
        </rastro>
      </det>
      <det nItem="2">
        <prod>
          <cProd>LAC-108</cProd>
          <cEAN>7891000108027</cEAN>
          <xProd>CR LEITE UHT TP 200G CX</xProd>
          <uCom>CX</uCom>
          <qCom>2.0000</qCom>
        </prod>
      </det>
      <det nItem="3">
        <prod>
          <cProd>SEC-315</cProd>
          <cEAN>7891000315043</cEAN>
          <xProd>FAR TRIGO TIPO 1 5KG</xProd>
          <uCom>SC</uCom>
          <qCom>3.0000</qCom>
        </prod>
      </det>
      <det nItem="4">
        <prod>
          <cProd>HRT-019</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>ALF AMERICANA HIG 250G</xProd>
          <uCom>BD</uCom>
          <qCom>2.0000</qCom>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;
}
