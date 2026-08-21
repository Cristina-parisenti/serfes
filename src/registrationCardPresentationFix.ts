export {};

const COMPLETED_REGISTRATION_KEY = 'serfes-athlete-registration-completed';
const PROFILE_SNAPSHOT_KEY = 'serfes-athlete-profile-final';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function markCompleted() {
  try {
    localStorage.setItem(COMPLETED_REGISTRATION_KEY, 'true');
  } catch {
    // Sem ação.
  }
}

function hiddenCadastroButton() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar-nav .nav-item')).find(
    (button) => text(button.textContent) === 'Meu cadastro',
  ) ?? null;
}

function openForm() {
  hiddenCadastroButton()?.click();
}

function userIcon() {
  const wrapper = document.createElement('span');
  wrapper.className = 'athlete-shortcut-icon profile';
  wrapper.setAttribute('aria-hidden', 'true');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.classList.add('lucide', 'lucide-user-round');

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '12');
  circle.setAttribute('cy', '8');
  circle.setAttribute('r', '5');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M20 21a8 8 0 0 0-16 0');

  svg.append(circle, path);
  wrapper.append(svg);
  return wrapper;
}

function cardCopy(titleText: string, descriptionText: string) {
  const copy = document.createElement('span');
  copy.className = 'athlete-card-copy';

  const title = document.createElement('strong');
  title.textContent = titleText;

  const description = document.createElement('small');
  description.textContent = descriptionText;

  copy.append(title, description);
  return copy;
}

function cardIsReady(card: HTMLElement) {
  const title = text(card.querySelector<HTMLElement>('.athlete-card-copy strong')?.textContent);
  const icon = card.querySelector<HTMLElement>('.athlete-shortcut-icon.profile');
  return card.dataset.registrationPresentation === 'saved' && title === 'Meu cadastro' && Boolean(icon);
}

function prepareCadastroCard(card: HTMLElement) {
  if (cardIsReady(card) && card.classList.contains('serfes-data-card')) return;

  card.dataset.registrationPresentation = 'saved';
  card.dataset.finalCard = 'saved';
  card.classList.remove('final-start-card');
  card.classList.add('registration-presentation-card');

  if (!card.classList.contains('serfes-data-card')) {
    delete card.dataset.registrationFlowCard;
    card.replaceChildren(
      userIcon(),
      cardCopy('Meu cadastro', 'Consulte as informações registradas no SERFES.'),
    );
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', 'Meu cadastro');

    const activate = () => openForm();
    card.onclick = activate;
    card.onkeydown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    };
    return;
  }

  const currentIcon = card.querySelector<HTMLElement>('.athlete-home-card-icon, .athlete-shortcut-icon');
  if (!currentIcon?.classList.contains('profile')) currentIcon?.replaceWith(userIcon());

  const title = card.querySelector<HTMLElement>('.athlete-card-copy strong');
  if (title && text(title.textContent) !== 'Meu cadastro') title.textContent = 'Meu cadastro';

  const description = card.querySelector<HTMLElement>('.athlete-card-copy small');
  if (description && text(description.textContent) !== 'Consulte as informações registradas no SERFES.') {
    description.textContent = 'Consulte as informações registradas no SERFES.';
  }

  card.setAttribute('aria-label', 'Meu cadastro');
}

function applyCardState() {
  const card = document.querySelector<HTMLElement>('.athlete-home-primary-card');
  if (!card) return;

  // O cadastro inicial ocorre antes do acesso à área do atleta.
  // Portanto, a página inicial nunca deve oferecer "Iniciar cadastro" novamente.
  prepareCadastroCard(card);
}

function successfulSubmitFinished(form: HTMLFormElement) {
  const formClosed = !document.documentElement.contains(form) || !document.querySelector('form.athlete-form');
  const returnedHome = Boolean(document.querySelector('.athlete-home-actions'));
  return formClosed && returnedHome;
}

function injectStyles() {
  if (document.getElementById('serfes-registration-card-presentation-styles')) return;

  const style = document.createElement('style');
  style.id = 'serfes-registration-card-presentation-styles';
  style.textContent = `
    .athlete-shortcut-icon.profile {
      color: #0b5aa6;
      background: #eaf3fb;
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 13px;
      flex: 0 0 42px;
    }
    .registration-presentation-card {
      display: grid !important;
      grid-template-columns: auto minmax(0, 1fr) !important;
      align-items: center !important;
      gap: 1rem !important;
      cursor: pointer;
    }
    .registration-presentation-card .athlete-card-copy {
      display: grid;
      gap: .25rem;
      min-width: 0;
    }
    .registration-presentation-card .athlete-card-copy strong {
      color: #143b63;
      font-size: .98rem;
    }
    .registration-presentation-card .athlete-card-copy small {
      color: #61758d;
      line-height: 1.4;
      font-size: .82rem;
    }
  `;
  document.head.append(style);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    injectStyles();
    applyCardState();
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.classList.contains('athlete-form')) return;

    window.setTimeout(() => {
      if (successfulSubmitFinished(form)) markCompleted();
      schedule();
    }, 350);
  }, true);

  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  window.addEventListener('focus', schedule);
  window.addEventListener('storage', (event) => {
    if (event.key === COMPLETED_REGISTRATION_KEY || event.key === PROFILE_SNAPSHOT_KEY) schedule();
  });

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}
