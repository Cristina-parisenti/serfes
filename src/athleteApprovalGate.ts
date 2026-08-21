export {};

type EmailStatus = 'pending' | 'confirmed';
type SecretaryStatus = 'waiting_email' | 'pending' | 'approved' | 'changes_requested';

type EmailState = {
  status: EmailStatus;
  email: string;
  requestedAt: string;
  confirmedAt?: string;
};

type SecretaryState = {
  status: SecretaryStatus;
  updatedAt: string;
  note?: string;
};

type CompleteProfile = {
  identification?: {
    email?: string;
  };
};

const COMPLETED_REGISTRATION_KEY = 'serfes-athlete-registration-completed';
const COMPLETE_PROFILE_KEY = 'serfes-athlete-profile-complete';
const EMAIL_STATE_KEY = 'serfes-athlete-email-verification';
const SECRETARY_STATE_KEY = 'serfes-athlete-secretary-validation';
const STATUS_BANNER_ID = 'serfes-athlete-approval-banner';
const COMPETITION_GATE_ID = 'serfes-competition-approval-gate';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // O armazenamento local é temporário enquanto o backend não está conectado.
  }
}

function registrationCompleted() {
  try {
    return localStorage.getItem(COMPLETED_REGISTRATION_KEY) === 'true';
  } catch {
    return false;
  }
}

function profileEmail() {
  return text(readJson<CompleteProfile>(COMPLETE_PROFILE_KEY)?.identification?.email);
}

function emailState() {
  return readJson<EmailState>(EMAIL_STATE_KEY);
}

function secretaryState() {
  return readJson<SecretaryState>(SECRETARY_STATE_KEY);
}

function setEmailState(value: EmailState) {
  writeJson(EMAIL_STATE_KEY, value);
}

function setSecretaryState(status: SecretaryStatus, note?: string) {
  writeJson(SECRETARY_STATE_KEY, {
    status,
    updatedAt: new Date().toISOString(),
    ...(note ? { note } : {}),
  } satisfies SecretaryState);
}

function athleteAreaIsOpen() {
  return text(document.querySelector<HTMLElement>('.sidebar-brand-wrap .eyebrow')?.textContent).toLowerCase() === 'área do atleta';
}

function formEmail(form: HTMLFormElement) {
  const identification = Array.from(form.querySelectorAll<HTMLElement>('.form-section')).find(
    (section) => text(section.querySelector('.form-section-title h4')?.textContent) === 'Identificação',
  );
  const label = Array.from(identification?.querySelectorAll<HTMLLabelElement>('label') ?? []).find(
    (item) => text(item.firstChild?.textContent).startsWith('E-mail'),
  );
  return text(label?.querySelector<HTMLInputElement>('input')?.value).toLowerCase();
}

function successfulSubmitFinished(form: HTMLFormElement) {
  const formClosed = !document.documentElement.contains(form) || !document.querySelector('form.athlete-form');
  const returnedHome = Boolean(document.querySelector('.athlete-home-actions'));
  return formClosed && returnedHome;
}

function initializePendingFlow(email: string) {
  const normalizedEmail = text(email).toLowerCase();
  const previousEmail = emailState();
  const sameVerifiedEmail = previousEmail?.status === 'confirmed'
    && text(previousEmail.email).toLowerCase() === normalizedEmail;

  if (sameVerifiedEmail && previousEmail) {
    setEmailState(previousEmail);
    setSecretaryState('pending');
    return;
  }

  setEmailState({
    status: 'pending',
    email: normalizedEmail,
    requestedAt: new Date().toISOString(),
  });
  setSecretaryState('waiting_email');
}

function ensureStatesForExistingRegistration() {
  if (!registrationCompleted()) return;

  const email = emailState();
  if (!email) {
    setEmailState({
      status: 'pending',
      email: profileEmail(),
      requestedAt: new Date().toISOString(),
    });
  }

  const currentSecretary = secretaryState();
  if (!currentSecretary) setSecretaryState('waiting_email');
}

function advanceSecretaryAfterEmailConfirmation() {
  const email = emailState();
  const secretary = secretaryState();
  if (email?.status === 'confirmed' && secretary?.status === 'waiting_email') {
    setSecretaryState('pending');
  }
}

function isApproved() {
  return emailState()?.status === 'confirmed' && secretaryState()?.status === 'approved';
}

function statusCopy() {
  const email = emailState();
  const secretary = secretaryState();

  if (email?.status !== 'confirmed') {
    const address = text(email?.email);
    return {
      tone: 'email',
      kicker: 'Confirmação de e-mail',
      title: 'Confirme seu endereço de e-mail',
      description: address
        ? `A confirmação de ${address} é necessária para que o cadastro siga para análise da Secretaria.`
        : 'A confirmação do e-mail informado no cadastro é necessária para que o processo siga para análise da Secretaria.',
      detail: 'Após a validação pela Secretaria, você poderá solicitar inscrição nas competições.',
    };
  }

  if (secretary?.status === 'changes_requested') {
    return {
      tone: 'attention',
      kicker: 'Validação da Secretaria',
      title: 'Cadastro com pendência',
      description: secretary.note || 'A Secretaria identificou uma informação que precisa ser corrigida antes da liberação do cadastro.',
      detail: 'Após a correção, o cadastro será submetido novamente à validação.',
    };
  }

  if (secretary?.status !== 'approved') {
    return {
      tone: 'pending',
      kicker: 'Validação da Secretaria',
      title: 'Cadastro em análise',
      description: 'Seu e-mail foi confirmado e o cadastro aguarda validação da Secretaria.',
      detail: 'As inscrições em competições serão liberadas somente após a aprovação.',
    };
  }

  return {
    tone: 'approved',
    kicker: 'Cadastro validado',
    title: 'Cadastro aprovado pela Secretaria ✓',
    description: 'Seu cadastro está apto a integrar o SERFES.',
    detail: 'Você já pode solicitar inscrição nas competições disponíveis.',
  };
}

function ensureHomeStatusBanner() {
  if (!athleteAreaIsOpen() || !registrationCompleted()) {
    document.getElementById(STATUS_BANNER_ID)?.remove();
    return;
  }

  const actions = document.querySelector<HTMLElement>('.athlete-home-actions');
  if (!actions) return;

  const copy = statusCopy();
  let banner = document.getElementById(STATUS_BANNER_ID);
  if (!banner) {
    banner = document.createElement('aside');
    banner.id = STATUS_BANNER_ID;
    banner.className = 'serfes-approval-banner';
    actions.parentElement?.insertBefore(banner, actions);
  }

  const renderKey = `${copy.tone}:${copy.title}:${copy.description}:${copy.detail}`;
  if (banner.dataset.renderKey === renderKey) return;
  banner.dataset.renderKey = renderKey;
  banner.dataset.tone = copy.tone;

  const kicker = document.createElement('span');
  kicker.className = 'serfes-approval-kicker';
  kicker.textContent = copy.kicker;

  const title = document.createElement('strong');
  title.textContent = copy.title;

  const description = document.createElement('p');
  description.textContent = copy.description;

  const detail = document.createElement('small');
  detail.textContent = copy.detail;

  banner.replaceChildren(kicker, title, description, detail);
}

function updateNativeCompletionNotice() {
  if (!registrationCompleted() || !athleteAreaIsOpen()) return;

  document.querySelectorAll<HTMLElement>('.athlete-next-step-notice').forEach((notice) => {
    const strong = notice.querySelector<HTMLElement>('strong');
    const paragraph = notice.querySelector<HTMLElement>('p');
    if (!strong || !paragraph) return;

    if (text(strong.textContent) === 'Cadastro concluído') {
      strong.textContent = 'Cadastro enviado';
      paragraph.textContent = 'Confirme seu e-mail e aguarde a validação da Secretaria. Depois da aprovação, suas inscrições em competições serão liberadas.';
    }
  });
}

function competitionGateMessage() {
  const email = emailState();
  const secretary = secretaryState();

  if (email?.status !== 'confirmed') {
    return 'Inscrições bloqueadas: confirme o e-mail informado no cadastro. Em seguida, o cadastro seguirá para validação da Secretaria.';
  }
  if (secretary?.status === 'changes_requested') {
    return 'Inscrições bloqueadas: há uma pendência no cadastro. Corrija as informações solicitadas e aguarde nova validação da Secretaria.';
  }
  return 'Inscrições bloqueadas: seu cadastro aguarda validação da Secretaria.';
}

function ensureCompetitionGate() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>('.section-toolbar h3')).find(
    (item) => text(item.textContent) === 'Minhas competições',
  );

  if (!heading) {
    document.getElementById(COMPETITION_GATE_ID)?.remove();
    return;
  }

  const approved = isApproved();
  const toolbar = heading.closest<HTMLElement>('.section-toolbar');

  let gate = document.getElementById(COMPETITION_GATE_ID);
  if (approved) {
    gate?.remove();
  } else if (toolbar) {
    if (!gate) {
      gate = document.createElement('div');
      gate.id = COMPETITION_GATE_ID;
      gate.className = 'warning-note serfes-competition-gate';
      toolbar.insertAdjacentElement('afterend', gate);
    }
    gate.textContent = competitionGateMessage();
  }

  document.querySelectorAll<HTMLButtonElement>('.competition-card-actions button').forEach((button) => {
    if (!text(button.textContent).startsWith('Solicitar inscrição')) return;
    button.disabled = !approved;
    button.setAttribute('aria-disabled', approved ? 'false' : 'true');
    if (approved) button.removeAttribute('title');
    else button.title = competitionGateMessage();
  });
}

function injectStyles() {
  if (document.getElementById('serfes-athlete-approval-styles')) return;

  const style = document.createElement('style');
  style.id = 'serfes-athlete-approval-styles';
  style.textContent = `
    .serfes-approval-banner {
      display: grid;
      gap: .35rem;
      padding: 1rem 1.1rem;
      border: 1px solid #d8e5ef;
      border-left: 5px solid #f3c623;
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 10px 24px rgba(20,59,99,.06);
    }
    .serfes-approval-banner[data-tone='approved'] { border-left-color: #1fa86b; }
    .serfes-approval-banner[data-tone='attention'] { border-left-color: #d83a3a; }
    .serfes-approval-banner strong { color: #143b63; font-size: 1rem; }
    .serfes-approval-banner p { margin: 0; color: #4f6179; line-height: 1.5; }
    .serfes-approval-banner small { color: #61758d; line-height: 1.45; }
    .serfes-approval-kicker {
      color: #61758d;
      font-size: .7rem;
      font-weight: 800;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .serfes-competition-gate { margin: 0; }
    .competition-card-actions button:disabled {
      cursor: not-allowed;
      opacity: .5;
      transform: none !important;
      box-shadow: none;
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
    ensureStatesForExistingRegistration();
    advanceSecretaryAfterEmailConfirmation();
    updateNativeCompletionNotice();
    ensureHomeStatusBanner();
    ensureCompetitionGate();
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.classList.contains('athlete-form')) return;

    const email = formEmail(form);
    window.setTimeout(() => {
      if (successfulSubmitFinished(form)) initializePendingFlow(email);
      schedule();
    }, 700);
  }, true);

  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  window.addEventListener('focus', schedule);
  window.addEventListener('storage', (event) => {
    if ([COMPLETED_REGISTRATION_KEY, COMPLETE_PROFILE_KEY, EMAIL_STATE_KEY, SECRETARY_STATE_KEY].includes(event.key ?? '')) schedule();
  });

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}
