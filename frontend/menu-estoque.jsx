import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Calendar01Icon,
  ChartLineData01Icon,
  Home01Icon,
  TruckDeliveryIcon,
  UserGroup03Icon
} from '@hugeicons/core-free-icons';
import Dock from './components/Dock.jsx';
import BellToggle from './components/BellToggle.jsx';
import './components/Dock.css';
import './components/BellToggle.css';

const glyph = icon => <HugeiconsIcon icon={icon} size={24} strokeWidth={1.8} aria-hidden="true" />;

const TEMAS_DOCK = {
  dark: {
    '--dock-panel': 'rgba(13, 27, 40, .96)',
    '--dock-panel-edge': 'rgba(83, 170, 185, .58)',
    '--dock-panel-highlight': 'rgba(210, 243, 248, .12)',
    '--dock-panel-shadow': '0 16px 38px -14px rgba(0, 0, 0, .78), 0 5px 14px rgba(0, 0, 0, .38)',
    '--dock-tile': 'linear-gradient(160deg, #286a78 0%, #0f4c5c 100%)',
    '--dock-tile-edge': 'rgba(168, 213, 221, .64)',
    '--dock-tile-highlight': 'rgba(255, 255, 255, .22)',
    '--dock-tile-shadow': '0 4px 10px rgba(0, 0, 0, .38)',
    '--dock-ink': '#f4fbfc',
    '--dock-label': '#eaf5f7',
    '--dock-label-ink': '#0f4c5c',
    '--dock-dot': '#77dbe8',
    '--dock-separator': 'rgba(168, 213, 221, .42)',
    '--dock-press': 'brightness(.78)',
    '--dock-menu': 'rgba(10, 28, 40, .98)',
    '--dock-menu-edge': 'rgba(83, 170, 185, .7)',
    '--dock-menu-ink': '#f4fbfc',
    '--dock-menu-muted': 'rgba(220, 240, 244, .48)',
    '--dock-menu-separator': 'rgba(168, 213, 221, .24)',
    '--dock-menu-shadow': '0 18px 40px -12px rgba(0, 0, 0, .72), 0 3px 10px rgba(0, 0, 0, .3)'
  },
  light: {
    '--dock-panel': 'rgba(238, 246, 248, .97)',
    '--dock-panel-edge': 'rgba(42, 127, 142, .52)',
    '--dock-panel-highlight': 'rgba(255, 255, 255, .98)',
    '--dock-panel-shadow': '0 16px 38px -14px rgba(15, 76, 92, .26), 0 5px 14px rgba(15, 76, 92, .12)',
    '--dock-tile': 'linear-gradient(160deg, #ffffff 0%, #e6f3f6 100%)',
    '--dock-tile-edge': 'rgba(42, 127, 142, .48)',
    '--dock-tile-highlight': 'rgba(255, 255, 255, 1)',
    '--dock-tile-shadow': '0 4px 10px rgba(15, 76, 92, .18)',
    '--dock-ink': '#0f4c5c',
    '--dock-label': '#0f4c5c',
    '--dock-label-ink': '#ffffff',
    '--dock-dot': '#2a7f8e',
    '--dock-separator': 'rgba(42, 127, 142, .38)',
    '--dock-press': 'brightness(.92)',
    '--dock-menu': 'rgba(249, 252, 253, .99)',
    '--dock-menu-edge': 'rgba(42, 127, 142, .48)',
    '--dock-menu-ink': '#18343a',
    '--dock-menu-muted': 'rgba(24, 52, 58, .46)',
    '--dock-menu-separator': 'rgba(42, 127, 142, .2)',
    '--dock-menu-shadow': '0 18px 40px -14px rgba(15, 76, 92, .28), 0 3px 10px rgba(15, 76, 92, .12)'
  }
};

// O menu reage ao perfil e à tela ativa emitidos pela aplicação de estoque.
function NavegacaoEstoque() {
  const [tema, setTema] = useState(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const [podeGerenciar, setPodeGerenciar] = useState(false);
  const [modulo, setModulo] = useState('inventario');
  useEffect(() => {
    // Sincroniza o tema sem duplicar o controle já exibido no cabeçalho.
    const observador = new MutationObserver(() => setTema(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const perfil = (evento) => setPodeGerenciar(Boolean(evento.detail?.podeGerenciar));
    const tela = (evento) => setModulo(evento.detail?.modulo || 'inventario');
    window.addEventListener('visionchef:perfil', perfil);
    window.addEventListener('visionchef:modulo', tela);
    return () => { observador.disconnect(); window.removeEventListener('visionchef:perfil', perfil); window.removeEventListener('visionchef:modulo', tela); };
  }, []);
  const navegar = useCallback((destino) => {
    window.dispatchEvent(new CustomEvent('visionchef:navegar-modulo', { detail: { modulo: destino } }));
  }, []);
  const itens = useMemo(() => [
    { icon: glyph(Home01Icon), label: 'Estoque', active: modulo === 'inventario', onClick: () => navegar('inventario') },
    { icon: glyph(Calendar01Icon), label: 'Controle de validade', active: modulo === 'estoque', onClick: () => navegar('estoque') },
    ...(podeGerenciar ? [
      { icon: glyph(ChartLineData01Icon), label: 'Relatório de desperdício', active: modulo === 'desperdicio', onClick: () => navegar('desperdicio') },
      { separator: true },
      { icon: glyph(UserGroup03Icon), label: 'Equipe', active: modulo === 'equipe', onClick: () => navegar('equipe') },
      // Mantém a destinação social em módulo próprio e só mostra o atalho a dono e gerente.
      { icon: <span aria-hidden="true" className="icone-causa-dock">♡</span>, label: 'Causa social', active: modulo === 'causa', onClick: () => navegar('causa') }
    ] : []),
    { icon: glyph(TruckDeliveryIcon), label: 'Fornecedores', active: modulo === 'fornecedores', onClick: () => navegar('fornecedores') }
  ], [podeGerenciar, modulo, navegar]);
  return <Dock items={itens} ariaLabel="Navegação do restaurante" theme={tema}
    baseItemSize={50} magnification={70} panelHeight={68} accentColor="#2a7f8e"
    badgeColor="#d73535" position="bottom" distance={200} gap={10} roundness={0.5}
    bounce tiles showLabels showIndicators showBadges autoHide={false}
    className="dock-visionchef" style={TEMAS_DOCK[tema]} />;
}

// O sino sincroniza o contador e a expansão do painel acessível do cabeçalho.
function SinoNotificacoes() {
  const [tema, setTema] = useState(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const [aberto, setAberto] = useState(false);
  const [contagem, setContagem] = useState(0);
  useEffect(() => {
    const observador = new MutationObserver(() => setTema(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const estado = (evento) => setAberto(Boolean(evento.detail?.aberto));
    const quantidade = (evento) => setContagem(Number(evento.detail?.quantidade) || 0);
    window.addEventListener('visionchef:estado-notificacoes', estado);
    window.addEventListener('visionchef:contagem-notificacoes', quantidade);
    return () => { observador.disconnect(); window.removeEventListener('visionchef:estado-notificacoes', estado); window.removeEventListener('visionchef:contagem-notificacoes', quantidade); };
  }, []);
  const cores = tema === 'light'
    ? { color: '#0f4c5c', background: 'rgba(255,255,255,.78)', onColor: '#ffffff', onBackground: '#2a7f8e' }
    : { color: '#ffffff', background: 'rgba(15,76,92,.92)', onColor: '#0f4c5c', onBackground: '#a8d5dd' };
  return <BellToggle offLabel="Avisos" onLabel="Fechar avisos"
    label={aberto ? 'Fechar notificações de validade' : 'Abrir notificações de validade'}
    controls="painel-notificacoes-validade" {...cores} size="md" radius={16}
    ringAmplitude={17} ringPasses={5} ringDecay={1} ringDuration={820} ringPivot={16}
    crossfadeMs={200} revealBounce={0} count={contagem} badge badgeColor="#d73535"
    waves clapper={false} pressed={aberto}
    onChange={() => window.dispatchEvent(new CustomEvent('visionchef:alternar-notificacoes'))}
    className="bell-toggle-visionchef" />;
}

const navRoot = document.getElementById('dock-nav-root');
const bellRoot = document.getElementById('sino-notificacoes-root');
if (navRoot && bellRoot) {
  // Duas raízes mantêm as animações do menu independentes do sino.
  createRoot(navRoot).render(<NavegacaoEstoque />);
  createRoot(bellRoot).render(<SinoNotificacoes />);
}
