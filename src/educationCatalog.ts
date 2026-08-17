export type SchoolNetwork = 'Federal' | 'Estadual' | 'Municipal' | 'Privada';
export type EducationLevel = 'Ensino fundamental' | 'Ensino médio' | 'Ensino superior';

export type SchoolDirectoryRecord = {
  id: string;
  name: string;
  municipality: string;
  network: SchoolNetwork;
};

export type SchoolDirectoryPayload = {
  source: 'Consulta Escolas/SEED-PR';
  sourceUrl: string;
  generatedAt: string | null;
  records: SchoolDirectoryRecord[];
};

export type HigherEducationInstitution = {
  id: string;
  name: string;
  acronym: string | null;
  municipality: string;
  network: SchoolNetwork;
};

export type HigherEducationCourse = {
  id: string;
  name: string;
  institutionId: string;
  municipality: string;
  network: SchoolNetwork;
};

export type HigherEducationPayload = {
  source: string;
  sourceUrl: string;
  emecUrl?: string;
  dataYear?: number;
  generatedAt: string | null;
  institutions: HigherEducationInstitution[];
  courses: HigherEducationCourse[];
};

export const SCHOOL_NETWORKS: SchoolNetwork[] = ['Federal', 'Estadual', 'Municipal', 'Privada'];

export const SCHOOL_NETWORK_FILES: Record<SchoolNetwork, string> = {
  Federal: 'schools-pr-federal.json',
  Estadual: 'schools-pr-estadual.json',
  Municipal: 'schools-pr-municipal.json',
  Privada: 'schools-pr-privada.json',
};

export function normalizeEducationText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Regra operacional do SERFES para evitar opções incompatíveis com a idade
// esperada da sequência regular de escolarização. Não é uma idade mínima legal.
// O ensino superior, juridicamente, depende da conclusão do ensino médio (ou
// equivalente) e do processo de ingresso, não de uma idade mínima geral.
export function educationLevelsForAge(age: number | null): EducationLevel[] {
  if (age === null || age < 12) return [];
  if (age < 15) return ['Ensino fundamental'];
  if (age < 17) return ['Ensino fundamental', 'Ensino médio'];
  return ['Ensino fundamental', 'Ensino médio', 'Ensino superior'];
}

export function schoolYearsForLevel(level: EducationLevel | '') {
  if (level === 'Ensino fundamental') return ['6º ano', '7º ano', '8º ano', '9º ano'];
  if (level === 'Ensino médio') return ['1º ano', '2º ano', '3º ano'];
  return [];
}
