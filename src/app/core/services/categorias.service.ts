import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Categoria {
  categoria_id: number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private baseUrl = `${environment.apiUrl}/categorias`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private getOptions() {
    return { headers: this.auth.getAuthHeaders() };
  }

  getAll(): Observable<{ success: boolean; data: Categoria[] }> {
    return this.http.get<{ success: boolean; data: Categoria[] }>(this.baseUrl, this.getOptions());
  }

  create(dto: { nombre: string }): Observable<{ success: boolean; data: Categoria }> {
    return this.http.post<{ success: boolean; data: Categoria }>(this.baseUrl, dto, this.getOptions());
  }

  update(id: number, dto: { nombre: string }): Observable<{ success: boolean; data: Categoria }> {
    return this.http.put<{ success: boolean; data: Categoria }>(`${this.baseUrl}/${id}`, dto, this.getOptions());
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`, this.getOptions());
  }
}
