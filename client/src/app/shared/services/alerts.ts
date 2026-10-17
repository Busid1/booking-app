import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

/** Color de marca actual (variable CSS --brand-600), para los botones de SweetAlert. */
function brand(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--brand-600').trim();
  return value ? `rgb(${value.split(/\s+/).join(',')})` : '#4f46e5';
}
const DANGER = '#e11d48';

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (el) => {
    el.addEventListener('mouseenter', Swal.stopTimer);
    el.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

/** Extrae un mensaje legible de un error HTTP de la API (NestJS). */
export function getErrorMessage(error: unknown, fallback = 'Ha ocurrido un error inesperado'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se ha podido conectar con el servidor. Revisa tu conexión.';
    const message = error.error?.message;
    if (Array.isArray(message)) return message[0];
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export const alerts = {
  success(title: string, text?: string) {
    return toast.fire({ icon: 'success', title, text });
  },

  info(title: string, text?: string) {
    return toast.fire({ icon: 'info', title, text });
  },

  error(error: unknown, fallback?: string) {
    return Swal.fire({
      icon: 'error',
      title: 'Algo ha fallado',
      text: typeof error === 'string' ? error : getErrorMessage(error, fallback),
      confirmButtonColor: brand(),
      confirmButtonText: 'Entendido',
    });
  },

  warning(title: string, text?: string) {
    return Swal.fire({ icon: 'warning', title, text, confirmButtonColor: brand(), confirmButtonText: 'Ok' });
  },

  async confirm(options: { title: string; text?: string; confirmText?: string; cancelText?: string; danger?: boolean }) {
    const result = await Swal.fire({
      icon: options.danger ? 'warning' : 'question',
      title: options.title,
      text: options.text,
      showCancelButton: true,
      reverseButtons: true,
      focusCancel: options.danger,
      confirmButtonText: options.confirmText ?? 'Confirmar',
      cancelButtonText: options.cancelText ?? 'Cancelar',
      confirmButtonColor: options.danger ? DANGER : brand(),
      cancelButtonColor: '#64748b',
    });
    return result.isConfirmed;
  },
};
