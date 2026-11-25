import React, { useEffect, useRef } from 'react';

// Caracteres ASCII usados para compor os fluxos ao longo das faixas de luz da Sync / VisionChef.
const CARACTERES_PADRAO = '.:-=+*#%@/<>01SYNC';

// Define faixas senoidais com profundidades, velocidades e espaçamentos próprios.
const FAIXAS = [
  { alturaRelativa: 0.24, amplitude: 34, frequencia: 0.0042, velocidade: 0.52, passo: 17, espessura: 24, fonte: 13 },
  { alturaRelativa: 0.44, amplitude: 46, frequencia: 0.0033, velocidade: -0.38, passo: 16, espessura: 30, fonte: 14 },
  { alturaRelativa: 0.64, amplitude: 38, frequencia: 0.0049, velocidade: 0.44, passo: 18, espessura: 26, fonte: 13 },
  { alturaRelativa: 0.80, amplitude: 28, frequencia: 0.0038, velocidade: -0.32, passo: 19, espessura: 22, fonte: 12 },
];

// Paletas derivadas do style-guide.md (Aço Inox) e dos tokens da abertura da Sync.
function coresDoTema(claro) {
  if (claro) {
    return {
      faixas: ['rgba(15, 76, 92, 0.08)', 'rgba(42, 127, 142, 0.11)', 'rgba(168, 213, 221, 0.20)', 'rgba(15, 76, 92, 0.07)'],
      textoBase: [15, 76, 92],
      textoDestaque: [42, 127, 142],
      opacidadeMax: 0.42,
    };
  }
  return {
    faixas: ['rgba(42, 127, 142, 0.14)', 'rgba(82, 236, 255, 0.12)', 'rgba(168, 213, 221, 0.11)', 'rgba(15, 76, 92, 0.22)'],
    textoBase: [168, 213, 221],
    textoDestaque: [82, 236, 255],
    opacidadeMax: 0.58,
  };
}

// Renderiza fluxos de caracteres ASCII deslizando sobre faixas luminosas em Canvas 2D,
// sem dependências externas, pausando fora da tela e respeitando prefers-reduced-motion.
export default function AsciiStream({
  characters = CARACTERES_PADRAO,
  speed = 1,
  className = '',
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let largura = 0;
    let altura = 0;
    let dpr = 1;
    let quadroId = 0;
    let visivel = true;
    let inicio = performance.now();
    let temaClaro = document.documentElement.dataset.theme === 'light';
    const movimentoReduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const redimensionar = () => {
      const caixa = canvas.parentElement?.getBoundingClientRect();
      largura = Math.max(1, Math.floor(caixa?.width || window.innerWidth));
      altura = Math.max(1, Math.floor(caixa?.height || 520));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(largura * dpr);
      canvas.height = Math.floor(altura * dpr);
      canvas.style.width = `${largura}px`;
      canvas.style.height = `${altura}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const desenhar = (tempoMs) => {
      const t = ((tempoMs - inicio) / 1000) * speed;
      const paleta = coresDoTema(temaClaro);
      ctx.clearRect(0, 0, largura, altura);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      FAIXAS.forEach((faixa, indice) => {
        const centroY = altura * faixa.alturaRelativa;
        const fase = t * faixa.velocidade * 1.8 + indice * 1.45;
        const gradiente = ctx.createLinearGradient(0, centroY - faixa.amplitude, largura, centroY + faixa.amplitude);
        gradiente.addColorStop(0, 'rgba(15, 76, 92, 0)');
        gradiente.addColorStop(0.22, paleta.faixas[indice % paleta.faixas.length]);
        gradiente.addColorStop(0.78, paleta.faixas[indice % paleta.faixas.length]);
        gradiente.addColorStop(1, 'rgba(15, 76, 92, 0)');

        // Desenha a faixa de luz suave atrás da trilha de caracteres.
        ctx.save();
        ctx.beginPath();
        for (let x = 0; x <= largura + 24; x += 24) {
          const y = centroY
            + Math.sin(x * faixa.frequencia + fase) * faixa.amplitude
            + Math.cos(x * faixa.frequencia * 0.55 - fase * 0.65) * (faixa.amplitude * 0.35);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = gradiente;
        ctx.lineWidth = faixa.espessura;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        // Desenha os caracteres ASCII deslizando ao longo da curva da faixa.
        ctx.font = `600 ${faixa.fonte}px ui-monospace, 'Cascadia Mono', Consolas, monospace`;
        const deslocamento = ((t * faixa.velocidade * 46) % faixa.passo + faixa.passo) % faixa.passo;
        for (let coluna = -1; coluna * faixa.passo <= largura + faixa.passo; coluna += 1) {
          const x = coluna * faixa.passo + deslocamento;
          if (x < -12 || x > largura + 12) continue;
          const progressoX = x / Math.max(1, largura);
          // Atenua as extremidades horizontais para integrar a animação suavemente ao fundo.
          const mascaraBorda = Math.sin(Math.min(1, Math.max(0, progressoX)) * Math.PI);
          const y = centroY
            + Math.sin(x * faixa.frequencia + fase) * faixa.amplitude
            + Math.cos(x * faixa.frequencia * 0.55 - fase * 0.65) * (faixa.amplitude * 0.35);

          const pulso = 0.5 + 0.5 * Math.sin(x * 0.016 - t * 2.2 * Math.sign(faixa.velocidade) + indice * 1.7);
          const alpha = Math.max(0, Math.min(1, mascaraBorda * (0.18 + pulso * paleta.opacidadeMax)));
          if (alpha < 0.04) continue;

          const indiceChar = Math.abs(Math.floor(coluna + indice * 7 + Math.floor(t * 2.4))) % characters.length;
          const cor = pulso > 0.72 ? paleta.textoDestaque : paleta.textoBase;
          ctx.fillStyle = `rgba(${cor[0]}, ${cor[1]}, ${cor[2]}, ${alpha.toFixed(3)})`;
          ctx.fillText(characters[indiceChar], x, y);
        }
      });
    };

    const animar = (agora) => {
      if (!visivel || document.visibilityState === 'hidden') {
        quadroId = 0;
        return;
      }
      desenhar(agora);
      quadroId = window.requestAnimationFrame(animar);
    };

    const iniciar = () => {
      if (movimentoReduzido) {
        desenhar(inicio + 1500);
        return;
      }
      if (!quadroId && visivel && document.visibilityState === 'visible') {
        quadroId = window.requestAnimationFrame(animar);
      }
    };

    redimensionar();
    iniciar();

    const observadorTamanho = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
        redimensionar();
        if (movimentoReduzido) desenhar(inicio + 1500);
      })
      : null;
    if (observadorTamanho && canvas.parentElement) observadorTamanho.observe(canvas.parentElement);

    // Pausa o loop quando a seção hero sai da janela visível.
    const observadorVisibilidade = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entrada]) => {
        visivel = Boolean(entrada?.isIntersecting);
        if (visivel) iniciar();
        else if (quadroId) {
          window.cancelAnimationFrame(quadroId);
          quadroId = 0;
        }
      }, { threshold: 0.02 })
      : null;
    if (observadorVisibilidade) observadorVisibilidade.observe(canvas);

    // Atualiza as cores instantaneamente quando o usuário alterna entre tema escuro e claro.
    const observadorTema = new MutationObserver(() => {
      temaClaro = document.documentElement.dataset.theme === 'light';
      if (movimentoReduzido) desenhar(inicio + 1500);
    });
    observadorTema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const aoMudarAba = () => {
      if (document.visibilityState === 'visible') iniciar();
      else if (quadroId) {
        window.cancelAnimationFrame(quadroId);
        quadroId = 0;
      }
    };
    document.addEventListener('visibilitychange', aoMudarAba);

    return () => {
      if (quadroId) window.cancelAnimationFrame(quadroId);
      observadorTamanho?.disconnect();
      observadorVisibilidade?.disconnect();
      observadorTema.disconnect();
      document.removeEventListener('visibilitychange', aoMudarAba);
    };
  }, [characters, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`ascii-stream-canvas ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
