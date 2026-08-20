export {};

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function cadastroNavButton() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar-nav .nav-item')).find(
    (button) => text(button.textContent) === 'Meu cadastro',
  ) ?? null;
}

function isStartRegistrationCard(element: Element | null) {
  const card = element?.closest<HTMLElement>('.athlete-home-primary-card');
  if (!card) return null;

  const label = text(card.textContent);
  const startState = card.dataset.registrationPresentation === 'start'
    || card.dataset.finalCard === 'start'
    || label.includes('Iniciar cadastro');

  return startState ? card : null;
}

function openRegistrationForm() {
  const button = cadastroNavButton();
  if (!button) return false;

  const hadHiddenClass = button.classList.contains('serfes-hidden-cadastro-nav');
  const previousDisplay = button.style.display;
  const previousAriaHidden = button.getAttribute('aria-hidden');
  const previousTabIndex = button.getAttribute('tabindex');

  button.classList.remove('serfes-hidden-cadastro-nav');
  button.style.display = '';
  button.removeAttribute('aria-hidden');
  button.removeAttribute('tabindex');

  button.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
  }));

  window.requestAnimationFrame(() => {
    if (hadHiddenClass) button.classList.add('serfes-hidden-cadastro-nav');
    button.style.display = previousDisplay;
    if (previousAriaHidden === null) button.removeAttribute('aria-hidden');
    else button.setAttribute('aria-hidden', previousAriaHidden);
    if (previousTabIndex === null) button.removeAttribute('tabindex');
    else button.setAttribute('tabindex', previousTabIndex);
  });

  return true;
}

if (typeof window !== 'undefined') {
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const card = isStartRegistrationCard(target);
    if (!card) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    openRegistrationForm();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target instanceof Element ? event.target : null;
    const card = isStartRegistrationCard(target);
    if (!card) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    openRegistrationForm();
  }, true);
}
