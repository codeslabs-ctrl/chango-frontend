import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export type RolUsuario = 'administrador' | 'usuario';

export interface Usuario {
  id: number;
  username: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  ultimo_login?: string | null;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private baseUrl = `${environment.apiUrl}/usuarios`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private getOptions() {
    return { headers: this.auth.getAuthHeaders() };
  }

  getAll(): Observable<{ success: boolean; data: Usuario[] }> {
    return this.http.get<{ success: boolean; data: Usuario[] }>(this.baseUrl, this.getOptions());
  }

  getById(id: number): Observable<{ success: boolean; data: Usuario }> {
    return this.http.get<{ success: boolean; data: Usuario }>(`${this.baseUrl}/${id}`, this.getOptions());
  }

  create(dto: { username: string; email: string; password: string; rol?: RolUsuario }): Observable<{ success: boolean; data: Usuario }> {
    return this.http.post<{ success: boolean; data: Usuario }>(this.baseUrl, dto, this.getOptions());
  }

  update(id: number, dto: { username?: string; email?: string; password?: string; rol?: RolUsuario; activo?: boolean }): Observable<{ success: boolean; data: Usuario }> {
    return this.http.put<{ success: boolean; data: Usuario }>(`${this.baseUrl}/${id}`, dto, this.getOptions());
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, this.getOptions());
  }

  updateMe(dto: { username?: string; email?: string }): Observable<{ success: boolean; data: Usuario }> {
    return this.http.patch<{ success: boolean; data: Usuario }>(`${this.baseUrl}/me`, dto, this.getOptions());
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.baseUrl}/me/change-password`,
      { currentPassword, newPassword },
      this.getOptions()
    );
  }
}
