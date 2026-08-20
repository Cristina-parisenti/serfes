function refineAthleteHome() {
  const actions = document.querySelector<HTMLElement>('.athlete-home-actions');
  if (actions) {
    const primaryCard = actions.querySelector<HTMLElement>('.athlete-home-primary-card');
    const primaryHeading = primaryCard?.querySelector<HTMLHeadingElement>('h4');
    const primaryButton = primaryCard?.querySelector<HTMLButtonElement>('.primary-button');
    const kicker = primaryCard?.querySelector<HTMLElement>('.athlete-home-card-kicker');
    const saved =
      primaryHeading?.textContent?.trim() === 'Meu cadastro' ||
      primaryButton?.textContent?.includes('Atualizar meu cadastro') === true;

    actions.classList.toggle('athlete-home-saved-menu', saved);

    if (primaryHeading) {
      primaryHeading.hidden = !saved && primaryHeading.textContent?.trim() === 'Preencher meu cadastro';
    }
    if (kicker) kicker.hidden = saved;
    if (primaryButton) {
      primaryButton.classList.toggle('athlete-start-button', !saved);
      if (!saved) primaryButton.setAttribute('aria-label', 'Iniciar cadastro');
      else primaryButton.removeAttribute('aria-label');
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
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}
