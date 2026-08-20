export {};

function applyProfileImageProportionFix() {
  if (document.getElementById('serfes-profile-image-proportion-fix')) return;

  const style = document.createElement('style');
  style.id = 'serfes-profile-image-proportion-fix';
  style.textContent = `
    .athlete-profile-image-corner {
      width: 194px !important;
    }

    .athlete-profile-avatar {
      width: 172px !important;
      height: 172px !important;
      border-radius: 50% !important;
      overflow: hidden !important;
    }

    .athlete-profile-avatar img {
      width: 126% !important;
      height: 126% !important;
      max-width: none !important;
      max-height: none !important;
      object-fit: cover !important;
      object-position: center !important;
      background: transparent !important;
      transform: translate(-10.3%, -10.3%) !important;
    }

    @media (max-width: 680px) {
      .athlete-profile-image-corner {
        width: auto !important;
      }

      .athlete-profile-avatar {
        width: 132px !important;
        height: 132px !important;
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
