import React, { useEffect, useId, useRef, useState } from 'react';

// Implementação em JavaScript + CSS puro do componente GlassSurface (@react-bits/GlassSurface-JS-CSS),
// sem dependência de Tailwind, aplicando refração líquida via filtro SVG e fallback CSS backdrop-filter.
export default function GlassSurface({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  opacity = 0.93,
  blur = 11,
  displace = 0.5,
  backgroundOpacity = 0.1,
  saturation = 1.2,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = 'R',
  yChannel = 'G',
  mixBlendMode = 'difference',
  shape = null,
  backdrop = null,
  refraction = true,
  renderer = 'auto',
  className = '',
  style = {},
}) {
  const idBase = useId().replace(/:/g, '-');
  const filtroId = `glass-filter-${idBase}`;
  const gradienteVermelhoId = `red-grad-${idBase}`;
  const gradienteAzulId = `blue-grad-${idBase}`;

  const containerRef = useRef(null);
  const feImageRef = useRef(null);
  const redChannelRef = useRef(null);
  const greenChannelRef = useRef(null);
  const blueChannelRef = useRef(null);
  const gaussianBlurRef = useRef(null);
  const [svgSuportado, definirSvgSuportado] = useState(false);

  // Gera o mapa de deslocamento SVG proporcional ao tamanho real do elemento.
  const gerarMapaDeslocamento = () => {
    const retangulo = containerRef.current?.getBoundingClientRect();
    const larguraAtual = Math.max(1, Math.round(retangulo?.width || (typeof width === 'number' ? width : 320)));
    const alturaAtual = Math.max(1, Math.round(retangulo?.height || (typeof height === 'number' ? height : 52)));
    const borda = Math.min(larguraAtual, alturaAtual) * (borderWidth * 0.5);

    const conteudoSvg = `
      <svg viewBox="0 0 ${larguraAtual} ${alturaAtual}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gradienteVermelhoId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${gradienteAzulId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${larguraAtual}" height="${alturaAtual}" fill="black"></rect>
        <rect x="0" y="0" width="${larguraAtual}" height="${alturaAtual}" rx="${borderRadius}" fill="url(#${gradienteVermelhoId})" />
        <rect x="0" y="0" width="${larguraAtual}" height="${alturaAtual}" rx="${borderRadius}" fill="url(#${gradienteAzulId})" style="mix-blend-mode: ${mixBlendMode}" />
        <rect x="${borda}" y="${borda}" width="${Math.max(1, larguraAtual - borda * 2)}" height="${Math.max(1, alturaAtual - borda * 2)}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" />
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(conteudoSvg)}`;
  };

  const atualizarMapa = () => {
    feImageRef.current?.setAttribute('href', gerarMapaDeslocamento());
  };

  useEffect(() => {
    // Respeita a preferência de movimento reduzido e detecta suporte a backdrop-filter com URL SVG.
    const movimentoReduzido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!refraction || movimentoReduzido || renderer === 'css') {
      definirSvgSuportado(false);
      return;
    }
    const webkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const firefox = /Firefox/.test(navigator.userAgent);
    if (webkit || firefox) {
      definirSvgSuportado(false);
      return;
    }
    const teste = document.createElement('div');
    teste.style.backdropFilter = `url(#${filtroId})`;
    definirSvgSuportado(teste.style.backdropFilter !== '');
  }, [filtroId, refraction, renderer]);

  useEffect(() => {
    atualizarMapa();
    [
      { ref: redChannelRef, offset: redOffset },
      { ref: greenChannelRef, offset: greenOffset },
      { ref: blueChannelRef, offset: blueOffset },
    ].forEach(({ ref, offset }) => {
      if (!ref.current) return;
      ref.current.setAttribute('scale', String(distortionScale + offset));
      ref.current.setAttribute('xChannelSelector', xChannel);
      ref.current.setAttribute('yChannelSelector', yChannel);
    });
    gaussianBlurRef.current?.setAttribute('stdDeviation', String(displace));
  }, [
    width, height, borderRadius, borderWidth, brightness, opacity, blur,
    displace, distortionScale, redOffset, greenOffset, blueOffset, xChannel, yChannel, mixBlendMode, backdrop,
  ]);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(() => setTimeout(atualizarMapa, 0));
    observador.observe(containerRef.current);
    return () => observador.disconnect();
  }, []);

  const estiloContainer = {
    ...style,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    '--glass-frost': backgroundOpacity,
    '--glass-saturation': saturation,
    '--glass-blur': `${blur}px`,
    '--filter-id': `url(#${filtroId})`,
    ...(shape ? { maskImage: `url(${shape})`, WebkitMaskImage: `url(${shape})`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' } : {}),
  };

  return (
    <div
      ref={containerRef}
      className={`glass-surface ${svgSuportado ? 'glass-surface--svg' : 'glass-surface--fallback'} ${className}`.trim()}
      style={estiloContainer}
    >
      <svg className="glass-surface__filter" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <filter id={filtroId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
            <feImage ref={feImageRef} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
            <feDisplacementMap ref={redChannelRef} in="SourceGraphic" in2="map" result="dispRed" />
            <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
            <feDisplacementMap ref={greenChannelRef} in="SourceGraphic" in2="map" result="dispGreen" />
            <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />
            <feDisplacementMap ref={blueChannelRef} in="SourceGraphic" in2="map" result="dispBlue" />
            <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />
            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur ref={gaussianBlurRef} in="output" stdDeviation={displace} />
          </filter>
        </defs>
      </svg>
      <div className="glass-surface__content">{children}</div>
    </div>
  );
}
