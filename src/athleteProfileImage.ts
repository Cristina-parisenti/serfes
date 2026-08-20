export {};

const PROFILE_IMAGE_KEY = 'serfes-athlete-profile-image';
const PROFILE_IMAGE_META_KEY = 'serfes-athlete-profile-image-meta';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type StoredImageMeta = {
  name: string;
  type: string;
  updatedAt: string;
};

function readStoredImage() {
  try {
    return localStorage.getItem(PROFILE_IMAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function readMeta(): StoredImageMeta | null {
  try {
    const value = localStorage.getItem(PROFILE_IMAGE_META_KEY);
    return value ? JSON.parse(value) as StoredImageMeta : null;
  } catch {
    return null;
  }
}

function saveImage(dataUrl: string, file: File) {
  try {
    localStorage.setItem(PROFILE_IMAGE_KEY, dataUrl);
    localStorage.setItem(PROFILE_IMAGE_META_KEY, JSON.stringify({
      name: file.name,
      type: file.type,
      updatedAt: new Date().toISOString(),
    } satisfies StoredImageMeta));
  } catch {
    throw new Error('Não foi possível armazenar a imagem neste navegador.');
  }
}

function clearImage() {
  try {
    localStorage.removeItem(PROFILE_IMAGE_KEY);
    localStorage.removeItem(PROFILE_IMAGE_META_KEY);
  } catch {
    // Sem ação.
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível abrir a imagem selecionada.'));
    };
    image.src = url;
  });
}

async function createThumbnail(file: File) {
  const image = await loadImage(file);
  const size = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, (image.naturalWidth - size) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - size) / 2);
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 360;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a imagem.');
  context.drawImage(image, sourceX, sourceY, size, size, 0, 0, 360, 360);
  return canvas.toDataURL('image/jpeg', 0.88);
}

function injectStyles() {
  if (document.getElementById('serfes-profile-image-styles')) return;
  const style = document.createElement('style');
  style.id = 'serfes-profile-image-styles';
  style.textContent = `
    .athlete-profile-image-card {
      display: grid;
      grid-template-columns: auto minmax(0,1fr) auto;
      align-items: center;
      gap: 1rem;
      margin: 1rem 0;
      padding: 1rem 1.1rem;
      border: 1px solid #d7e5ef;
      border-radius: 20px;
      background: #fff;
      box-shadow: 0 7px 20px rgba(20,59,99,.045);
    }
    .athlete-profile-image-card[hidden] { display: none !important; }
    .athlete-profile-avatar {
      width: 76px;
      height: 76px;
      border-radius: 20px;
      overflow: hidden;
      display: grid;
      place-items: center;
      background: #eef5fb;
      color: #0b5aa6;
      font-size: 2rem;
      flex: 0 0 auto;
    }
    .athlete-profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .athlete-profile-image-copy { display: grid; gap: .28rem; }
    .athlete-profile-image-copy strong { color: #143b63; font-size: 1rem; }
    .athlete-profile-image-copy p { margin: 0; color: #61758d; font-size: .84rem; line-height: 1.45; }
    .athlete-profile-image-rule { color: #8a5a00 !important; font-size: .78rem !important; }
    .athlete-profile-image-status { color: #167b50 !important; font-size: .78rem !important; font-weight: 750; }
    .athlete-profile-image-error { color: #b42318 !important; font-size: .78rem !important; font-weight: 750; }
    .athlete-profile-image-actions { display: flex; align-items: center; gap: .55rem; flex-wrap: wrap; justify-content: flex-end; }
    .athlete-profile-image-input { display: none; }
    .athlete-profile-upload,
    .athlete-profile-remove {
      min-height: 40px;
      padding: .62rem .8rem;
      border-radius: 12px;
      font-weight: 800;
      cursor: pointer;
    }
    .athlete-profile-upload { border: 0; background: #0b5aa6; color: #fff; }
    .athlete-profile-remove { border: 1px solid #cad9e5; background: #fff; color: #526b82; }
    @media (max-width: 760px) {
      .athlete-profile-image-card { grid-template-columns: auto 1fr; align-items: start; }
      .athlete-profile-image-actions { grid-column: 1 / -1; justify-content: stretch; }
      .athlete-profile-upload,
      .athlete-profile-remove { flex: 1 1 160px; }
    }
  `;
  document.head.append(style);
}

function buildCard() {
  const hero = document.querySelector<HTMLElement>('.athlete-home-hero');
  const actions = document.querySelector<HTMLElement>('.athlete-home-actions');
  if (!hero || !actions) return;

  let card = document.querySelector<HTMLElement>('.athlete-profile-image-card');
  if (!card) {
    card = document.createElement('section');
    card.className = 'athlete-profile-image-card';
    hero.after(card);
  }

  const dataViewOpen = Boolean(document.querySelector('.serfes-athlete-data-view'));
  card.hidden = dataViewOpen;
  if (dataViewOpen) return;

  const storedImage = readStoredImage();
  const meta = readMeta();
  card.replaceChildren();

  const avatar = document.createElement('div');
  avatar.className = 'athlete-profile-avatar';
  if (storedImage) {
    const image = document.createElement('img');
    image.src = storedImage;
    image.alt = 'Imagem de identificação do perfil';
    avatar.append(image);
  } else {
    avatar.textContent = '👤';
    avatar.setAttribute('aria-label', 'Sem imagem de identificação');
  }

  const copy = document.createElement('div');
  copy.className = 'athlete-profile-image-copy';
  const title = document.createElement('strong');
  title.textContent = 'Imagem de identificação';
  const description = document.createElement('p');
  description.textContent = 'Inclua uma foto sua ou outra imagem para facilitar a identificação do perfil no SERFES.';
  const rule = document.createElement('p');
  rule.className = 'athlete-profile-image-rule';
  rule.textContent = 'Não são permitidas imagens com conteúdo ofensivo, discriminatório, violento ou sexualmente explícito.';
  const status = document.createElement('p');
  status.className = 'athlete-profile-image-status';
  status.textContent = meta ? `Imagem cadastrada: ${meta.name}` : 'Nenhuma imagem cadastrada.';
  const error = document.createElement('p');
  error.className = 'athlete-profile-image-error';
  error.hidden = true;
  copy.append(title, description, rule, status, error);

  const controls = document.createElement('div');
  controls.className = 'athlete-profile-image-actions';
  const input = document.createElement('input');
  input.type = 'file';
  input.className = 'athlete-profile-image-input';
  input.accept = 'image/jpeg,image/png,image/webp';
  input.setAttribute('aria-label', 'Selecionar imagem de identificação');

  const upload = document.createElement('button');
  upload.type = 'button';
  upload.className = 'athlete-profile-upload';
  upload.textContent = storedImage ? 'Trocar imagem' : 'Escolher imagem';
  upload.addEventListener('click', () => input.click());

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'athlete-profile-remove';
  remove.textContent = 'Remover';
  remove.hidden = !storedImage;
  remove.addEventListener('click', () => {
    clearImage();
    buildCard();
  });

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    error.hidden = true;

    if (!ALLOWED_TYPES.has(file.type)) {
      error.textContent = 'Selecione uma imagem JPG, PNG ou WEBP.';
      error.hidden = false;
      input.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      error.textContent = 'A imagem deve ter no máximo 5 MB.';
      error.hidden = false;
      input.value = '';
      return;
    }

    try {
      const dataUrl = await createThumbnail(file);
      saveImage(dataUrl, file);
      buildCard();
    } catch (caught) {
      error.textContent = caught instanceof Error ? caught.message : 'Não foi possível salvar a imagem.';
      error.hidden = false;
    }
  });

  controls.append(input, upload, remove);
  card.append(avatar, copy, controls);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    injectStyles();
    buildCard();
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  window.addEventListener('focus', schedule);
  window.addEventListener('storage', (event) => {
    if (event.key === PROFILE_IMAGE_KEY || event.key === PROFILE_IMAGE_META_KEY) schedule();
  });

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
