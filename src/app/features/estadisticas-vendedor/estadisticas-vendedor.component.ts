import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { EstadisticasService } from '../../core/services/estadisticas.service';

@Component({
  selector: 'chango-estadisticas-vendedor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estadisticas-vendedor.component.html',
  styleUrl: './estadisticas-vendedor.component.css'
})
export class EstadisticasVendedorComponent implements OnInit {
  fechaDesde = '';
  fechaHasta = '';
  resumen: { monto_total?: number | string; cantidad_ventas?: number | string } | null = null;
  topProductos: Array<{
    producto_id: number;
    nombre: string | null;
    ingresos_totales: number | string;
    unidades: number | string;
  }> = [];
  topClientes: Array<{
    cliente_id: number;
    nombre: string | null;
    total: number | string;
    cantidad_ventas: number | string;
  }> = [];
  loading = true;
  error: string | null = null;

  constructor(
    private estadisticasService: EstadisticasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const { desde, hasta } = this.rangoMesActual();
    this.fechaDesde = desde;
    this.fechaHasta = hasta;
    this.cargar();
  }

  private rangoMesActual(): { desde: string; hasta: string } {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const desde = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const last = new Date(y, m + 1, 0).getDate();
    const hasta = `${y}-${String(m + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
    return { desde, hasta };
  }

  cargar() {
    this.loading = true;
    this.error = null;
    const d = this.fechaDesde?.trim() || undefined;
    const h = this.fechaHasta?.trim() || undefined;

    forkJoin({
      resumen: this.estadisticasService.getVendedorResumen(d, h),
      topProductos: this.estadisticasService.getVendedorTopProductos(d, h),
      topClientes: this.estadisticasService.getVendedorTopClientes(d, h)
    }).subscribe({
      next: ({ resumen, topProductos, topClientes }) => {
        this.resumen = resumen.data ?? null;
        this.topProductos = topProductos.data || [];
        this.topClientes = topClientes.data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.resumen = null;
        this.topProductos = [];
        this.topClientes = [];
        this.loading = false;
        this.error = 'No se pudieron cargar las estadísticas. Probá de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }

  num(v: number | string | undefined | null): number {
    if (v == null) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
}
