import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Solo usuarios con rol vendedor. */
export const vendedorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isVendedor()) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
