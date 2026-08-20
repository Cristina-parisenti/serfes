function replaceButtonText(button: HTMLButtonElement, text: string) {
  const svg = button.querySelector('svg');
  Array.from(button.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) node.remove();
  });
  button.append(document.createTextNode(`${svg ? ' ' : ''}${text}`));
  button.setAttribute('aria-label', text);
}

function refineAthleteHome() {
  const actions = document.querySelector<HTMLElement>('.athlete-home-actions');
  if (actions) {
    const primaryCard = actions.querySelector<HTMLElement>('.athlete-home-primary-card');
    const primaryHeading = primaryCard?.querySelector<HTMLHeadingElement>('h4');
    const primaryButton = primaryCard?.querySelector<HTMLButtonElement>('.primary-button');
    const saved =
      actions.dataset.refinementState === 'saved' ||
      primaryHeading?.textContent?.trim() === 'Meu cadastro' ||
      primaryHeading?.textContent?.trim() === 'Dados cadastrais' ||
      primaryButton?.textContent?.includes('Atualizar meu cadastro') === true ||
      primaryButton?.textContent?.includes('Atualizar cadastro') === true;

    if (saved) actions.dataset.refinementState = 'saved';
    actions.classList.toggle('athlete-home-saved-menu', saved);

    if (!saved) {
      if (primaryHeading?.textContent?.trim() === 'Preencher meu cadastro') {
        primaryHeading.remove();
      }
      if (primaryButton && primaryButton.textContent?.includes('Preencher meu cadastro')) {
        replaceButtonText(primaryButton, 'Iniciar cadastro');
      }
    } else {
      const kicker = primaryCard?.querySelector<HTMLElement>('.athlete-home-card-kicker');
      if (kicker) kicker.remove();
      if (primaryHeading) primaryHeading.textContent = 'Dados cadastrais';
      if (primaryButton && primaryButton.textContent?.includes('Atualizar meu cadastro')) {
        replaceButtonText(primaryButton, 'Atualizar cadastro');
      }
    }
  }

  const competitionHeading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h3')).find(
    (heading) => heading.textContent?.trim() === 'Minhas competições',
  );

  if (competitionHeading) {
    const headingContainer = competitionHeading.parentElement;
    const toolbar = competitionHeading.closest('.section-toolbar');
    if (headingContainer && toolbar && !toolbar.querySelector('.athlete-runtime-back-home')) {
      toolbar.classList.add('form-heading');
      const backButton = document.createElement('button');
      backButton.type = 'button';
      backButton.className = 'back-link athlete-runtime-back-home';
      backButton.textContent = '← Voltar ao menu principal';
      backButton.addEventListener('click', () => {
        const homeButton = Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar-nav .nav-item')).find(
          (button) => button.textContent?.replace(/\s+/g, ' ').trim() === 'Início',
        );
        homeButton?.click();
      });
      headingContainer.prepend(backButton);
    }
  }
}

let scheduled = false;
function scheduleRefinement() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    refineAthleteHome();
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', scheduleRefinement, { once: true });
  const observer = new MutationObserver(scheduleRefinement);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
