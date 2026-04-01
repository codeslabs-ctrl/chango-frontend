export const environment = {
  production: true,
  apiUrl: '/api',
  /**
   * Vacío = mismo `window.location.origin` (app y API/nginx unificados).
   * Si subís la API en otro dominio, poné aquí la URL base del backend (sin `/api`), p. ej. `https://api.midominio.com`.
   */
  uploadsPublicOrigin: ''
};
