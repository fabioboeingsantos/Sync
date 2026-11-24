(() => {
  const STORAGE_KEY = 'visionchef-theme';
  const root = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  const getInitialTheme = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (_) {}
    return 'dark';
  };

  const applyTheme = (theme, persist = false) => {
    root.dataset.theme = theme;
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'light' ? '#f5f8f6' : '#060b1b');
    }

    const toggles = document.querySelectorAll('[data-theme-toggle]');
    toggles.forEach((btn) => {
      const isLight = theme === 'light';
      btn.setAttribute('aria-pressed', String(isLight));
      btn.setAttribute(
        'aria-label',
        isLight ? 'Modo claro ativo (Sol). Clique para ativar modo escuro (Lua).' : 'Modo escuro ativo (Lua). Clique para ativar modo claro (Sol).'
      );
      btn.setAttribute('title', isLight ? 'Mudar para modo escuro (Lua)' : 'Mudar para modo claro (Sol)');
    });

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (_) {}
    }
  };

  applyTheme(getInitialTheme(), false);

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(root.dataset.theme || 'dark', false);
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = root.dataset.theme === 'light' ? 'dark' : 'light';
        applyTheme(next, true);
      });
    });
  });
})();
