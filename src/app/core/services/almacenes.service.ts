import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Almacen {
  almacen_id: number;
  nombre: string;
  ubicacion: string | null;
  estatus?: string;
  tiene_productos?: boolean;
}

export interface ProductoAlmacen {
  producto_almacen_id: number;
  producto_id: number;
  codigo_interno?: string;
  descripcion?: string;
  producto_nombre?: string;
  almacen_id: number;
  almacen_nombre?: string;
  stock_actual: number;
  stock_minimo: number;
  punto_reorden: number;
}

@Injectable({ providedIn: 'root' })
export class AlmacenesService {
  private baseUrl = `${environment.apiUrl}/almacenes`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private getOptions() {
    return { headers: this.auth.getAuthHeaders() };
  }

  getAll(): Observable<{ success: boolean; data: Almacen[] }> {
    return this.http.get<{ success: boolean; data: Almacen[] }>(this.baseUrl, this.getOptions());
  }

  getProductos(almacenId: number): Observable<{ success: boolean; data: ProductoAlmacen[] }> {
    return this.http.get<{ success: boolean; data: ProductoAlmacen[] }>(
      `${this.baseUrl}/${almacenId}/productos`,
      this.getOptions()
    );
  }

  create(dto: { nombre: string; ubicacion?: string }): Observable<{ success: boolean; data: Almacen }> {
    return this.http.post<{ success: boolean; data: Almacen }>(this.baseUrl, dto, this.getOptions());
  }

  update(id: number, dto: { nombre?: string; ubicacion?: string; estatus?: 'A' | 'C' }): Observable<{ success: boolean; data: Almacen }> {
    return this.http.put<{ success: boolean; data: Almacen }>(`${this.baseUrl}/${id}`, dto, this.getOptions());
  }

  updateEstatus(id: number, estatus: 'A' | 'C'): Observable<{ success: boolean; data: Almacen }> {
    return this.http.patch<{ success: boolean; data: Almacen }>(
      `${this.baseUrl}/${id}/estatus`,
      { estatus },
      this.getOptions()
    );
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`, this.getOptions());
  }

  upsertStock(
    almacenId: number,
    productoId: number,
    dto: { stock_actual?: number; stock_minimo?: number; punto_reorden?: number }
  ): Observable<{ success: boolean; data: ProductoAlmacen }> {
    return this.http.post<{ success: boolean; data: ProductoAlmacen }>(
      `${this.baseUrl}/${almacenId}/productos/${productoId}`,
      dto,
      this.getOptions()
    );
  }
}
