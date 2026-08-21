import { supabase } from './supabaseClient';

const SERFES_PRODUCTION_URL = 'https://cristina-parisenti.github.io/serfes/';
const RECOVERY_ACTION_ID = 'serfes-password-recovery-action';
const RECOVERY_STATUS_ID = 'serfes-password-recovery-status';
const RECOVERY_DIALOG_ID = 'serfes-password-recovery-dialog';
const STYLE_ID = 'serfes-password-recovery-styles';

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function loginForm() {
  return Array.from(document.querySelectorAll<HTMLFormElement>('form')).find((form) =>
    text(form.querySelector('h3')?.textContent) === 'Entrar no sistema',
  ) ?? null;
}

function labelField(form: HTMLFormElement, labelStart: string) {
  const label = Array.from(form.querySelectorAll<HTMLLabelElement>('label')).find((item) =>
    text(item.firstChild?.textContent).startsWith(labelStart),
  );
  return {
    label: label ?? null,
    input: label?.querySelector<HTMLInputElement>('input') ?? null,
  };
}

function profileValue(form: HTMLFormElement) {
  const label = Array.from(form.querySelectorAll<HTMLLabelElement>('label')).find((item) =>
    text(item.firstChild?.textContent).startsWith('Perfil de acesso'),
  );
  return label?.querySelector<HTMLSelectElement>('select')?.value ?? '';
}

function ensureStatus(form: HTMLFormElement) {
  let status = form.querySelector<HTMLElement>(`#${RECOVERY_STATUS_ID}`);
  if (!status) {
    status = document.createElement('div');
    status.id = RECOVERY_STATUS_ID;
    status.className = 'serfes-password-recovery-status';
    status.hidden = true;
    status.setAttribute('aria-live', 'polite');

    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    submit?.before(status);
  }
  return status;
}

function setStatus(form: HTMLFormElement, message: string, tone: 'info' | 'success' | 'error' = 'info') {
  const status = ensureStatus(form);
  status.textContent = message;
  status.dataset.tone = tone;
  status.hidden = false;
}

function clearStatus(form: HTMLFormElement) {
  const status = form.querySelector<HTMLElement>(`#${RECOVERY_STATUS_ID}`);
  if (!status) return;
  status.textContent = '';
  status.hidden = true;
}

async function requestPasswordRecovery(form: HTMLFormElement) {
  const { input: emailInput } = labelField(form, 'E-mail');
  const email = text(emailInput?.value).toLowerCase();

  if (!email || !emailInput?.checkValidity()) {
    setStatus(form, 'Informe o e-mail vinculado à sua conta para recuperar a senha.', 'error');
    emailInput?.focus();
    emailInput?.reportValidity();
    return;
  }

  setStatus(form, 'Enviando as instruções de recuperação...', 'info');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: SERFES_PRODUCTION_URL,
  });

  if (error) {
    const message = error.message.toLowerCase().includes('rate limit')
      ? 'Muitas solicitações em pouco tempo. Tente novamente mais tarde.'
      : 'Não foi possível enviar as instruções agora. Tente novamente.';
    setStatus(form, message, 'error');
    return;
  }

  setStatus(
    form,
    'Se o e-mail informado estiver vinculado a uma conta, você receberá as instruções para criar uma nova senha.',
    'success',
  );
}

function ensureRecoveryAction(form: HTMLFormElement) {
  const athlete = profileValue(form) === 'Atleta';
  const passwordField = labelField(form, 'Senha');
  if (!passwordField.label) return;

  let action = form.querySelector<HTMLElement>(`#${RECOVERY_ACTION_ID}`);
  if (!action) {
    action = document.createElement('div');
    action.id = RECOVERY_ACTION_ID;
    action.className = 'serfes-password-recovery-action';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'serfes-password-recovery-link';
    button.textContent = 'Esqueci minha senha';
    button.addEventListener('click', () => void requestPasswordRecovery(form));

    action.append(button);
    passwordField.label.after(action);
  }

  action.hidden = !athlete;
  if (!athlete) clearStatus(form);
}

function closeRecoveryDialog() {
  document.getElementById(RECOVERY_DIALOG_ID)?.remove();
}

function createRecoveryDialog() {
  if (document.getElementById(RECOVERY_DIALOG_ID)) return;

  const overlay = document.createElement('div');
  overlay.id = RECOVERY_DIALOG_ID;
  overlay.className = 'serfes-password-recovery-overlay';

  const card = document.createElement('div');
  card.className = 'glass-card serfes-password-recovery-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-labelledby', 'serfes-password-recovery-title');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Acesso ao SERFES';

  const title = document.createElement('h2');
  title.id = 'serfes-password-recovery-title';
  title.textContent = 'Criar nova senha';

  const description = document.createElement('p');
  description.className = 'muted';
  description.textContent = 'Defina uma nova senha para voltar a acessar sua conta de atleta.';

  const form = document.createElement('form');
  form.className = 'serfes-password-recovery-form';

  const passwordLabel = document.createElement('label');
  passwordLabel.textContent = 'Nova senha';
  const password = document.createElement('input');
  password.type = 'password';
  password.required = true;
  password.minLength = 8;
  password.setAttribute('autocomplete', 'new-password');
  password.placeholder = 'Mínimo de 8 caracteres';
  passwordLabel.append(password);

  const confirmationLabel = document.createElement('label');
  confirmationLabel.textContent = 'Confirme a nova senha';
  const confirmation = document.createElement('input');
  confirmation.type = 'password';
  confirmation.required = true;
  confirmation.minLength = 8;
  confirmation.setAttribute('autocomplete', 'new-password');
  confirmation.placeholder = 'Digite novamente';
  confirmationLabel.append(confirmation);

  const status = document.createElement('div');
  status.className = 'serfes-password-recovery-dialog-status';
  status.hidden = true;
  status.setAttribute('aria-live', 'polite');

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'primary-button';
  submit.textContent = 'Salvar nova senha';

  const setDialogStatus = (message: string, tone: 'info' | 'success' | 'error') => {
    status.textContent = message;
    status.dataset.tone = tone;
    status.hidden = false;
  };

  const validateMatch = () => {
    const matches = password.value === confirmation.value;
    confirmation.setCustomValidity(matches ? '' : 'As senhas não coincidem.');
    return matches;
  };

  password.addEventListener('input', validateMatch);
  confirmation.addEventListener('input', validateMatch);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!validateMatch() || !form.checkValidity()) {
      form.reportValidity();
      return;
    }

    submit.disabled = true;
    setDialogStatus('Atualizando sua senha...', 'info');

    const { error } = await supabase.auth.updateUser({ password: password.value });
    if (error) {
      submit.disabled = false;
      setDialogStatus('Não foi possível atualizar a senha. Solicite um novo link de recuperação.', 'error');
      return;
    }

    setDialogStatus('Senha alterada com sucesso. Você já pode entrar com a nova senha.', 'success');
    submit.textContent = 'Voltar ao acesso';
    submit.disabled = false;
    submit.type = 'button';
    submit.addEventListener('click', async () => {
      await supabase.auth.signOut();
      closeRecoveryDialog();
      window.history.replaceState({}, document.title, SERFES_PRODUCTION_URL);
      window.location.replace(SERFES_PRODUCTION_URL);
    }, { once: true });
  });

  form.append(passwordLabel, confirmationLabel, status, submit);
  card.append(eyebrow, title, description, form);
  overlay.append(card);
  document.body.append(overlay);
  window.setTimeout(() => password.focus(), 0);
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .serfes-password-recovery-action {
      margin-top: -.35rem;
      display: flex;
      justify-content: flex-end;
    }
    .serfes-password-recovery-action[hidden] { display: none !important; }
    .serfes-password-recovery-link {
      border: 0;
      background: transparent;
      padding: .15rem 0 .25rem;
      color: #0b5aa6;
      font-size: .84rem;
      font-weight: 750;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .serfes-password-recovery-link:hover { color: #084c8e; }
    .serfes-password-recovery-status,
    .serfes-password-recovery-dialog-status {
      margin: .1rem 0 .75rem;
      padding: .75rem .85rem;
      border-radius: 12px;
      background: #eef5fb;
      color: #314257;
      font-size: .86rem;
      line-height: 1.45;
    }
    .serfes-password-recovery-status[data-tone='success'],
    .serfes-password-recovery-dialog-status[data-tone='success'] { background: #edf9f2; color: #17643d; }
    .serfes-password-recovery-status[data-tone='error'],
    .serfes-password-recovery-dialog-status[data-tone='error'] { background: #fff1f1; color: #9d2929; }
    .serfes-password-recovery-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: grid;
      place-items: center;
      padding: 1.25rem;
      background: rgba(20,59,99,.48);
      backdrop-filter: blur(8px);
    }
    .serfes-password-recovery-card {
      width: min(480px, 100%);
      padding: 1.6rem;
      border-top: 5px solid #0b5aa6;
    }
    .serfes-password-recovery-card h2 {
      margin: .4rem 0 .4rem;
      color: #143b63;
    }
    .serfes-password-recovery-card .muted { margin: 0 0 1rem; }
    .serfes-password-recovery-form { display: grid; gap: .9rem; }
    .serfes-password-recovery-form label {
      display: grid;
      color: #314257;
      font-weight: 650;
    }
    .serfes-password-recovery-form .primary-button { width: 100%; }
  `;
  document.head.append(style);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    ensureStyles();
    const form = loginForm();
    if (form) ensureRecoveryAction(form);
  });
}

if (typeof window !== 'undefined') {
  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const form = target.closest<HTMLFormElement>('form');
    if (!form || form !== loginForm()) return;
    ensureRecoveryAction(form);
  }, true);

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') createRecoveryDialog();
  });

  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  window.addEventListener('focus', schedule);

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
