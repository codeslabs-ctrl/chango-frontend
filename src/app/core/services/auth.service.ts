import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Router } from '@angular/router';

export type RolUsuario = 'administrador' | 'usuario';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
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
  user = signal<AuthUser | null>(this.getStoredUser());
  isAuthenticated = computed(() => !!this.token());
  username = computed(() => this.user()?.username ?? null);
  isAdmin = computed(() => this.user()?.rol === 'administrador');

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  private getStoredToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private getStoredUser(): AuthUser | null {
    try {
      const s = localStorage.getItem(this.userKey);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }

  login(username: string, password: string) {
    return this.api.post<LoginResponse & { token?: string; user?: AuthUser }>('/auth/login', {
      usernameOrEmail: username,
      password
    });
  }

  setSession(token: string, user: AuthUser): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.token.set(token);
    this.user.set(user);
  }

  updateUser(user: Partial<AuthUser>): void {
    const current = this.user();
    if (!current) return;
    const updated = { ...current, ...user };
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
