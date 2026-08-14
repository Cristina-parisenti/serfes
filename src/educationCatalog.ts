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

export type HigherEducationPayload = {
  source: 'MEC/e-MEC';
  sourceUrl: string;
  generatedAt: string | null;
  institutions: HigherEducationInstitution[];
  courses: string[];
};

export const SCHOOL_NETWORKS: SchoolNetwork[] = ['Federal', 'Estadual', 'Municipal', 'Privada'];

export function normalizeEducationText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Regra operacional do protótipo para a sequência regular de escolarização.
// Não representa idade mínima legal para ingresso no ensino superior: a LDB exige
// conclusão do ensino médio (ou equivalente) e classificação em processo seletivo.
export function educationLevelsForAge(age: number | null): EducationLevel[] {
  if (age === null || age < 12) return [];
  if (age < 14) return ['Ensino fundamental'];
  if (age < 16) return ['Ensino fundamental', 'Ensino médio'];
  return ['Ensino fundamental', 'Ensino médio', 'Ensino superior'];
}

export function schoolYearsForLevel(level: EducationLevel | '') {
  if (level === 'Ensino fundamental') return ['6º ano', '7º ano', '8º ano', '9º ano'];
  if (level === 'Ensino médio') return ['1º ano', '2º ano', '3º ano'];
  return [];
}
