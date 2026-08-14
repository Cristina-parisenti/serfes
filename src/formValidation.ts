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

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
