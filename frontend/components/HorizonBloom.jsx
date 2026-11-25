import React, { useEffect, useRef } from 'react';

// Partículas sutis geradas de forma determinística para compor o brilho atmosférico acima do horizonte.
const PARTICULAS = Array.from({ length: 42 }, (_, i) => ({
  x: ((i * 73 + 19) % 100) / 100,
  y: ((i * 41 + 11) % 62) / 100,
  raio: 0.7 + ((i * 17) % 10) * 0.14,
  fase: (i * 0.91) % (Math.PI * 2),
  velocidade: 0.4 + ((i * 13) % 7) * 0.12,
}));

// Paleta do efeito Horizon Bloom alinhada ao style-guide.md (Aço Inox) e aos temas da Sync.
function paletaHorizonte(claro) {
  if (claro) {
    return {
      haloExterno: ['rgba(168, 213, 221, 0.42)', 'rgba(42, 127, 142, 0.22)', 'rgba(15, 76, 92, 0)'],
      haloNucleo: ['rgba(255, 255, 255, 0.92)', 'rgba(168, 213, 221, 0.52)', 'rgba(42, 127, 142, 0)'],
      bordaPlaneta: ['rgba(15, 76, 92, 0.04)', 'rgba(42, 127, 142, 0.58)', 'rgba(168, 213, 221, 0.92)', 'rgba(42, 127, 142, 0.58)', 'rgba(15, 76, 92, 0.04)'],
      corpoPlaneta: ['rgba(15, 76, 92, 0.18)', 'rgba(15, 76, 92, 0.06)', 'rgba(245, 249, 246, 0)'],
      particula: [15, 76, 92],
      opacidadeParticula: 0.34,
    };
  }
  return {
    haloExterno: ['rgba(82, 236, 255, 0.34)', 'rgba(42, 127, 142, 0.28)', 'rgba(15, 76, 92, 0)'],
    haloNucleo: ['rgba(238, 252, 255, 0.95)', 'rgba(168, 213, 221, 0.55)', 'rgba(42, 127, 142, 0)'],
    bordaPlaneta: ['rgba(15, 76, 92, 0)', 'rgba(42, 127, 142, 0.72)', 'rgba(168, 213, 221, 0.96)', 'rgba(42, 127, 142, 0.72)', 'rgba(15, 76, 92, 0)'],
    corpoPlaneta: ['#081322', '#060b1b', '#040814'],
    particula: [168, 213, 221],
    opacidadeParticula: 0.62,
  };
}

// Renderiza um amanhecer luminoso nascendo sobre a borda curva de um planeta escuro em Canvas 2D,
// sem dependências externas, pausando fora do viewport e respeitando prefers-reduced-motion.
export default function HorizonBloom({ speed = 1, className = '' }) {
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
    const inicio = performance.now();
    let temaClaro = document.documentElement.dataset.theme === 'light';
    const movimentoReduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const redimensionar = () => {
      const caixa = canvas.parentElement?.getBoundingClientRect();
      largura = Math.max(1, Math.floor(caixa?.width || window.innerWidth));
      altura = Math.max(1, Math.floor(caixa?.height || 540));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(largura * dpr);
      canvas.height = Math.floor(altura * dpr);
      canvas.style.width = `${largura}px`;
      canvas.style.height = `${altura}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const desenhar = (tempoMs) => {
      const t = ((tempoMs - inicio) / 1000) * speed;
      const cores = paletaHorizonte(temaClaro);
      ctx.clearRect(0, 0, largura, altura);

      // Geometria do planeta escuro posicionado abaixo da base da seção hero.
      const raio = Math.max(largura * 1.05, altura * 1.75);
      const centroX = largura * 0.5;
      const topoHorizonteY = altura * 0.80;
      const centroY = topoHorizonteY + raio;

      // Posição e pulsação suave do amanhecer nascendo sobre a crista do planeta.
      const derivaX = Math.sin(t * 0.28) * Math.min(largura * 0.06, 56);
      const pulso = 1 + Math.sin(t * 0.75) * 0.06;
      const solX = centroX + derivaX;
      const dx = solX - centroX;
      const solY = centroY - Math.sqrt(Math.max(1, raio * raio - dx * dx));

      // 1. Poeira atmosférica sutil na parte superior do céu.
      for (const p of PARTICULAS) {
        const brilho = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * p.velocidade + p.fase));
        const px = p.x * largura;
        const py = p.y * altura;
        ctx.fillStyle = `rgba(${cores.particula[0]}, ${cores.particula[1]}, ${cores.particula[2]}, ${(brilho * cores.opacidadeParticula).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, p.raio, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Halo atmosférico amplo (bloom externo) se espalhando acima do horizonte.
      const raioExterno = Math.max(largura * 0.52, 340) * pulso;
      ctx.save();
      ctx.translate(solX, solY);
      ctx.scale(1.45, 0.72);
      const gradExterno = ctx.createRadialGradient(0, 0, 0, 0, 0, raioExterno);
      gradExterno.addColorStop(0, cores.haloExterno[0]);
      gradExterno.addColorStop(0.45, cores.haloExterno[1]);
      gradExterno.addColorStop(1, cores.haloExterno[2]);
      ctx.fillStyle = gradExterno;
      ctx.beginPath();
      ctx.arc(0, 0, raioExterno, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Núcleo solar concentrado rompendo a borda do planeta.
      const raioNucleo = Math.max(largura * 0.16, 110) * pulso;
      ctx.save();
      ctx.translate(solX, solY - 2);
      ctx.scale(1.85, 0.55);
      const gradNucleo = ctx.createRadialGradient(0, 0, 0, 0, 0, raioNucleo);
      gradNucleo.addColorStop(0, cores.haloNucleo[0]);
      gradNucleo.addColorStop(0.38, cores.haloNucleo[1]);
      gradNucleo.addColorStop(1, cores.haloNucleo[2]);
      ctx.fillStyle = gradNucleo;
      ctx.beginPath();
      ctx.arc(0, 0, raioNucleo, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4. Corpo escuro do planeta recortando a base do brilho.
      const gradPlaneta = ctx.createLinearGradient(0, topoHorizonteY, 0, altura);
      gradPlaneta.addColorStop(0, cores.corpoPlaneta[0]);
      gradPlaneta.addColorStop(0.45, cores.corpoPlaneta[1]);
      gradPlaneta.addColorStop(1, cores.corpoPlaneta[2]);
      ctx.fillStyle = gradPlaneta;
      ctx.beginPath();
      ctx.arc(centroX, centroY, raio, Math.PI * 1.15, Math.PI * 1.85);
      ctx.lineTo(largura, altura);
      ctx.lineTo(0, altura);
      ctx.closePath();
      ctx.fill();

      // 5. Filete luminoso atmosférico percorrendo a curva superior do planeta.
      const gradBorda = ctx.createLinearGradient(0, topoHorizonteY, largura, topoHorizonteY);
      gradBorda.addColorStop(0, cores.bordaPlaneta[0]);
      gradBorda.addColorStop(0.25, cores.bordaPlaneta[1]);
      gradBorda.addColorStop(0.5, cores.bordaPlaneta[2]);
      gradBorda.addColorStop(0.75, cores.bordaPlaneta[3]);
      gradBorda.addColorStop(1, cores.bordaPlaneta[4]);

      ctx.save();
      ctx.beginPath();
      ctx.arc(centroX, centroY, raio, Math.PI * 1.24, Math.PI * 1.76);
      ctx.strokeStyle = gradBorda;
      ctx.lineWidth = 3.2;
      ctx.shadowColor = temaClaro ? 'rgba(42, 127, 142, 0.45)' : 'rgba(82, 236, 255, 0.85)';
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();
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
        desenhar(inicio + 1200);
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
        if (movimentoReduzido) desenhar(inicio + 1200);
      })
      : null;
    if (observadorTamanho && canvas.parentElement) observadorTamanho.observe(canvas.parentElement);

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

    // Atualiza as cores instantaneamente ao trocar entre tema escuro e claro.
    const observadorTema = new MutationObserver(() => {
      temaClaro = document.documentElement.dataset.theme === 'light';
      if (movimentoReduzido) desenhar(inicio + 1200);
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
  }, [speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`horizon-bloom-canvas ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
