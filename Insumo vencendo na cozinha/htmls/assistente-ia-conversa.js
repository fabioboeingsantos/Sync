const byId = id => document.getElementById(id);
const messages = byId('messages');
const message = byId('message');
const review = byId('review');
const fields = { item: byId('item'), code: byId('code'), expiry: byId('expiry') };
const storageKey = 'insumo-e3-conversa-lotes-v1';
const questions = {
  item: 'Qual é o nome do insumo?',
  code: 'Qual é o código do lote? Pode responder só com o código.',
  expiry: 'Qual é a data de validade completa? Responda no formato DD/MM/AAAA.'
};
const datePattern = /\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\b/;
const spokenDatePattern = /\b(\d{1,2}) de (janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de (\d{4})\b/i;
const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const lotPattern = /\blote\s*[:#]?\s*([a-z0-9]+(?:-[a-z0-9]+)*)\b/i;
let draft = {};
let pending = '';
let lots = [];

function appendMessage(text, author = 'assistant') {
  const entry = document.createElement('p');
  entry.className = `message ${author}`;
  entry.textContent = text;
  messages.append(entry);
  messages.scrollTop = messages.scrollHeight;
}

function parseDate(text) {
  const numeric = text.match(datePattern);
  const spoken = text.match(spokenDatePattern);
  if (!numeric && !spoken) return '';
  const [, day, monthValue, year] = numeric || spoken;
  const month = numeric ? monthValue : String(months.indexOf(monthValue.toLowerCase().replace('marco', 'março')) + 1);
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number(year) >= 1900 && !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === iso ? iso : '';
}

function receive(text) {
  text = text.trim();
  if (!text) return;
  appendMessage(text, 'user');

  if (!pending) draft = {};
  const date = parseDate(text);
  const code = text.match(lotPattern)?.[1];

  if (date) draft.expiry = date;
  if (code) draft.code = code.toUpperCase();
  if (pending === 'code' && !code && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(text) && !date) {
    draft.code = text.toUpperCase();
  }
  if (!draft.item && (!pending || pending === 'item')) {
    const item = text.replace(/^(?:cadastre|registre|anote|insumo\s*:)\s*/i, '')
      .split(/[,;\n]|\blote\b|\bvalidade\b|\bvence\b/i)[0]
      .replace(datePattern, '').replace(spokenDatePattern, '').trim();
    if (/\p{L}/u.test(item)) draft.item = item.slice(0, 100);
  }

  pending = Object.keys(questions).find(field => !draft[field]) || '';
  review.hidden = Boolean(pending);
  if (pending) {
    appendMessage(questions[pending]);
    message.focus();
    return;
  }
  for (const field of Object.keys(fields)) fields[field].value = draft[field];
  appendMessage('Confira os dados do lote. Você pode ajustar os campos antes de salvar.');
  fields.item.focus();
}

function renderLots() {
  const list = byId('lots');
  list.replaceChildren();
  byId('empty').hidden = lots.length > 0;
  const sorted = [...lots].sort((a, b) => a.expiry.localeCompare(b.expiry));
  for (const lot of sorted) {
    const entry = document.createElement('li');
    const date = lot.expiry.split('-').reverse().join('/');
    entry.textContent = `${lot.item} · lote ${lot.code} · validade ${date}`;
    list.append(entry);
  }
}

function resetDraft() {
  draft = {};
  pending = '';
  review.hidden = true;
  message.value = '';
}

try {
  lots = JSON.parse(localStorage.getItem(storageKey) || '[]');
} catch {
  byId('storage-status').textContent = 'O histórico deste navegador não pôde ser lido.';
}
renderLots();

byId('conversation').addEventListener('submit', event => {
  event.preventDefault();
  const text = message.value;
  message.value = '';
  receive(text);
});

byId('complete-example').onclick = () => {
  resetDraft();
  receive('Creme de leite, lote A12, validade 30/11/2026');
};
byId('partial-example').onclick = () => {
  resetDraft();
  receive('Queijo, lote B02, vence na terça');
};
byId('reset').onclick = () => {
  resetDraft();
  messages.replaceChildren();
  appendMessage('Qual lote você quer cadastrar? Informe o insumo, o código do lote e a data de validade.');
  message.focus();
};

byId('lot-form').addEventListener('submit', event => {
  event.preventDefault();
  const lot = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value.trim()]));
  const emptyField = Object.keys(fields).find(key => !lot[key]);
  if (emptyField) {
    appendMessage(questions[emptyField]);
    fields[emptyField].focus();
    return;
  }
  lots.push(lot);
  try {
    localStorage.setItem(storageKey, JSON.stringify(lots));
    byId('storage-status').textContent = '';
    appendMessage(`Lote ${lot.code} salvo neste navegador.`);
  } catch {
    byId('storage-status').textContent = 'O navegador bloqueou a gravação. Os lotes ficam disponíveis até fechar ou recarregar a página.';
    appendMessage(`Lote ${lot.code} registrado temporariamente.`);
  }
  resetDraft();
  renderLots();
  message.focus();
});

byId('voice').onclick = () => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const status = byId('voice-status');
  const button = byId('voice');
  if (!Recognition) {
    status.textContent = 'O ditado não está disponível neste navegador. Você pode digitar a mensagem.';
    return;
  }
  const recognition = new Recognition();
  recognition.lang = 'pt-BR';
  recognition.onstart = () => { status.textContent = 'Ouvindo…'; };
  recognition.onresult = event => {
    message.value = event.results[0][0].transcript.slice(0, message.maxLength);
    status.textContent = 'Confira a transcrição e clique em Enviar.';
    message.focus();
  };
  recognition.onerror = () => { status.textContent = 'Não foi possível transcrever. Confira a permissão do microfone ou digite a mensagem.'; };
  recognition.onend = () => {
    button.disabled = false;
    if (status.textContent === 'Ouvindo…') status.textContent = 'Nenhuma mensagem foi transcrita. Tente novamente ou digite.';
  };
  try {
    recognition.start();
    button.disabled = true;
  } catch {
    status.textContent = 'Não foi possível iniciar o ditado. Você pode digitar a mensagem.';
  }
};
