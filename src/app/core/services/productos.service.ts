import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Producto {
  producto_id: number;
  codigo_interno: string;
  descripcion: string;
  nombre: string | null;
  subcategoria_id: number | null;
  subcategoria_nombre?: string | null;
  proveedor_id: number | null;
  proveedor_nombre?: string | null;
  existencia_actual: number;
  unidad_medida: string | null;
  precio_venta_sugerido: number;
  fecha_ultimo_inventario: string | null;
  estatus?: string;
  tiene_ventas?: boolean;
}

export interface ProductoAlmacenDto {
  almacen_id: number;
  stock_actual?: number;
}

export interface CreateProductoDto {
  codigo_interno: string;
  descripcion: string;
  nombre?: string;
  subcategoria_id?: number;
  proveedor_id?: number;
  unidad_medida?: string;
  precio_venta_sugerido?: number;
  almacenes?: ProductoAlmacenDto[];
  estatus?: 'A' | 'C';
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private baseUrl = `${environment.apiUrl}/productos`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private getOptions() {
    return { headers: this.auth.getAuthHeaders() };
  }

  getAll(filters?: { subcategoriaId?: number; proveedorId?: number; almacenId?: number }): Observable<{ success: boolean; data: Producto[] }> {
    let params = new HttpParams();
    if (filters?.subcategoriaId) params = params.set('subcategoriaId', filters.subcategoriaId);
    if (filters?.proveedorId) params = params.set('proveedorId', filters.proveedorId);
    if (filters?.almacenId) params = params.set('almacenId', filters.almacenId);
    return this.http.get<{ success: boolean; data: Producto[] }>(this.baseUrl, {
      ...this.getOptions(),
      params
    });
  }

  getById(id: number): Observable<{ success: boolean; data: Producto }> {
    return this.http.get<{ success: boolean; data: Producto }>(
      `${this.baseUrl}/${id}`,
      this.getOptions()
    );
  }

  create(dto: CreateProductoDto): Observable<{ success: boolean; data: Producto }> {
    return this.http.post<{ success: boolean; data: Producto }>(this.baseUrl, dto, this.getOptions());
  }

  update(id: number, dto: Partial<CreateProductoDto>): Observable<{ success: boolean; data: Producto }> {
    return this.http.put<{ success: boolean; data: Producto }>(`${this.baseUrl}/${id}`, dto, this.getOptions());
  }

  updateEstatus(id: number, estatus: 'A' | 'C'): Observable<{ success: boolean; data: Producto }> {
    return this.http.patch<{ success: boolean; data: Producto }>(
      `${this.baseUrl}/${id}/estatus`,
      { estatus },
      this.getOptions()
    );
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`, this.getOptions());
  }
}
