import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Redirige a /ventas si el usuario es vendedor (no puede ver estas rutas). */
export const denyVendedorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isVendedor()) {
    router.navigate(['/ventas']);
    return false;
  }
  return true;
};
