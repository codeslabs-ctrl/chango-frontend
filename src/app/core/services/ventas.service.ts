import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Venta {
  venta_id: number;
  cliente_id: number | null;
  cliente_nombre?: string | null;
  cliente_cedula_rif?: string | null;
  cliente_telefono?: string | null;
  productos_nombres?: string | null;
  fecha_venta: string;
  total_venta: number;
  metodo_pago: string | null;
  estatus: string;
}

export interface VentaDetalle {
  detalle_id: number;
  producto_id: number;
  producto_descripcion?: string;
  cantidad: number;
  precio_unitario: number;
}

export interface VentaConDetalles {
  venta: Venta;
  detalles: VentaDetalle[];
}

export interface DespachoAlmacenDto {
  almacen_id: number;
  cantidad: number;
}

export interface CreateVentaDetalleDto {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  despachos: DespachoAlmacenDto[];
}

export interface CreateVentaDto {
  cliente_id?: number;
  metodo_pago?: string;
  detalles: CreateVentaDetalleDto[];
  confirmar?: boolean;
}

@Injectable({ providedIn: 'root' })
export class VentasService {
  private baseUrl = `${environment.apiUrl}/ventas`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private getOptions() {
    return { headers: this.auth.getAuthHeaders() };
  }

  getAll(filters?: { clienteId?: number; estatus?: string }): Observable<{ success: boolean; data: Venta[] }> {
    let params = new HttpParams();
    if (filters?.clienteId) params = params.set('clienteId', filters.clienteId);
    if (filters?.estatus) params = params.set('estatus', filters.estatus);
    return this.http.get<{ success: boolean; data: Venta[] }>(this.baseUrl, {
      ...this.getOptions(),
      params
    });
  }

  getById(id: number): Observable<{ success: boolean; data: VentaConDetalles }> {
    return this.http.get<{ success: boolean; data: VentaConDetalles }>(
      `${this.baseUrl}/${id}`,
      this.getOptions()
    );
  }

  create(dto: CreateVentaDto): Observable<{ success: boolean; data: { venta: Venta; detalles: CreateVentaDetalleDto[] } }> {
    return this.http.post<{ success: boolean; data: { venta: Venta; detalles: CreateVentaDetalleDto[] } }>(this.baseUrl, dto, this.getOptions());
  }

  confirmar(id: number): Observable<{ success: boolean; data: VentaConDetalles }> {
    return this.http.patch<{ success: boolean; data: VentaConDetalles }>(
      `${this.baseUrl}/${id}/confirmar`,
      {},
      this.getOptions()
    );
  }

  eliminar(id: number): Observable<{ success: boolean; data: VentaConDetalles }> {
    return this.http.patch<{ success: boolean; data: VentaConDetalles }>(
      `${this.baseUrl}/${id}/eliminar`,
      {},
      this.getOptions()
    );
  }
}
