import { createClient, type Session } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from './supabaseClient';

const DRAFT_KEY = 'serfes-athlete-backend-draft';
const SYNC_STATE_KEY = 'serfes-athlete-backend-sync-state';
const REGISTRATION_ENTRY_KEY = 'serfes-athlete-registration-entry';

type DraftSex = 'female' | 'male';

type AthleteBackendDraft = {
  identification: {
    fullName: string;
    birthDate: string;
    sex: DraftSex;
    cpf: string;
    email: string;
    phone: string;
    municipality: string;
    uf: 'PR';
  };
  sports: {
    nickname: string;
    primaryGame: string;
  };
  school: {
    isEnrolled: boolean;
    municipality: string | null;
    network: string | null;
    educationLevel: string | null;
    institutionCode: string | null;
    institutionName: string | null;
    schoolYear: string | null;
    higherCourseCode: string | null;
    higherCourseName: string | null;
  };
  guardian: {
    fullName: string;
    cpf: string;
    email: string;
    phone: string;
  } | null;
  updatedAt: string;
};

type SyncState = {
  status: 'syncing' | 'success' | 'error';
  userId: string;
  draftUpdatedAt: string;
  updatedAt: string;
};

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function digits(value: string) {
  return value.replace(/\D/g, '');
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
    // A sincronização continua mesmo se o navegador não permitir armazenamento local.
  }
}

function registrationEntryActive() {
  try {
    return sessionStorage.getItem(REGISTRATION_ENTRY_KEY) === 'true';
  } catch {
    return false;
  }
}

function sectionByHeading(form: HTMLFormElement, heading: string) {
  return Array.from(form.querySelectorAll<HTMLElement>('.form-section')).find((section) =>
    text(section.querySelector('.form-section-title h4')?.textContent) === heading,
  ) ?? null;
}

function controlByLabel(section: HTMLElement | null, labelStart: string) {
  if (!section) return null;
  const label = Array.from(section.querySelectorAll<HTMLLabelElement>('label')).find((item) =>
    text(item.firstChild?.textContent).startsWith(labelStart),
  );
  return label?.querySelector<HTMLInputElement | HTMLSelectElement>('input, select') ?? null;
}

function controlValue(section: HTMLElement | null, labelStart: string) {
  return text(controlByLabel(section, labelStart)?.value);
}

function selectedText(section: HTMLElement | null, labelStart: string) {
  const control = controlByLabel(section, labelStart);
  if (control instanceof HTMLSelectElement) {
    return text(control.selectedOptions[0]?.textContent) || text(control.value);
  }
  return text(control?.value);
}

function nullable(value: string) {
  const normalized = text(value);
  return normalized || null;
}

function selectedSex(form: HTMLFormElement): DraftSex | null {
  const value = text(form.querySelector<HTMLInputElement>('input[name="serfes-athlete-sex"]:checked')?.value).toLowerCase();
  if (value === 'feminino' || value === 'female') return 'female';
  if (value === 'masculino' || value === 'male') return 'male';
  return null;
}

function captureDraft(form: HTMLFormElement): AthleteBackendDraft | null {
  const identification = sectionByHeading(form, 'Identificação');
  const sports = sectionByHeading(form, 'Perfil esportivo');
  const school = sectionByHeading(form, 'Vínculo escolar');
  const guardianSection = sectionByHeading(form, 'Responsável legal');
  const sex = selectedSex(form);

  const fullName = controlValue(identification, 'Nome completo');
  const birthDate = controlValue(identification, 'Data de nascimento');
  const cpf = digits(controlValue(identification, 'CPF'));
  const email = controlValue(identification, 'E-mail').toLowerCase();
  const phone = controlValue(identification, 'Telefone');
  const municipality = selectedText(identification, 'Município');
  const nickname = controlValue(sports, 'Nickname');
  const primaryGame = selectedText(sports, 'Modalidade principal');

  if (!fullName || !birthDate || !sex || cpf.length !== 11 || !email || !phone || !municipality || !nickname || !primaryGame) {
    return null;
  }

  const enrollment = selectedText(school, 'Está matriculado em instituição de ensino?');
  const isEnrolled = enrollment !== 'Não';
  const educationLevel = selectedText(school, 'Nível de ensino');
  const institutionName = selectedText(school, educationLevel === 'Ensino superior' ? 'Instituição de ensino superior' : 'Escola');
  const courseControl = controlByLabel(school, 'Curso');
  const higherCourseCode = courseControl instanceof HTMLSelectElement ? text(courseControl.value) : '';
  const higherCourseName = selectedText(school, 'Curso');

  let guardian: AthleteBackendDraft['guardian'] = null;
  if (guardianSection) {
    const guardianCpf = digits(controlValue(guardianSection, 'CPF'));
    const guardianName = controlValue(guardianSection, 'Nome completo');
    const guardianEmail = controlValue(guardianSection, 'E-mail').toLowerCase();
    const guardianPhone = controlValue(guardianSection, 'Telefone');

    if (!guardianName || guardianCpf.length !== 11 || !guardianEmail || !guardianPhone) return null;

    guardian = {
      fullName: guardianName,
      cpf: guardianCpf,
      email: guardianEmail,
      phone: guardianPhone,
    };
  }

  return {
    identification: {
      fullName,
      birthDate,
      sex,
      cpf,
      email,
      phone,
      municipality,
      uf: 'PR',
    },
    sports: { nickname, primaryGame },
    school: {
      isEnrolled,
      municipality: isEnrolled ? nullable(selectedText(school, 'Município da instituição')) : null,
      network: isEnrolled ? nullable(selectedText(school, 'Rede de ensino')) : null,
      educationLevel: isEnrolled ? nullable(educationLevel) : null,
      institutionCode: null,
      institutionName: isEnrolled ? nullable(institutionName) : null,
      schoolYear: isEnrolled ? nullable(selectedText(school, 'Ano escolar')) : null,
      higherCourseCode: isEnrolled && educationLevel === 'Ensino superior' ? nullable(higherCourseCode) : null,
      higherCourseName: isEnrolled && educationLevel === 'Ensino superior' ? nullable(higherCourseName) : null,
    },
    guardian,
    updatedAt: new Date().toISOString(),
  };
}

function saveDraftAfterSuccessfulSubmit(form: HTMLFormElement) {
  if (!form.checkValidity()) return;

  const initialRegistration = registrationEntryActive();
  if (initialRegistration && form.dataset.serfesRegistrationBypass !== 'true') return;

  const draft = captureDraft(form);
  if (!draft) return;

  writeJson(DRAFT_KEY, draft);
  window.setTimeout(() => void syncFromCurrentSession(), 0);
}

function sameNullable(a: unknown, b: unknown) {
  return text(a == null ? '' : String(a)) === text(b == null ? '' : String(b));
}

function schoolRowsMatch(existing: Record<string, unknown> | null, draft: AthleteBackendDraft['school']) {
  if (!existing) return false;
  return Boolean(existing.is_enrolled) === draft.isEnrolled
    && sameNullable(existing.municipality, draft.municipality)
    && sameNullable(existing.network, draft.network)
    && sameNullable(existing.education_level, draft.educationLevel)
    && sameNullable(existing.institution_code, draft.institutionCode)
    && sameNullable(existing.institution_name, draft.institutionName)
    && sameNullable(existing.school_year, draft.schoolYear)
    && sameNullable(existing.higher_course_code, draft.higherCourseCode)
    && sameNullable(existing.higher_course_name, draft.higherCourseName);
}

function sameTimestamp(a: string | null | undefined, b: string) {
  if (!a) return false;
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}

function fixedSessionClient(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

let runningKey = '';

async function syncDraftWithSession(session: Session) {
  const draft = readJson<AthleteBackendDraft>(DRAFT_KEY);
  if (!draft || !session.access_token) return;

  const runKey = `${session.user.id}:${draft.updatedAt}`;
  const previous = readJson<SyncState>(SYNC_STATE_KEY);
  if (previous?.status === 'success' && `${previous.userId}:${previous.draftUpdatedAt}` === runKey) return;
  if (runningKey === runKey) return;
  runningKey = runKey;

  const client = fixedSessionClient(session.access_token);

  try {
    const { data: userData, error: userError } = await client.auth.getUser(session.access_token);
    const user = userData.user;
    if (userError || !user || !user.email_confirmed_at) return;
    if (user.id !== session.user.id) return;
    if (text(user.email).toLowerCase() !== draft.identification.email) return;

    writeJson(SYNC_STATE_KEY, {
      status: 'syncing',
      userId: user.id,
      draftUpdatedAt: draft.updatedAt,
      updatedAt: new Date().toISOString(),
    } satisfies SyncState);

    const profilePayload = {
      user_id: user.id,
      full_name: draft.identification.fullName,
      birth_date: draft.identification.birthDate,
      sex: draft.identification.sex,
      cpf: draft.identification.cpf,
      phone: draft.identification.phone,
      municipality: draft.identification.municipality,
      uf: draft.identification.uf,
      nickname: draft.sports.nickname,
      primary_game: draft.sports.primaryGame,
    };

    const { error: profileError } = await client
      .from('athlete_profiles')
      .upsert(profilePayload, { onConflict: 'user_id' });
    if (profileError) throw profileError;

    if (draft.guardian) {
      const { error: guardianError } = await client
        .from('athlete_guardians')
        .upsert({
          athlete_id: user.id,
          full_name: draft.guardian.fullName,
          cpf: draft.guardian.cpf,
          email: draft.guardian.email,
          phone: draft.guardian.phone,
        }, { onConflict: 'athlete_id' });
      if (guardianError) throw guardianError;
    } else {
      const { error: guardianDeleteError } = await client
        .from('athlete_guardians')
        .delete()
        .eq('athlete_id', user.id);
      if (guardianDeleteError) throw guardianDeleteError;
    }

    const { data: existingSchool, error: schoolReadError } = await client
      .from('athlete_school_links')
      .select('is_enrolled, municipality, network, education_level, institution_code, institution_name, school_year, higher_course_code, higher_course_name')
      .eq('athlete_id', user.id)
      .maybeSingle();
    if (schoolReadError) throw schoolReadError;

    if (!schoolRowsMatch(existingSchool as Record<string, unknown> | null, draft.school)) {
      const { error: schoolError } = await client
        .from('athlete_school_links')
        .upsert({
          athlete_id: user.id,
          is_enrolled: draft.school.isEnrolled,
          municipality: draft.school.municipality,
          network: draft.school.network,
          education_level: draft.school.educationLevel,
          institution_code: draft.school.institutionCode,
          institution_name: draft.school.institutionName,
          school_year: draft.school.schoolYear,
          higher_course_code: draft.school.higherCourseCode,
          higher_course_name: draft.school.higherCourseName,
        }, { onConflict: 'athlete_id' });
      if (schoolError) throw schoolError;
    }

    const year = new Date().getFullYear();
    const { data: currentAnnual, error: annualReadError } = await client
      .from('athlete_annual_updates')
      .select('id, submitted_at')
      .eq('athlete_id', user.id)
      .eq('year', year)
      .maybeSingle();
    if (annualReadError) throw annualReadError;

    if (!currentAnnual || !sameTimestamp(currentAnnual.submitted_at, draft.updatedAt)) {
      const { error: annualError } = await client
        .from('athlete_annual_updates')
        .upsert({
          athlete_id: user.id,
          year,
          submitted_at: draft.updatedAt,
        }, { onConflict: 'athlete_id,year' });
      if (annualError) throw annualError;
    }

    writeJson(SYNC_STATE_KEY, {
      status: 'success',
      userId: user.id,
      draftUpdatedAt: draft.updatedAt,
      updatedAt: new Date().toISOString(),
    } satisfies SyncState);

    window.dispatchEvent(new CustomEvent('serfes:athlete-backend-synced', {
      detail: { userId: user.id, draftUpdatedAt: draft.updatedAt },
    }));
  } catch (error) {
    writeJson(SYNC_STATE_KEY, {
      status: 'error',
      userId: session.user.id,
      draftUpdatedAt: draft.updatedAt,
      updatedAt: new Date().toISOString(),
    } satisfies SyncState);
    console.warn('SERFES: não foi possível sincronizar o cadastro do atleta.', error);
  } finally {
    if (runningKey === runKey) runningKey = '';
  }
}

async function syncFromCurrentSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) await syncDraftWithSession(data.session);
}

if (typeof window !== 'undefined') {
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.classList.contains('athlete-form')) return;
    saveDraftAfterSuccessfulSubmit(form);
  }, true);

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) void syncDraftWithSession(session);
  });

  window.addEventListener('DOMContentLoaded', () => void syncFromCurrentSession(), { once: true });
  window.addEventListener('focus', () => void syncFromCurrentSession());
}
