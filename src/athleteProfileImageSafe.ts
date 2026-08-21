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
  localStorage.setItem(PROFILE_IMAGE_KEY, dataUrl);
  localStorage.setItem(PROFILE_IMAGE_META_KEY, JSON.stringify({
    name: file.name,
    type: file.type,
    updatedAt: new Date().toISOString(),
  } satisfies StoredImageMeta));
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
  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 520;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a imagem.');

  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const drawX = (canvas.width - drawWidth) / 2;
  const drawY = (canvas.height - drawHeight) / 2;
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  return canvas.toDataURL('image/jpeg', 0.9);
}

function createUserIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '54');
  svg.setAttribute('height', '54');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
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
  if (document.getElementById('serfes-profile-image-safe-styles')) return;

  const style = document.createElement('style');
  style.id = 'serfes-profile-image-safe-styles';
  style.textContent = `
    .athlete-home-hero.serfes-hero-with-profile {
      position: relative;
      min-height: 230px;
      margin-left: 246px !important;
      overflow: visible !important;
    }

    .athlete-profile-image-tile {
      position: absolute;
      top: 0;
      right: calc(100% + 16px);
      width: 230px;
      height: 230px;
      overflow: hidden;
      border: 1px solid #d8e5ef;
      border-radius: 28px;
      background: #eaf3fb;
      box-shadow: 0 12px 30px rgba(20,59,99,.08);
    }

    .athlete-profile-avatar {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      overflow: hidden;
      background: #eaf3fb;
      color: #0b5aa6;
    }

    .athlete-profile-avatar img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      object-position: center;
    }

    .athlete-profile-image-input { display: none; }

    .athlete-profile-image-actions {
      position: absolute;
      z-index: 2;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .75rem;
      min-height: 48px;
      padding: .8rem .85rem .7rem;
      background: linear-gradient(to top, rgba(9,31,51,.72), rgba(9,31,51,0));
      font-size: .76rem;
    }

    .athlete-profile-upload,
    .athlete-profile-remove {
      padding: 0;
      border: 0;
      background: transparent;
      color: #fff;
      font: inherit;
      font-weight: 800;
      text-decoration: underline;
      text-underline-offset: 3px;
      cursor: pointer;
    }

    .athlete-profile-image-error {
      position: absolute;
      z-index: 3;
      left: .75rem;
      right: .75rem;
      bottom: 3.5rem;
      margin: 0;
      padding: .52rem .62rem;
      border-radius: 10px;
      background: #fff;
      color: #b42318;
      font-size: .72rem;
      line-height: 1.35;
    }

    .athlete-profile-image-error[hidden] { display: none !important; }

    @media (max-width: 820px) {
      .athlete-home-hero.serfes-hero-with-profile {
        min-height: 190px;
        margin-left: 206px !important;
      }
      .athlete-profile-image-tile {
        width: 190px;
        height: 190px;
        border-radius: 24px;
      }
    }

    @media (max-width: 680px) {
      .athlete-home-hero.serfes-hero-with-profile {
        min-height: 0;
        margin-left: 0 !important;
        margin-top: 246px !important;
      }
      .athlete-profile-image-tile {
        top: -246px;
        right: auto;
        left: 0;
        width: 230px;
        height: 230px;
      }
    }
  `;
  document.head.append(style);
}

function buildProfileTile() {
  const hero = document.querySelector<HTMLElement>('.athlete-home-hero');
  if (!hero) return;

  hero.classList.add('serfes-hero-with-profile');
  hero.querySelector<HTMLElement>('.athlete-home-hero-symbol')?.remove();
  hero.querySelectorAll<HTMLElement>('.athlete-profile-image-corner').forEach((element) => element.remove());

  let tile = hero.querySelector<HTMLElement>(':scope > .athlete-profile-image-tile');
  if (!tile) {
    tile = document.createElement('div');
    tile.className = 'athlete-profile-image-tile';
    hero.prepend(tile);
  }

  const storedImage = readStoredImage();
  const meta = readMeta();
  const renderKey = `${meta?.updatedAt ?? 'empty'}:${storedImage.length}`;
  if (tile.dataset.renderKey === renderKey) return;
  tile.dataset.renderKey = renderKey;
  tile.replaceChildren();

  const avatar = document.createElement('div');
  avatar.className = 'athlete-profile-avatar';
  if (storedImage) {
    const image = document.createElement('img');
    image.src = storedImage;
    image.alt = 'Imagem de identificação do perfil';
    avatar.append(image);
  } else {
    avatar.append(createUserIcon());
  }

  const controls = document.createElement('div');
  controls.className = 'athlete-profile-image-actions';

  const input = document.createElement('input');
  input.type = 'file';
  input.className = 'athlete-profile-image-input';
  input.accept = 'image/jpeg,image/png,image/webp';

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
    tile!.dataset.renderKey = '';
    buildProfileTile();
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
      tile!.dataset.renderKey = '';
      buildProfileTile();
    } catch (caught) {
      error.textContent = caught instanceof Error ? caught.message : 'Não foi possível salvar a imagem.';
      error.hidden = false;
    }
  });

  controls.append(input, upload, remove);
  tile.append(avatar, controls, error);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    injectStyles();
    buildProfileTile();
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
