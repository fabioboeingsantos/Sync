/* -------------------------------------------------------------------------
   VOICEPILL (@react-bits/VoicePill-JS-CSS) + WEB SPEECH API
   - Substitui o botão "Ditar mensagem" pelo ícone de microfone animado.
   - Toque ou segure para gravar; arraste para a esquerda para cancelar.
   ------------------------------------------------------------------------- */
function initVoicePill(root, { onTranscript, onStatus }) {
  const waveCanvas = root.querySelector('.voice-pill__wave');
  const timeEl = root.querySelector('.voice-pill__time');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const LOOP = 4.8;
  const SYLLABLES = [
    [0.1, 0.16, 0.9], [0.3, 0.12, 0.7], [0.5, 0.2, 1],
    [0.95, 0.14, 0.8], [1.15, 0.1, 0.6], [1.3, 0.22, 0.95],
    [1.9, 0.16, 0.85], [2.12, 0.12, 0.7], [2.3, 0.18, 0.9],
    [2.55, 0.1, 0.5], [3.05, 0.24, 1], [3.4, 0.12, 0.75], [3.6, 0.16, 0.9]
  ];
  const DT_MAX = 0.05;
  const SLIDE_MIN = 4;
  const WAVE_EVERY = 4;
  const WAVE_MAX = 80;
  const CFG = {
    attack: 40,
    release: 240,
    sensitivity: 1,
    floor: 0.1,
    mode: 'auto',
    holdAfter: 300,
    slideToCancel: true,
    cancelDistance: 64
  };

  const st = {
    listening: false,
    pointerId: null,
    ownPress: false,
    downX: 0,
    sliding: false,
    hist: [],
    tick: 0,
    acc: 0,
    downAt: 0,
    startedAt: 0,
    raf: 0,
    last: 0,
    env: 0,
    t0: 0,
    recognition: null
  };

  // A onda visual indica que o ditado está ativo. O reconhecimento é feito pelo navegador.
  const simulatedLevel = t => {
    const u = t % LOOP;
    let a = 0.06;
    for (const [s, d, p] of SYLLABLES) {
      const x = (u - s) / d;
      if (x >= 0 && x <= 1) a = Math.max(a, p * 0.5 * (1 - Math.cos(2 * Math.PI * x)));
    }
    return a * (0.7 + 0.3 * Math.abs(Math.sin(2 * Math.PI * 7.1 * u)));
  };

  const clock = ms => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const drawWave = level => {
    if (!waveCanvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = waveCanvas.getBoundingClientRect();
    const W = Math.max(1, Math.round(rect.width * dpr));
    const H = Math.max(1, Math.round(rect.height * dpr));
    if (waveCanvas.width !== W || waveCanvas.height !== H) {
      waveCanvas.width = W;
      waveCanvas.height = H;
    }
    const ctx = waveCanvas.getContext('2d');
    if (!ctx) return;
    const accent = getComputedStyle(root).getPropertyValue('--vp-accent').trim() || '#f5f5f5';
    st.acc = Math.max(st.acc, level);
    st.tick = (st.tick + 1) % WAVE_EVERY;
    if (st.tick === 0) {
      st.hist.push(st.acc);
      st.acc = 0;
      if (st.hist.length > WAVE_MAX) st.hist.shift();
    }
    const bw = 2 * dpr;
    const step = 3 * dpr;
    const shift = (st.tick / WAVE_EVERY) * step;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = accent;
    for (let i = 0; i < st.hist.length; i += 1) {
      const v = st.hist[st.hist.length - 1 - i];
      const x = W - (i + 1) * step - shift;
      if (x + bw < 0) break;
      const h = Math.max(bw, (CFG.floor + (1 - CFG.floor) * v) * H);
      const t = Math.min(1, Math.max(0, (x + bw / 2) / (W * 0.55)));
      const fade = t * t * (3 - 2 * t);
      ctx.globalAlpha = (0.35 + 0.65 * v) * fade;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(x, (H - h) / 2, bw, h, bw / 2);
      else ctx.rect(x, (H - h) / 2, bw, h);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const frame = now => {
    const dt = Math.min((now - st.last) / 1000, DT_MAX);
    st.last = now;
    const target = st.listening ? Math.min(1, simulatedLevel((now - st.t0) / 1000) * CFG.sensitivity) : 0;
    const tau = Math.max(1, target > st.env ? CFG.attack : CFG.release) / 1000;
    st.env += (target - st.env) * (1 - Math.exp(-dt / tau));
    if (st.listening && timeEl) {
      const text = clock(now - st.startedAt);
      if (timeEl.textContent !== text) timeEl.textContent = text;
    }
    if (st.listening && !reducedMotion.matches) drawWave(st.env);
    st.raf = st.listening ? requestAnimationFrame(frame) : 0;
  };

  const startSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      end('error');
      onStatus('Seu navegador não suporta ditado por voz. Digite a descrição do lote.', 'warn');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    st.recognition = recognition;
    onStatus('Ouvindo… fale o insumo, lote e validade (ou arraste para a esquerda para cancelar).', 'ok');

    recognition.onresult = event => {
      if (st.recognition !== recognition) return;
      st.recognition = null;
      end('result');
      onTranscript(event.results[0][0].transcript);
    };
    recognition.onerror = event => {
      if (st.recognition !== recognition) return;
      st.recognition = null;
      end('error');
      onStatus('Não foi possível capturar o áudio. Verifique a permissão do microfone ou digite o texto.', 'error');
    };
    recognition.onend = () => {
      if (st.recognition !== recognition) return;
      st.recognition = null;
      end('speech-end');
      onStatus('Nenhuma fala reconhecida. Tente novamente ou digite a descrição.', 'warn');
    };
    try {
      recognition.start();
    } catch {
      st.recognition = null;
      end('error');
      onStatus('Não foi possível iniciar o ditado. Digite a descrição do lote.', 'error');
    }
  };

  const stopSpeech = abort => {
    const rec = st.recognition;
    if (!rec) return;
    // Ao soltar, o navegador ainda pode devolver a transcrição. Ao cancelar, ela é descartada.
    if (abort) st.recognition = null;
    try {
      if (abort) rec.abort();
      else rec.stop();
    } catch {
      st.recognition = null;
    }
  };

  const begin = kind => {
    if (st.listening || root.disabled) return;
    stopSpeech(true);
    st.listening = true;
    st.hist = [];
    st.tick = 0;
    st.acc = 0;
    st.env = 0;
    st.startedAt = performance.now();
    st.t0 = st.startedAt;
    st.last = st.startedAt;
    if (timeEl) timeEl.textContent = '0:00';
    root.dataset.state = 'listening';
    root.dataset.input = kind;
    root.setAttribute('aria-pressed', 'true');
    root.setAttribute('aria-label', 'Parar ditado por voz');
    if (!st.raf) st.raf = requestAnimationFrame(frame);
    startSpeech();
  };

  const end = reason => {
    // Reset também descarta transcrições que ainda chegariam depois de soltar o botão.
    const discard = ['cancel', 'escape', 'reset'].includes(reason);
    if (discard) stopSpeech(true);
    if (!st.listening) return;
    st.listening = false;
    if (st.raf) {
      cancelAnimationFrame(st.raf);
      st.raf = 0;
    }
    root.dataset.state = 'idle';
    root.dataset.input = (reason === 'key' || reason === 'escape') ? 'key' : 'pointer';
    root.setAttribute('aria-pressed', 'false');
    root.setAttribute('aria-label', 'Ditar mensagem por voz');
    if (reason === 'cancel' || reason === 'escape') {
      onStatus('Ditado cancelado.', 'warn');
    } else if (!discard && reason !== 'result' && reason !== 'error' && reason !== 'speech-end') {
      stopSpeech(false);
    }
  };

  const settleSlide = () => {
    st.sliding = false;
    delete root.dataset.sliding;
    root.style.setProperty('--vp-slide', '0px');
    root.style.setProperty('--vp-cancel', '0');
  };

  root.addEventListener('pointerdown', e => {
    if (root.disabled || e.button !== 0 || !e.isPrimary || st.pointerId !== null) return;
    st.pointerId = e.pointerId;
    st.downX = e.clientX;
    st.downAt = performance.now();
    try { root.setPointerCapture(e.pointerId); } catch {}
    root.dataset.pressed = '';
    st.ownPress = !st.listening;
    if (!st.listening) begin('pointer');
  });

  root.addEventListener('pointermove', e => {
    if (st.pointerId !== e.pointerId || !CFG.slideToCancel || !st.listening || !st.ownPress) return;
    const dx = e.clientX - st.downX;
    if (!st.sliding && dx > -SLIDE_MIN) return;
    st.sliding = true;
    root.dataset.sliding = '';
    const pull = Math.min(CFG.cancelDistance + 24, Math.max(0, -dx));
    root.style.setProperty('--vp-slide', `${-pull}px`);
    const progress = Math.min(1, pull / CFG.cancelDistance);
    root.style.setProperty('--vp-cancel', progress.toFixed(3));
    if (progress >= 1) {
      settleSlide();
      end('cancel');
    }
  });

  const onPointerUp = e => {
    if (e.pointerId !== st.pointerId) return;
    st.pointerId = null;
    delete root.dataset.pressed;
    if (st.sliding) settleSlide();
    try { if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId); } catch {}
    if (!st.listening) return;
    if (e.type !== 'pointerup') {
      end('cancel');
      return;
    }
    const held = performance.now() - st.downAt;
    const isHold = CFG.mode === 'hold' || (CFG.mode === 'auto' && held >= CFG.holdAfter);
    if (st.ownPress) {
      if (isHold) end('release');
    } else {
      end(held < CFG.holdAfter ? 'tap' : 'release');
    }
  };

  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', onPointerUp);
  root.addEventListener('lostpointercapture', onPointerUp);
  root.addEventListener('contextmenu', e => e.preventDefault());

  root.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      end('escape');
      return;
    }
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      if (st.listening) end('key');
      else begin('key');
    }
  });

  // Acionamentos sintéticos, como os de leitores de tela, chegam sem evento de ponteiro.
  root.addEventListener('click', e => {
    if (e.detail !== 0) return;
    if (st.listening) end('key');
    else begin('key');
  });

  window.addEventListener('blur', () => { if (root.hasAttribute('data-pressed')) end('blur'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) end('reset'); });

  return { cancel: () => end('reset') };
}
