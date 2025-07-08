const TOAST_CONTAINER_ID = 'shadow-toast-container';
const DEFAULT_DURATION = 3000;

export function createToastHost(shadowRoot) {
  let container = shadowRoot.getElementById(TOAST_CONTAINER_ID);
  
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    
    // apply static container styling to container element
    Object.assign(container.style, {
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      zIndex: '9999',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      pointerEvents: 'none',
      maxWidth: '20rem'
    });
    shadowRoot.appendChild(container);
  }
  return container;
}

export function showToastInShadow(shadowRoot, message, duration = DEFAULT_DURATION, type = 'info') {
  const container = createToastHost(shadowRoot);
  
  const toast = document.createElement('div');
  toast.className = 'shadow-toast';
  toast.textContent = message;
  
  const typeStyles = {
    info: {
      backgroundColor: '#f9f9f9',
      borderColor: '#ccc',
      color: '#333'
    },
    success: {
      backgroundColor: '#f0f9f0',
      borderColor: '#4caf50',
      color: '#2e7d32'
    },
    warning: {
      backgroundColor: '#fff8e1',
      borderColor: '#ff9800',
      color: '#f57c00'
    },
    error: {
      backgroundColor: '#ffeaea',
      borderColor: '#f44336',
      color: '#c62828'
    }
  };
  
  const currentTypeStyle = typeStyles[type] || typeStyles.info;
  
  // apply toast styling to toast element
  Object.assign(toast.style, {
    backgroundColor: currentTypeStyle.backgroundColor,
    color: currentTypeStyle.color,
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    border: '0.0625rem solid ' + currentTypeStyle.borderColor,
    fontSize: '1rem',
    fontWeight: '500',
    lineHeight: '1.5',
    wordWrap: 'break-word',
    pointerEvents: 'auto',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    transform: 'translateY(10px)',
    opacity: '0',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, sans-serif'
  });
  
  container.appendChild(toast);
  
  // toast animation
  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  toast.addEventListener('click', () => {
    removeToast(toast);
  });

  setTimeout(() => {
    removeToast(toast);
  }, duration);

  return toast;
}

function removeToast(toast) {
  if (!toast || !toast.parentNode) return;
  
  toast.style.transform = 'translateY(-10px)';
  toast.style.opacity = '0';
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 200);
}

export const toast = {
  info: (shadowRoot, message, duration) => showToastInShadow(shadowRoot, message, duration, 'info'),
  success: (shadowRoot, message, duration) => showToastInShadow(shadowRoot, message, duration, 'success'),
  warning: (shadowRoot, message, duration) => showToastInShadow(shadowRoot, message, duration, 'warning'),
  error: (shadowRoot, message, duration) => showToastInShadow(shadowRoot, message, duration, 'error')
}; 

export function createToastHelper(host, message, type, duration) {
  host.dispatchEvent(
    new CustomEvent("show-toast", {
      detail: { message, type, duration },
      bubbles: true,
      composed: true,
    })
  );
}