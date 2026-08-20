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

type ReactButtonProps = {
  onClick?: (event?: unknown) => void;
};

function invokeReactOnClick(button: HTMLButtonElement) {
  const key = Object.keys(button).find((item) => item.startsWith('__reactProps$'));
  if (!key) return false;

  const props = (button as unknown as Record<string, unknown>)[key] as ReactButtonProps | undefined;
  if (typeof props?.onClick !== 'function') return false;

  props.onClick({
    currentTarget: button,
    target: button,
    preventDefault() {},
    stopPropagation() {},
  });
  return true;
}

function openRegistrationForm() {
  const button = cadastroNavButton();
  if (!button) return false;

  // No protótipo, o item "Meu cadastro" permanece no DOM mesmo quando oculto.
  // Acionamos diretamente a função React ligada a ele para abrir athleteForm.
  if (invokeReactOnClick(button)) return true;

  // Fallback para navegadores/versões do React em que a chave interna não esteja acessível.
  button.click();
  return true;
}

function activateFromCard(event: Event) {
  const target = event.target instanceof Element ? event.target : null;
  const card = isStartRegistrationCard(target);
  if (!card) return;

  event.preventDefault();
  openRegistrationForm();
}

if (typeof window !== 'undefined') {
  // Captura o clique antes de outras rotinas que remodelam o card, mas sem bloquear
  // a propagação global do evento.
  document.addEventListener('click', activateFromCard, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target instanceof Element ? event.target : null;
    const card = isStartRegistrationCard(target);
    if (!card) return;

    event.preventDefault();
    openRegistrationForm();
  }, true);
}
