const blockedNicknameTerms = [
  'caralho', 'porra', 'merda', 'buceta', 'foder', 'fodase', 'puta', 'puto',
  'viado', 'nazista', 'nazi', 'racista', 'fuck', 'shit', 'bitch', 'cunt', 'nigger'
];

function normalizeForModeration(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/4/g, 'a')
    .replace(/3/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');
}

export function nicknameHasBlockedContent(value: string) {
  const normalized = normalizeForModeration(value);
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const compact = normalized.replace(/[^a-z0-9]/g, '');

  return blockedNicknameTerms.some((term) => {
    const normalizedTerm = normalizeForModeration(term);
    if (tokens.includes(normalizedTerm) || compact === normalizedTerm) return true;
    return normalizedTerm.length >= 6 && compact.includes(normalizedTerm);
  });
}

export function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function isValidCpf(value: string) {
  const cpf = value.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (base: string, factor: number) => {
    let total = 0;
    for (const digit of base) {
      total += Number(digit) * factor;
      factor -= 1;
    }
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const first = calcDigit(cpf.slice(0, 9), 10);
  const second = calcDigit(cpf.slice(0, 10), 11);
  return first === Number(cpf[9]) && second === Number(cpf[10]);
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.replace(/^(\d{0,2})/, '($1');
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, '($1) $2');
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
  return digits.replace(/^(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
}

const commonEmailDomains = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'yahoo.com',
  'yahoo.com.br',
  'icloud.com',
  'me.com',
  'uol.com.br',
  'bol.com.br',
  'terra.com.br',
  'proton.me',
  'protonmail.com',
];

const explicitDomainCorrections: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.com.br': 'gmail.com',
  'hotail.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.com.br': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outllook.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outlook.com.br': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'icloud.co': 'icloud.com',
  'iclod.com': 'icloud.com',
};

function editDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const saved = previous[j];
      const substitution = diagonal + (a[i - 1] === b[j - 1] ? 0 : 1);
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, substitution);
      diagonal = saved;
    }
  }

  return previous[b.length];
}

function suggestedCommonDomain(domain: string) {
  if (explicitDomainCorrections[domain]) return explicitDomainCorrections[domain];

  let best: { domain: string; distance: number } | null = null;
  for (const candidate of commonEmailDomains) {
    const distance = editDistance(domain, candidate);
    if (distance <= 2 && (!best || distance < best.distance)) {
      best = { domain: candidate, distance };
    }
  }

  return best?.domain ?? null;
}

export function getEmailValidationError(value: string) {
  const email = value.trim().toLowerCase();
  if (!email) return null;
  if (email.length > 254 || email.includes('..')) return 'Informe um endereço de e-mail válido.';

  const atIndex = email.lastIndexOf('@');
  if (atIndex <= 0 || atIndex !== email.indexOf('@')) return 'Informe um endereço de e-mail válido.';

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (
    localPart.length > 64 ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)
  ) {
    return 'Informe um endereço de e-mail válido.';
  }

  const labels = domain.split('.');
  const validDomain =
    domain.length <= 253 &&
    labels.length >= 2 &&
    labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) &&
    /^[a-z]{2,63}$/i.test(labels[labels.length - 1]);

  if (!validDomain) return 'Verifique o domínio informado após o @.';

  const suggestion = suggestedCommonDomain(domain);
  if (suggestion && suggestion !== domain) {
    return `Domínio de e-mail possivelmente digitado incorretamente. Você quis dizer @${suggestion}?`;
  }

  return null;
}

export function isValidEmail(value: string) {
  return value.trim().length > 0 && getEmailValidationError(value) === null;
}
