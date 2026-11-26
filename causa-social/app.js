// Interações locais da causa; registros e aprovações são demonstrativos.
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const landing = $('.landing-view');
const portal = $('.portal-view');
const institutionOnly = $('#institution-only');
const acessoInstituicao = new URLSearchParams(location.search).get('perfil') === 'instituicao';
// O painel operacional só abre por rota dedicada usada pelo atalho protegido do Dock.
const acessoGestao = new URLSearchParams(location.search).get('painel') === 'gestao';
const toast = $('#toast');
let toastTimer;
let currentStep = 1;
let activeFilter = 'all';
// Mantém o painel operacional fora da navegação pública; a rota de gestão exige sessão gerencial.
if (portal && !acessoGestao) portal.classList.add('hidden');
if (acessoInstituicao && institutionOnly) { landing?.classList.add('hidden'); institutionOnly.classList.add('hidden'); void abrirPortalInstituicao(); }
if (acessoGestao && portal) void abrirGestaoProtegida();

// Fictitious records keep this concept demo safe to explore without implying partner relationships.
const institutions = [
  { id: 'demo-a', name: 'Instituição Exemplo A', type: 'Cadastro ilustrativo', city: 'São Paulo — SP', capacity: 'Secos, hortifruti', cold: 'Refrigerador', pickup: 'Seg–sex · 9h–16h', contact: 'Responsável demonstrativo', email: 'exemplo-a@demo.invalid', phone: '(11) 00000-0000', status: 'approved' },
  { id: 'demo-b', name: 'Instituição Exemplo B', type: 'Cadastro ilustrativo', city: 'Campinas — SP', capacity: 'Secos, refrigerados', cold: 'Refrigerador e freezer', pickup: 'Seg–sáb · 8h–14h', contact: 'Responsável demonstrativo', email: 'exemplo-b@demo.invalid', phone: '(19) 00000-0000', status: 'approved' },
  { id: 'demo-c', name: 'Nova instituição (exemplo)', type: 'Cadastro ilustrativo', city: 'Santos — SP', capacity: 'Cadastro em conferência', cold: 'A confirmar', pickup: 'A confirmar', contact: 'Responsável demonstrativo', email: 'exemplo-c@demo.invalid', phone: '(13) 00000-0000', status: 'pending' }
];
const lots = [
  { name: 'Frutas da estação', icon: '🍊', qty: '8 kg', days: 3, note: 'Hortifruti · conferir integridade e maturação', eligible: true },
  { name: 'Leite UHT integral', icon: '🥛', qty: '24 unidades', days: 12, note: 'Produto fechado · armazenamento ambiente', eligible: true },
  { name: 'Pães embalados', icon: '🥖', qty: '18 unidades', days: 1, note: 'Perecível · retirada e distribuição rápidas', eligible: true }
];

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3900);
}
function goToPortal(panelName = 'overview') {
  if (!acessoGestao) return;
  landing?.classList.add('hidden');
  portal.classList.remove('hidden');
  showPanel(panelName);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function goToLanding() {
  if (!acessoGestao || !portal || !landing) return;
  portal.classList.add('hidden');
  landing.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function showPanel(name) {
  $$('.panel').forEach(panel => panel.classList.toggle('active', panel.id === `panel-${name}`));
  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.panel === name));
  const names = { overview: 'Visão geral', lots: 'Lotes para doação', institutions: 'Instituições', guide: 'Guia da causa', cadastro: 'Cadastro de instituição' };
  $('#crumb-current').textContent = names[name] || 'Instituições';
  if (name === 'institutions') renderInstitutions();
  if (name === 'lots') renderLots();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('click', event => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton && acessoGestao) {
    event.preventDefault();
    if (viewButton.dataset.view === 'portal') goToPortal(viewButton.dataset.tab || 'overview');
    else goToLanding();
  }
  const panelButton = event.target.closest('[data-panel]');
  if (panelButton) {
    event.preventDefault();
    if (portal.classList.contains('hidden')) goToPortal(panelButton.dataset.panel);
    else showPanel(panelButton.dataset.panel);
  }
  const filter = event.target.closest('[data-filter]');
  if (filter) {
    activeFilter = filter.dataset.filter;
    $$('.filter-chip').forEach(chip => chip.classList.toggle('selected', chip === filter));
    renderInstitutions();
  }
  const instAction = event.target.closest('[data-inst-action]');
  if (instAction) institutionAction(instAction.dataset.id, instAction.dataset.instAction);
  const lotAction = event.target.closest('[data-lot-action]');
  if (lotAction) offerLot(Number(lotAction.dataset.lotAction));
});

function renderInstitutions() {
  const query = ($('#institution-search').value || '').trim().toLocaleLowerCase('pt-BR');
  const approved = institutions.filter(item => item.status === 'approved').length;
  const pending = institutions.filter(item => item.status === 'pending').length;
  $('#count-all').textContent = institutions.length;
  $('#count-approved').textContent = approved;
  $('#count-pending-chip').textContent = pending;
  $('#stat-approved').textContent = approved;
  $('#stat-pending').textContent = pending;
  const list = institutions.filter(item => (activeFilter === 'all' || item.status === activeFilter) && `${item.name} ${item.city} ${item.type}`.toLocaleLowerCase('pt-BR').includes(query));
  const body = $('#institution-rows');
  if (!list.length) {
    body.innerHTML = '<tr><td colspan="5"><div class="empty-state">Nenhuma instituição corresponde a essa busca.</div></td></tr>';
    return;
  }
  body.innerHTML = list.map(item => {
    const statusName = item.status === 'approved' ? 'Aprovada' : item.status === 'pending' ? 'Em análise' : 'Recusada';
    const actions = item.status === 'pending'
      ? `<button class="table-action botao botao-secundario" data-inst-action="details" data-id="${item.id}">Revisar</button><button class="table-action botao botao-primario approve" data-inst-action="approve" data-id="${item.id}">Aprovar</button>`
      : `<button class="table-action botao botao-secundario" data-inst-action="details" data-id="${item.id}">Ver cadastro</button>${item.status === 'approved' ? `<button class="table-action botao botao-secundario danger reject" data-inst-action="pause" data-id="${item.id}">Pausar</button>` : `<button class="table-action botao botao-primario approve" data-inst-action="approve" data-id="${item.id}">Reativar</button>`}`;
    return `<tr><td><div class="inst-name"><span class="inst-logo">♧</span><span><strong>${escapeText(item.name)}</strong><small>${escapeText(item.type)}</small></span></div></td><td>${escapeText(item.city)}</td><td>${escapeText(item.capacity)}</td><td><span class="status status-${item.status}">${statusName}</span></td><td><div class="row-actions">${actions}</div></td></tr>`;
  }).join('');
}
function renderLots() {
  $('#lots-list').innerHTML = lots.map((lot, index) => `<article class="lot-row"><span class="lot-art">${lot.icon}</span><div class="lot-row-info"><h3>${escapeText(lot.name)} <span class="demo-tag">EXEMPLO</span></h3><p>${escapeText(lot.qty)} · ${escapeText(lot.note)}</p></div><span class="lot-deadline">${lot.days === 1 ? 'Vence amanhã' : `Vence em ${lot.days} dias`}</span><button class="button button-green button-small botao botao-primario" data-lot-action="${index}">Oferecer</button></article>`).join('');
}
function institutionAction(id, action) {
  const item = institutions.find(row => row.id === id);
  if (!item) return;
  if (action === 'details') {
    $('#institution-detail').innerHTML = `<div class="dialog-heading"><span class="inst-logo">♧</span><span><h2>${escapeText(item.name)}</h2><p>${escapeText(item.type)} · ${item.status === 'pending' ? 'Cadastro em análise' : item.status === 'approved' ? 'Instituição aprovada' : 'Cadastro pausado'}</p></span></div><div class="dialog-details"><div><small>LOCAL</small><strong>${escapeText(item.city)}</strong></div><div><small>CAPACIDADE</small><strong>${escapeText(item.capacity)}</strong></div><div><small>CONSERVAÇÃO</small><strong>${escapeText(item.cold)}</strong></div><div><small>RETIRADA</small><strong>${escapeText(item.pickup)}</strong></div><div><small>CONTATO</small><strong>${escapeText(item.contact)}</strong></div><div><small>TELEFONE</small><strong>${escapeText(item.phone)}</strong></div></div><div class="dialog-actions">${item.status !== 'approved' ? `<button class="button button-green button-small botao botao-primario" data-inst-action="approve" data-id="${item.id}">Aprovar cadastro</button>` : `<button class="button button-outline button-small botao botao-secundario" data-inst-action="pause" data-id="${item.id}">Pausar parceria</button>`}<button class="button button-outline button-small botao botao-secundario" data-inst-action="close">Fechar</button></div><p class="dialog-demo-note">Ficha ilustrativa. Dados fictícios para apresentação do protótipo.</p>`;
    $('#institution-dialog').showModal();
    return;
  }
  if (action === 'close') { $('#institution-dialog').close(); return; }
  if (action === 'approve') {
    item.status = 'approved';
    $('#institution-dialog').close();
    renderInstitutions();
    notify('Instituição aprovada na demonstração. Em produção, esta ação ficaria registrada para auditoria.');
  } else if (action === 'pause') {
    item.status = 'rejected';
    renderInstitutions();
    notify('Parceria pausada na demonstração.');
  }
}
function offerLot(index) {
  const lot = lots[index];
  const available = institutions.filter(item => item.status === 'approved');
  if (!available.length) return notify('Aprove uma instituição antes de oferecer um lote.');
  const destination = available[index % available.length];
  notify(`${lot.name}: exemplo de oferta para ${destination.name}. Confirme validade, segurança e retirada antes de concluir.`);
}
function escapeText(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

$('#institution-search')?.addEventListener('input', renderInstitutions);
$('#institution-dialog')?.addEventListener('click', event => {
  if (event.target === $('#institution-dialog')) $('#institution-dialog').close();
});

// Institution onboarding wizard. It validates and summarizes locally; it sends and stores no personal information.
const form = $('#registration-form');
function setStep(step) {
  currentStep = step;
  $$('.form-step').forEach(section => section.classList.toggle('active', Number(section.dataset.step) === step));
  $$('.progress-steps span').forEach(label => {
    const n = Number(label.dataset.stepLabel);
    label.classList.toggle('current', n === step);
    label.classList.toggle('done', n < step);
  });
  $('#progress-fill').style.width = `${step * 25}%`;
  $('#form-back').classList.toggle('hidden', step === 1);
  $('#form-next').classList.toggle('hidden', step === 4);
  $('#form-submit').classList.toggle('hidden', step !== 4);
  if (step === 4) renderSummary();
  $('.app-content').scrollTo({ top: 0, behavior: 'smooth' });
}
function currentStepValid() {
  const section = $(`.form-step[data-step="${currentStep}"]`);
  for (const control of $$('input,select,textarea', section)) {
    if (control.type === 'checkbox' && control.name === 'categories') continue;
    if (!control.checkValidity()) { control.reportValidity(); return false; }
  }
  if (currentStep === 3 && !$$('input[name="categories"]:checked', section).length) {
    notify('Selecione pelo menos uma categoria de alimento que a instituição consegue receber.');
    return false;
  }
  return true;
}
function renderSummary() {
  const data = new FormData(form);
  const fields = [
    ['Instituição', data.get('name')], ['CNPJ', data.get('cnpj')], ['Cidade', data.get('city')], ['Responsável', data.get('contact')],
    ['E-mail', data.get('email')], ['Contato', data.get('phone')], ['Categorias', data.getAll('categories').join(', ')],
    ['Conservação', data.get('cold')], ['Retirada', data.get('pickup')], ['Disponibilidade', data.get('schedule')]
  ];
  $('#review-summary').innerHTML = fields.map(([label, value]) => `<div class="review-field"><small>${escapeText(label)}</small><strong>${escapeText(value || '—')}</strong></div>`).join('');
}
$('#form-next')?.addEventListener('click', () => { if (currentStepValid()) setStep(currentStep + 1); });
$('#form-back')?.addEventListener('click', () => setStep(Math.max(1, currentStep - 1)));
form?.addEventListener('submit', event => {
  event.preventDefault();
  if (!currentStepValid()) return;
  const name = new FormData(form).get('name');
  form.reset();
  setStep(1);
  showPanel('institutions');
  notify(`Solicitação de ${name} simulada com sucesso. A conexão só é liberada depois da análise dos documentos e da capacidade de recebimento.`);
});

$('.mobile-menu')?.addEventListener('click', event => {
  const open = $('.public-nav').classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
$$('.public-nav a').forEach(link => link.addEventListener('click', () => $('.public-nav').classList.remove('open')));
if (portal && acessoGestao) { renderInstitutions(); renderLots(); }

// Mantém o fluxo de cadastro isolado e evita persistir documentos pessoais no protótipo local.
$('#institution-account-form')?.addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  event.currentTarget.reset();
  $('#institution-account-status').textContent = 'Cadastro demonstrativo recebido nesta tela. A validação real será conectada ao VisionChef antes de aceitar solicitações.';
});

// Confirma a sessão de conta no servidor antes de exibir o portal de instituição.
async function abrirPortalInstituicao() {
  try {
    const local = await fetch('/demo/sessao', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).catch(() => null);
    const sessao = local ?? await fetch('/api/auth/session', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).catch(() => null);
    if (!sessao?.user) { window.location.assign('/#cadastro'); return; }
    if (sessao.restaurantes?.length) { window.location.assign('/estoque/'); return; }
    landing?.classList.add('hidden');
    portal?.classList.add('hidden');
    institutionOnly?.classList.remove('hidden');
  } catch { window.location.assign('/#cadastro'); }
}

// Confirma no servidor o vínculo do usuário antes de exibir cadastros ou destinação gerencial.
async function abrirGestaoProtegida() {
  try {
    const local = await fetch('/demo/sessao', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).catch(() => null);
    const remota = local ?? await fetch('/api/auth/session', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).catch(() => null);
    const podeGerenciar = remota?.restaurantes?.some(item => ['dono', 'gerente'].includes(item.papel));
    if (!podeGerenciar) {
      portal?.classList.add('hidden');
      landing?.classList.remove('hidden');
      notify('A área de destinação é exclusiva para dono e gerente de restaurante.');
      history.replaceState(null, '', location.pathname);
      return;
    }
    landing?.classList.add('hidden');
    portal?.classList.remove('hidden');
    renderInstitutions(); renderLots();
  } catch {
    portal?.classList.add('hidden');
    landing?.classList.remove('hidden');
  }
}
