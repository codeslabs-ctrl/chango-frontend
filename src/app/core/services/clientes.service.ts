import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Cliente {
  cliente_id: number;
  nombre: string;
  cedula_rif: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  fecha_registro: string;
}

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private baseUrl = `${environment.apiUrl}/clientes`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private getOptions() {
    return { headers: this.auth.getAuthHeaders() };
  }

  getAll(): Observable<{ success: boolean; data: Cliente[] }> {
    return this.http.get<{ success: boolean; data: Cliente[] }>(this.baseUrl, this.getOptions());
  }

  getById(id: number): Observable<{ success: boolean; data: Cliente }> {
    return this.http.get<{ success: boolean; data: Cliente }>(
      `${this.baseUrl}/${id}`,
      this.getOptions()
    );
  }

  update(id: number, dto: { nombre?: string; cedula_rif?: string; telefono?: string; email?: string; direccion?: string }): Observable<{ success: boolean; data: Cliente }> {
    return this.http.put<{ success: boolean; data: Cliente }>(`${this.baseUrl}/${id}`, dto, this.getOptions());
  }
}
