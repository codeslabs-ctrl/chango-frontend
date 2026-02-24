import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Subcategoria {
  subcategoria_id: number;
  nombre: string;
  categoria_id: number;
  categoria_nombre?: string;
}

@Injectable({ providedIn: 'root' })
export class SubcategoriasService {
  private baseUrl = `${environment.apiUrl}/subcategorias`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private getOptions() {
    return { headers: this.auth.getAuthHeaders() };
  }

  getAll(categoriaId?: number): Observable<{ success: boolean; data: Subcategoria[] }> {
    let params = new HttpParams();
    if (categoriaId) params = params.set('categoriaId', categoriaId);
    return this.http.get<{ success: boolean; data: Subcategoria[] }>(this.baseUrl, {
      ...this.getOptions(),
      params
    });
  }

  create(dto: { nombre: string; categoria_id: number }): Observable<{ success: boolean; data: Subcategoria }> {
    return this.http.post<{ success: boolean; data: Subcategoria }>(this.baseUrl, dto, this.getOptions());
  }

  update(id: number, dto: { nombre?: string; categoria_id?: number }): Observable<{ success: boolean; data: Subcategoria }> {
    return this.http.put<{ success: boolean; data: Subcategoria }>(`${this.baseUrl}/${id}`, dto, this.getOptions());
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`, this.getOptions());
  }
}
