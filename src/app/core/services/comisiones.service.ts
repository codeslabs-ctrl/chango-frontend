import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ResumenComisionVendedor {
  usuario_id: number;
  nombre_usuario: string | null;
  username: string;
  porcentaje_comision: string | number;
  ventas_pendientes: number;
  monto_ventas_pendientes: string | number;
  comision_pendiente: string | number;
  ventas_pagadas: number;
  comision_pagada_total: string | number;
}

export interface VentaComisionRow {
  venta_id: number;
  fecha_venta: string;
  total_venta: string | number;
  porcentaje_comision: string | number;
  monto_comision: string | number;
  comision_pagada: boolean;
  comision_pagada_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class ComisionesService {
  private baseUrl = `${environment.apiUrl}/comisiones`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private opts() {
    return { headers: this.auth.getAuthHeaders() };
  }

  getResumen(): Observable<{ success: boolean; data: ResumenComisionVendedor[] }> {
    return this.http.get<{ success: boolean; data: ResumenComisionVendedor[] }>(
      `${this.baseUrl}/resumen`,
      this.opts()
    );
  }

  getVentasVendedor(
    vendedorId: number,
    query?: { soloPendientes?: boolean; desde?: string; hasta?: string }
  ): Observable<{ success: boolean; data: VentaComisionRow[] }> {
    let params = new HttpParams();
    if (query?.soloPendientes) params = params.set('soloPendientes', 'true');
    if (query?.desde) params = params.set('desde', query.desde);
    if (query?.hasta) params = params.set('hasta', query.hasta);
    return this.http.get<{ success: boolean; data: VentaComisionRow[] }>(
      `${this.baseUrl}/vendedor/${vendedorId}/ventas`,
      { ...this.opts(), params }
    );
  }

  marcarPagadas(body: {
    vendedor_id: number;
    hasta_fecha?: string;
    venta_ids?: number[];
  }): Observable<{ success: boolean; data: { actualizadas: number }; message?: string }> {
    return this.http.post<{ success: boolean; data: { actualizadas: number }; message?: string }>(
      `${this.baseUrl}/marcar-pagadas`,
      body,
      this.opts()
    );
  }
}
