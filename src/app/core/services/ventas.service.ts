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
  cliente_email?: string | null;
  cliente_direccion?: string | null;
  productos_nombres?: string | null;
  /** Cantidad total de productos vendidos (suma de cantidades) */
  cantidad_productos?: number;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  fecha_venta: string;
  total_venta: number;
  tipo_pago?: string | null;
  referencia_banco?: string | null;
  estatus: string;
  /** JSON desde API: productos destacados (imagen, descripción, cantidad), uno por línea de detalle relevante */
  productos_destaque?: unknown;
}

export interface ConfirmarVentaDto {
  tipo_pago?: string;
  referencia_banco?: string;
  cliente?: {
    nombre?: string;
    cedula_rif?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
  };
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
  tipo_pago?: string;
  referencia_banco?: string;
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

  getAll(filters?: {
    clienteId?: number;
    estatus?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    busqueda?: string;
    /** Dashboard: cola pendientes por vendedor (usuario_id) vs agente (sin usuario_id). */
    pendientesTipo?: 'vendedor' | 'agente';
  }): Observable<{ success: boolean; data: Venta[] }> {
    let params = new HttpParams();
    if (filters?.clienteId) params = params.set('clienteId', String(filters.clienteId));
    if (filters?.estatus) params = params.set('estatus', filters.estatus);
    if (filters?.fechaDesde) params = params.set('fechaDesde', filters.fechaDesde);
    if (filters?.fechaHasta) params = params.set('fechaHasta', filters.fechaHasta);
    if (filters?.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters?.pendientesTipo) params = params.set('pendientesTipo', filters.pendientesTipo);
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

  confirmar(
    id: number,
    body?: ConfirmarVentaDto
  ): Observable<{ success: boolean; data: VentaConDetalles }> {
    return this.http.patch<{ success: boolean; data: VentaConDetalles }>(
      `${this.baseUrl}/${id}/confirmar`,
      body ?? {},
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
