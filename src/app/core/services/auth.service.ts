import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Router } from '@angular/router';

export type RolUsuario = 'administrador' | 'facturador' | 'vendedor';

/** Compat: tokens o datos viejos con rol `usuario`. */
export function normalizeRolUsuario(raw: string | undefined | null): RolUsuario {
  const r = (raw ?? '').trim();
  if (r === 'administrador' || r === 'vendedor' || r === 'facturador') return r;
  if (r === 'usuario') return 'facturador';
  return 'facturador';
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  nombre_usuario?: string | null;
  rol?: RolUsuario;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'chango_token';
  private userKey = 'chango_user';

  token = signal<string | null>(this.getStoredToken());
  user = signal<AuthUser | null>(this.normalizeStoredUser(this.getStoredUserRaw()));
  isAuthenticated = computed(() => !!this.token());
  username = computed(() => this.user()?.username ?? null);
  /** Nombre completo para mostrar (navbar): `nombre_usuario` o, si no hay, `username` */
  nombreCompleto = computed(() => {
    const u = this.user();
    if (!u) return null;
    const n = u.nombre_usuario?.trim();
    return n || u.username;
  });
  isAdmin = computed(() => this.user()?.rol === 'administrador');
  isVendedor = computed(() => this.user()?.rol === 'vendedor');

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  private getStoredToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private getStoredUserRaw(): AuthUser | null {
    try {
      const s = localStorage.getItem(this.userKey);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }

  private normalizeStoredUser(u: AuthUser | null): AuthUser | null {
    if (!u || typeof u !== 'object') return null;
    return { ...u, rol: normalizeRolUsuario(u.rol as string) };
  }

  login(username: string, password: string) {
    return this.api.post<LoginResponse & { token?: string; user?: AuthUser }>('/auth/login', {
      usernameOrEmail: username,
      password
    });
  }

  setSession(token: string, user: AuthUser): void {
    const u = { ...user, rol: normalizeRolUsuario(user.rol as string) };
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(u));
    this.token.set(token);
    this.user.set(u);
  }

  updateUser(user: Partial<AuthUser>): void {
    const current = this.user();
    if (!current) return;
    const updated = {
      ...current,
      ...user,
      ...(user.rol !== undefined ? { rol: normalizeRolUsuario(user.rol as string) } : {})
    };
    localStorage.setItem(this.userKey, JSON.stringify(updated));
    this.user.set(updated);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.token.set(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  getAuthHeaders(): { [key: string]: string } {
    const t = this.token();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }
}
