export {};

function applyProfileImageProportionFix() {
  if (document.getElementById('serfes-profile-image-proportion-fix')) return;

  const style = document.createElement('style');
  style.id = 'serfes-profile-image-proportion-fix';
  style.textContent = `
    .athlete-profile-image-corner {
      width: 164px !important;
    }

    .athlete-profile-avatar {
      width: 146px !important;
      height: 146px !important;
      border-radius: 50% !important;
    }

    .athlete-profile-avatar img {
      width: 100% !important;
      height: 100% !important;
      max-width: none !important;
      max-height: none !important;
      object-fit: cover !important;
      object-position: center !important;
      background: transparent !important;
    }

    @media (max-width: 680px) {
      .athlete-profile-avatar {
        width: 112px !important;
        height: 112px !important;
        border-radius: 50% !important;
      }
    }
  `;

  document.head.append(style);
}

if (typeof window !== 'undefined') {
  applyProfileImageProportionFix();
  window.addEventListener('DOMContentLoaded', applyProfileImageProportionFix, { once: true });
}
