export {};

function applyProfileImageProportionFix() {
  if (document.getElementById('serfes-profile-image-proportion-fix')) return;

  const style = document.createElement('style');
  style.id = 'serfes-profile-image-proportion-fix';
  style.textContent = `
    .athlete-profile-image-corner {
      width: 154px !important;
    }

    .athlete-profile-avatar {
      width: 138px !important;
      height: 138px !important;
      border-radius: 22px !important;
    }

    .athlete-profile-avatar img {
      width: 118% !important;
      height: 118% !important;
      max-width: none !important;
      max-height: none !important;
      object-fit: cover !important;
      object-position: center !important;
      background: transparent !important;
    }

    @media (max-width: 680px) {
      .athlete-profile-avatar {
        width: 108px !important;
        height: 108px !important;
        border-radius: 20px !important;
      }
    }
  `;

  document.head.append(style);
}

if (typeof window !== 'undefined') {
  applyProfileImageProportionFix();
  window.addEventListener('DOMContentLoaded', applyProfileImageProportionFix, { once: true });
}
