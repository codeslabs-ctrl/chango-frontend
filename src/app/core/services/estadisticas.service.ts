import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

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

  getTopProductos(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${this.baseUrl}/top-productos`,
      this.getOptions()
    );
  }

  getStockCritico(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${this.baseUrl}/stock-critico`,
      this.getOptions()
    );
  }
}
