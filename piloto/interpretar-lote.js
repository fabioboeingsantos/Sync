const quantidadeComUnidade = /\b(\d+(?:[.,]\d+)?)\s*(caixas?|cx|potes?|pacotes?|pct|unidades?|un|kg|quilos?|gramas?|g|litros?|l|ml|bandejas?|sacos?)\b/i;

function dataIso(valor) {
  const br = valor.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const iso = br ? [br[3], br[2].padStart(2, '0'), br[1].padStart(2, '0')].join('-') : valor;
  const data = new Date(iso + 'T00:00:00Z');
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === iso ? iso : '';
}

function medidaSugerida(captura) {
  if (!captura) return {};
  const unidade = captura[2].toLowerCase();
  const valor = captura[1].replace(',', '.');
  if (/^(g|gramas?|ml)$/.test(unidade)) {
    // Desloca o separador decimal três casas, sem arredondar a quantidade.
    const [inteiro, fracao = ''] = valor.split('.');
    const digitos = (inteiro + fracao).padStart(fracao.length + 4, '0');
    const corte = digitos.length - fracao.length - 3;
    return { quantidade: digitos.slice(0, corte) + '.' + digitos.slice(corte), medida: unidade === 'ml' ? 'L' : 'kg' };
  }
  if (/^(kg|quilo)/.test(unidade)) return { quantidade: valor, medida: 'kg' };
  if (/^l/.test(unidade)) return { quantidade: valor, medida: 'L' };
  return /^\d+$/.test(valor) ? { quantidade: valor, medida: 'un' } : {};
}

// O interpretador da E3 é local e retorna apenas sugestões para revisar no formulário.
export function interpretarLote(texto) {
  const entrada = texto.trim();
  const datas = [...entrada.matchAll(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/g)];
  const ambigua = /\b(?:hoje|amanh[ãa]|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo|semana que vem)\b/i.test(entrada);
  const validade = datas.length === 1 && !ambigua ? dataIso(datas[0][0]) : '';
  const lote = entrada.match(/\blote\s*[:#-]?\s*([a-z0-9][a-z0-9-]*)/i);
  const local = entrada.match(/\blocal\s*:\s*([^,;\n]+)/i)
    ?? entrada.match(/(?:\b(?:na|no)\s+)?\b((?:prateleira|gaveta|geladeira|freezer|congelador|porta|fundo)[^,;.\n]*)/i);
  const nome = entrada.replace(quantidadeComUnidade, '')
    .replace(lote?.[0] ?? '', '').replace(local?.[0] ?? '', '')
    .replace(/^(?:chegou|chegaram|cadastrar|registrar|anotar|colocar)\s+/i, '')
    .split(/[,;.\n]|\b(?:validade|vence|vencimento)\b/i)[0]
    .replace(/\b\d{1,4}[/-]\d{1,2}[/-]\d{2,4}\b/g, '').replace(/^\s*de\s+/i, '').trim();
  return {
    insumo: nome.charAt(0).toUpperCase() + nome.slice(1),
    codigo: lote?.[1].toUpperCase() ?? '',
    validade, local: local?.[1].trim() ?? '',
    ...medidaSugerida(entrada.match(quantidadeComUnidade)),
  };
}
