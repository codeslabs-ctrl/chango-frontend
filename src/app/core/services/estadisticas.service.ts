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

export interface CierreVentaDiaItem {
  tipo_pago: string;
  cantidad_ventas: number;
  monto_total: number;
}

export interface CierreVentaDiaResumen {
  fecha: string;
  resumen_por_metodo: CierreVentaDiaItem[];
  total_ventas: number;
  total_monto: number;
}

export interface TazaDiaResumen {
  tasa_google: number | null;
  taza_manual: number | null;
  fuente_google: string;
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

  getCierreVentaDia(fecha?: string): Observable<{ success: boolean; data: CierreVentaDiaResumen }> {
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);
    return this.http.get<{ success: boolean; data: CierreVentaDiaResumen }>(
      `${this.baseUrl}/cierre-venta-dia`,
      { ...this.getOptions(), params }
    );
  }

  getTazaDia(): Observable<{ success: boolean; data: TazaDiaResumen }> {
    return this.http.get<{ success: boolean; data: TazaDiaResumen }>(
      `${this.baseUrl}/taza-dia`,
      this.getOptions()
    );
  }

  saveTazaDiaManual(valor: number): Observable<{ success: boolean; data: TazaDiaResumen }> {
    return this.http.put<{ success: boolean; data: TazaDiaResumen }>(
      `${this.baseUrl}/taza-dia`,
      { valor },
      this.getOptions()
    );
  }
}
