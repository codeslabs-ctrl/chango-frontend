import { environment } from '../../../environments/environment';

const PLACEHOLDER = 'assets/images/producto-sin-imagen.svg';

type EnvWithUploads = typeof environment & { uploadsPublicOrigin?: string };

function apiOrigin(): string {
  const api = environment.apiUrl;
  if (api.startsWith('http://') || api.startsWith('https://')) {
    try {
      return new URL(api).origin;
    } catch {
      return '';
    }
  }
  if (typeof globalThis !== 'undefined') {
    const w = globalThis as unknown as { location?: { origin?: string } };
    if (w.location?.origin) return w.location.origin;
  }
  return '';
}

/** Origen para prefijar rutas `/uploads/...` (archivos servidos por el backend). */
function uploadsOrigin(): string {
  const u = (environment as EnvWithUploads).uploadsPublicOrigin;
  if (typeof u === 'string' && u.trim() !== '') {
    return u.trim().replace(/\/$/, '');
  }
  return apiOrigin();
}

/**
 * Resuelve URL para mostrar una imagen de producto (servidor `/uploads/...`, absoluta o placeholder).
 */
export function resolveProductImageUrl(imagenPath: string | null | undefined): string {
  if (!imagenPath?.trim()) return PLACEHOLDER;
  const t = imagenPath.trim();
  if (/^https?:\/\//i.test(t)) return t;
  const path = t.startsWith('/') ? t : `/${t}`;
  const origin = uploadsOrigin();
  return origin ? `${origin}${path}` : path;
}
