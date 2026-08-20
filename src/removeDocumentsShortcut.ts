export {};

function text(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function removeDocumentsShortcut() {
  document.querySelectorAll<HTMLButtonElement>('.athlete-home-shortcut').forEach((button) => {
    const label = text(button.textContent);
    if (label.includes('documentos') || label.includes('meus documentos')) {
      button.remove();
    }
  });
}

let scheduled = false;
function scheduleRemoval() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    removeDocumentsShortcut();
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', scheduleRemoval, { once: true });
  window.addEventListener('focus', scheduleRemoval);

  const observer = new MutationObserver(scheduleRemoval);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}
