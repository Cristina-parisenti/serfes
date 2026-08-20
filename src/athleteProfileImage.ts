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
  canvas.width = 420;
  canvas.height = 420;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a imagem.');
  context.drawImage(image, sourceX, sourceY, size, size, 0, 0, 420, 420);
  return canvas.toDataURL('image/jpeg', 0.88);
}

function createUserIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '38');
  svg.setAttribute('height', '38');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '12');
  circle.setAttribute('cy', '8');
  circle.setAttribute('r', '5');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M20 21a8 8 0 0 0-16 0');

  svg.append(circle, path);
  return svg;
}

function injectStyles() {
  if (document.getElementById('serfes-profile-image-styles')) return;

  const style = document.createElement('style');
  style.id = 'serfes-profile-image-styles';
  style.textContent = `
    .athlete-home-hero {
      position: relative;
    }
    .athlete-home-hero:has(.athlete-profile-image-corner) .athlete-home-hero-symbol {
      display: none !important;
    }
    .athlete-profile-image-corner {
      position: absolute;
      z-index: 3;
      top: 1.35rem;
      right: 1.65rem;
      display: grid;
      justify-items: center;
      gap: .5rem;
      width: 138px;
      color: #fff;
    }
    .athlete-profile-image-corner[hidden] {
      display: none !important;
    }
    .athlete-profile-avatar {
      width: 108px;
      height: 108px;
      border-radius: 50%;
      overflow: hidden;
      display: grid;
      place-items: center;
      background: rgba(255,255,255,.14);
      border: 2px solid rgba(255,255,255,.78);
      color: #fff;
      box-shadow: 0 9px 24px rgba(0,0,0,.15);
      backdrop-filter: blur(6px);
    }
    .athlete-profile-avatar img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }
    .athlete-profile-image-input {
      display: none;
    }
    .athlete-profile-image-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      flex-wrap: wrap;
      font-size: .76rem;
    }
    .athlete-profile-upload,
    .athlete-profile-remove {
      padding: 0;
      border: 0;
      background: transparent;
      color: rgba(255,255,255,.96);
      font: inherit;
      font-weight: 800;
      text-decoration: underline;
      text-underline-offset: 3px;
      cursor: pointer;
    }
    .athlete-profile-upload:hover,
    .athlete-profile-remove:hover {
      color: #fff;
    }
    .athlete-profile-image-error {
      position: absolute;
      top: calc(100% + .35rem);
      right: 0;
      width: 220px;
      margin: 0;
      padding: .5rem .6rem;
      border-radius: 10px;
      background: #fff;
      color: #b42318;
      box-shadow: 0 8px 22px rgba(20,59,99,.14);
      font-size: .72rem;
      line-height: 1.35;
      text-align: left;
    }
    .athlete-profile-image-error[hidden] {
      display: none !important;
    }
    @media (max-width: 680px) {
      .athlete-profile-image-corner {
        position: static;
        width: auto;
        justify-items: start;
        margin-top: 1rem;
      }
      .athlete-home-hero:has(.athlete-profile-image-corner) {
        display: block;
      }
      .athlete-profile-avatar {
        width: 88px;
        height: 88px;
      }
      .athlete-profile-image-actions {
        justify-content: flex-start;
      }
      .athlete-profile-image-error {
        position: static;
        width: min(100%, 260px);
      }
    }
  `;
  document.head.append(style);
}

function buildCornerProfile() {
  const hero = document.querySelector<HTMLElement>('.athlete-home-hero');
  if (!hero) return;

  let corner = hero.querySelector<HTMLElement>('.athlete-profile-image-corner');
  if (!corner) {
    corner = document.createElement('div');
    corner.className = 'athlete-profile-image-corner';
    hero.append(corner);
  }

  const dataViewOpen = Boolean(document.querySelector('.serfes-athlete-data-view'));
  corner.hidden = dataViewOpen;
  if (dataViewOpen) return;

  const storedImage = readStoredImage();
  const meta = readMeta();
  const renderKey = `${meta?.updatedAt ?? 'empty'}:${storedImage.length}`;
  if (corner.dataset.renderKey === renderKey) return;
  corner.dataset.renderKey = renderKey;
  corner.replaceChildren();

  const avatar = document.createElement('div');
  avatar.className = 'athlete-profile-avatar';
  avatar.title = 'Imagem de identificação do perfil';

  if (storedImage) {
    const image = document.createElement('img');
    image.src = storedImage;
    image.alt = 'Imagem de identificação do perfil';
    avatar.append(image);
  } else {
    avatar.append(createUserIcon());
    avatar.setAttribute('aria-label', 'Sem imagem de identificação');
  }

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
  upload.textContent = storedImage ? 'Trocar' : 'Adicionar imagem';
  upload.addEventListener('click', () => input.click());

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'athlete-profile-remove';
  remove.textContent = 'Remover';
  remove.hidden = !storedImage;
  remove.addEventListener('click', () => {
    clearImage();
    corner!.dataset.renderKey = '';
    buildCornerProfile();
  });

  const error = document.createElement('p');
  error.className = 'athlete-profile-image-error';
  error.hidden = true;

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
      corner!.dataset.renderKey = '';
      buildCornerProfile();
    } catch (caught) {
      error.textContent = caught instanceof Error ? caught.message : 'Não foi possível salvar a imagem.';
      error.hidden = false;
    }
  });

  controls.append(input, upload, remove);
  corner.append(avatar, controls, error);
}

function removeOldCard() {
  document.querySelector<HTMLElement>('.athlete-profile-image-card')?.remove();
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    injectStyles();
    removeOldCard();
    buildCornerProfile();
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
