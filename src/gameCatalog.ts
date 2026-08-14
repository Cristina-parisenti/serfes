export type ClassindAgeRating = 'L' | 6 | 10 | 12 | 14 | 16 | 18;
export type ClassindRecordStatus = 'verified' | 'pending' | 'not-found';

export type GameCatalogEntry = {
  id: string;
  name: string;
  aliases: string[];
  requiresExactVersion: boolean;
};

export type ClassindRatingRecord = {
  gameId: string;
  officialTitle: string | null;
  classification: ClassindAgeRating | null;
  status: ClassindRecordStatus;
  sourceRecordId: string | null;
  sourceUpdatedAt: string | null;
  verifiedAt: string | null;
};

export type ClassindRatingsPayload = {
  source: 'ClassInd/MJSP';
  sourceUrl: string;
  generatedAt: string | null;
  records: ClassindRatingRecord[];
};

export const GAME_CATALOG: GameCatalogEntry[] = [
  { id: 'free-fire', name: 'Free Fire', aliases: ['Free Fire', 'Garena Free Fire'], requiresExactVersion: false },
  { id: 'tekken', name: 'Tekken', aliases: ['Tekken'], requiresExactVersion: true },
  { id: 'street-fighter', name: 'Street Fighter', aliases: ['Street Fighter'], requiresExactVersion: true },
  { id: 'ea-fc', name: 'EA FC', aliases: ['EA FC', 'EA Sports FC', 'FIFA'], requiresExactVersion: true },
  { id: 'pes', name: 'PES', aliases: ['PES', 'Pro Evolution Soccer', 'eFootball'], requiresExactVersion: true },
  { id: 'fortnite', name: 'Fortnite', aliases: ['Fortnite'], requiresExactVersion: false },
  { id: 'valorant', name: 'Valorant', aliases: ['Valorant'], requiresExactVersion: false },
  { id: 'league-of-legends', name: 'League of Legends', aliases: ['League of Legends'], requiresExactVersion: false },
  { id: 'counter-strike', name: 'Counter Strike', aliases: ['Counter Strike', 'Counter-Strike', 'Counter-Strike 2', 'CS2'], requiresExactVersion: true },
  { id: 'brawl-stars', name: 'Brawl Stars', aliases: ['Brawl Stars'], requiresExactVersion: false },
  { id: 'clash-royale', name: 'Clash Royale', aliases: ['Clash Royale'], requiresExactVersion: false },
  { id: 'just-dance', name: 'Just Dance', aliases: ['Just Dance'], requiresExactVersion: true },
];

function normalizeGameName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getGameCatalogEntry(name: string) {
  const normalized = normalizeGameName(name);
  if (!normalized) return null;

  return GAME_CATALOG.find((game) =>
    game.aliases.some((alias) => {
      const normalizedAlias = normalizeGameName(alias);
      return normalized === normalizedAlias || normalized.startsWith(`${normalizedAlias} `);
    }),
  ) ?? null;
}

export function getClassindRecord(payload: ClassindRatingsPayload | null, gameId: string, officialTitle?: string) {
  const records = payload?.records.filter((record) => record.gameId === gameId) ?? [];
  if (!records.length) return null;

  if (officialTitle) {
    const normalizedTitle = normalizeGameName(officialTitle);
    const exact = records.find((record) => record.officialTitle && normalizeGameName(record.officialTitle) === normalizedTitle);
    if (exact) return exact;

    const compatible = records.find((record) => {
      if (!record.officialTitle) return false;
      const normalizedOfficial = normalizeGameName(record.officialTitle);
      return normalizedTitle.startsWith(`${normalizedOfficial} `) || normalizedOfficial.startsWith(`${normalizedTitle} `);
    });
    return compatible ?? null;
  }

  return records.find((record) => record.status === 'verified') ?? records[0] ?? null;
}

export function classificationMinimumAge(classification: ClassindAgeRating | null) {
  if (classification === null) return null;
  if (classification === 'L') return 0;
  return classification;
}

export function classificationLabel(classification: ClassindAgeRating | null) {
  if (classification === null) return 'Pendente de verificação oficial';
  if (classification === 'L') return 'Livre';
  return `${classification} anos`;
}

export function isClassindRecordFresh(record: ClassindRatingRecord | null, maxAgeDays = 45) {
  if (!record?.sourceUpdatedAt) return false;
  const sourceDate = new Date(record.sourceUpdatedAt);
  if (Number.isNaN(sourceDate.getTime())) return false;
  const ageMs = Date.now() - sourceDate.getTime();
  return ageMs >= 0 && ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}
