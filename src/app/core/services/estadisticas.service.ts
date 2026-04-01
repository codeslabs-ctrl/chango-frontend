import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Fila de `vista_stock_critico`: bajo stock por producto y almacén. */
export interface StockCriticoItem {
  producto_id: number;
  codigo_interno?: string | null;
  nombre?: string | null;
  almacen_id?: number | null;
  almacen_nombre?: string | null;
  stock_total?: string | number | null;
  stock_minimo?: string | number | null;
  unidad_medida?: string | null;
  categoria?: string | null;
}

@Injectable({ providedIn: 'root' })
export class EstadisticasService {
  private baseUrl = `${environment.apiUrl}/estadisticas`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private getOptions() {
    return { headers: this.auth.getAuthHeaders() };
  }

  getVentasPendientes(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${this.baseUrl}/ventas-pendientes`,
      this.getOptions()
    );
  }

  getComparativaMensual(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${this.baseUrl}/comparativa-mensual`,
      this.getOptions()
    );
  }

  getResumenPorVendedor(
    fechaDesde?: string,
    fechaHasta?: string
  ): Observable<{ success: boolean; data: any[] }> {
    let params = new HttpParams();
    if (fechaDesde) params = params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params = params.set('fechaHasta', fechaHasta);
    return this.http.get<{ success: boolean; data: any[] }>(
      `${this.baseUrl}/resumen-por-vendedor`,
      { ...this.getOptions(), params }
    );
  }

  getTopProductos(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${this.baseUrl}/top-productos`,
      this.getOptions()
    );
  }

  getStockCritico(): Observable<{ success: boolean; data: StockCriticoItem[] }> {
    return this.http.get<{ success: boolean; data: StockCriticoItem[] }>(
      `${this.baseUrl}/stock-critico`,
      this.getOptions()
    );
  }

  getVendedorResumen(fechaDesde?: string, fechaHasta?: string): Observable<{ success: boolean; data: any }> {
    let params = new HttpParams();
    if (fechaDesde) params = params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params = params.set('fechaHasta', fechaHasta);
    return this.http.get<{ success: boolean; data: any }>(`${this.baseUrl}/vendedor/resumen`, {
      ...this.getOptions(),
      params
    });
  }

  getVendedorTopProductos(fechaDesde?: string, fechaHasta?: string): Observable<{ success: boolean; data: any[] }> {
    let params = new HttpParams();
    if (fechaDesde) params = params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params = params.set('fechaHasta', fechaHasta);
    return this.http.get<{ success: boolean; data: any[] }>(`${this.baseUrl}/vendedor/top-productos`, {
      ...this.getOptions(),
      params
    });
  }

  getVendedorTopClientes(fechaDesde?: string, fechaHasta?: string): Observable<{ success: boolean; data: any[] }> {
    let params = new HttpParams();
    if (fechaDesde) params = params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params = params.set('fechaHasta', fechaHasta);
    return this.http.get<{ success: boolean; data: any[] }>(`${this.baseUrl}/vendedor/top-clientes`, {
      ...this.getOptions(),
      params
    });
  }
}
