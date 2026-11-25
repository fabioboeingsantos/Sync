// Interpretação local compartilhada entre as telas de cadastro assistido do VisionChef.
// Valida se dia/mês/ano formam uma data real no calendário (ex.: rejeita 31/02)
function toValidIsoDate(day, month, year) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const test = new Date(Date.UTC(y, m - 1, d));
  if (
    test.getUTCFullYear() !== y ||
    test.getUTCMonth() !== m - 1 ||
    test.getUTCDate() !== d
  ) {
    return null;
  }
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/* -------------------------------------------------------------------------
   MOTOR DO ASSISTENTE DE PREENCHIMENTO (LINGUAGEM NATURAL)
   - Extrai insumo, código do lote, quantidade, local e data de validade.
   - Em produção, este módulo pode ser trocado por uma chamada a uma API de
     LLM mantendo exatamente o mesmo contrato de entrada/saída e validação.
   ------------------------------------------------------------------------- */
function interpretNaturalText(rawText) {
  const text = rawText.trim();
  const result = {
    name: '',
    lotCode: '',
    expiry: '',
    qty: '',
    location: '',
    ambiguousDateTerm: ''
  };

  // 1) Extrai data completa no formato DD/MM/AAAA ou DD-MM-AAAA
  const fullDateMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (fullDateMatch) {
    const validIso = toValidIsoDate(fullDateMatch[1], fullDateMatch[2], fullDateMatch[3]);
    if (validIso) result.expiry = validIso;
  }

  // 2) Os limites Unicode reconhecem palavras inteiras com acento, como “amanhã”.
  if (!result.expiry) {
    const ambiguousMatch = text.match(
      /(?<![\p{L}\p{N}_])(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo|amanhã|amanha|semana que vem|mês que vem|mes que vem|breve|logo)(?![\p{L}\p{N}_])/iu
    );
    if (ambiguousMatch) {
      result.ambiguousDateTerm = ambiguousMatch[0];
    }
  }

  // 3) Extrai código de lote (ex.: "lote A12", "lote B02")
  const lotMatch = text.match(/\blote\s*[:#-]?\s*([a-z0-9\-]+)/i);
  if (lotMatch) {
    result.lotCode = lotMatch[1].toUpperCase();
  }

  // 4) Extrai quantidade com unidade comum de cozinha (ex.: "2 caixas", "500g", "3 potes")
  const qtyMatch = text.match(
    /\b(\d+(?:[.,]\d+)?\s*(?:caixas?|cx|potes?|pacotes?|pct|unidades?|un|kg|g|l|litros?|ml|bandejas?|sacos?))\b/i
  );
  if (qtyMatch) {
    result.qty = qtyMatch[1].trim();
  }

  // 5) Extrai local na geladeira (ex.: "prateleira do meio", "fundo da geladeira", "freezer")
  const locMatch = text.match(/\b((?:prateleira|gaveta|freezer|congelador|porta|fundo)[^,.;]*)/i);
  if (locMatch) {
    result.location = locMatch[1].trim();
  }

  // 6) Extrai o nome do insumo pegando o primeiro segmento limpo antes dos metadados
  let cleanedName = text.split(/[,;.\n]/)[0] || '';
  cleanedName = cleanedName
    .replace(/\blote\s*[:#-]?\s*[a-z0-9\-]+/gi, '')
    .replace(/\b(validade|vence|vencimento|val)\b.*$/gi, '')
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/g, '')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:caixas?|cx|potes?|pacotes?|pct|unidades?|un|kg|g|l|litros?|ml|bandejas?|sacos?)\b/gi, '')
    .replace(/^(chegou|chegaram|cadastrar|registrar|anotar|colocar)\s+/i, '')
    .trim();

  if (cleanedName) {
    // Capitaliza a primeira letra para manter padrão visual
    result.name = cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1);
  }

  return result;
}
