export {};

const STYLE_ID = 'serfes-athlete-sidebar-lock-style';
const HIDDEN_CLASS = 'serfes-hidden-cadastro-nav';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .sidebar-nav .${HIDDEN_CLASS} {
      display: none !important;
    }
  `;
  document.head.append(style);
}

function hideCadastroFromAthleteMenu() {
  installStyle();

  const navItems = Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar-nav .nav-item'));
  const cadastro = navItems.find((button) => text(button.textContent) === 'Meu cadastro');
  if (!cadastro) return;

  cadastro.classList.add(HIDDEN_CLASS);
  cadastro.setAttribute('aria-hidden', 'true');
  cadastro.tabIndex = -1;
}

let scheduled = false;
function scheduleHide() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    hideCadastroFromAthleteMenu();
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', scheduleHide, { once: true });
  window.addEventListener('focus', scheduleHide);

  const observer = new MutationObserver(scheduleHide);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
