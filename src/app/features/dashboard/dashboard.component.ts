import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  VentasService,
  Venta,
  VentaConDetalles,
  ConfirmarVentaDto
} from '../../core/services/ventas.service';
import {
  VentaFinalizarModalComponent,
  VentaModalMode
} from '../../shared/venta-finalizar-modal/venta-finalizar-modal.component';
import {
  EstadisticasService,
  StockCriticoItem
} from '../../core/services/estadisticas.service';
import { VentaProductosCarouselComponent } from '../../shared/venta-productos-carousel/venta-productos-carousel.component';

/** Solo estos estatus listan en el dashboard (nunca confirmadas ni eliminadas). */
const ESTATUS_VENTA_PENDIENTE_DASHBOARD = new Set([
  'POR CONFIRMAR',
  'PENDIENTE',
  'POR FACTURAR'
]);

@Component({
  selector: 'chango-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VentaFinalizarModalComponent, VentaProductosCarouselComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  ventasPendientes: Venta[] = [];
  comparativaMensual: { monto_actual?: number; monto_anterior?: number; variacion_porcentaje?: number }[] = [];
  stockCritico: StockCriticoItem[] = [];

  loadingVentas = false;
  loadingStats = { comparativa: true, stock: true };
  confirmando: number | null = null;
  eliminando: number | null = null;
  modalVenta: VentaConDetalles | null = null;
  modalLoading = false;
  modalMode: VentaModalMode = 'confirmar';
  modalSubmitError = '';

  filterVentas = '';
  /** Pestaña: pendientes con vendedor asignado vs ventas del agente (sin usuario_id). */
  ventasDashboardTab: 'vendedor' | 'agente' = 'vendedor';
  ventasPageSize = 10;
  ventasCurrentPage = 1;

  ventasSortCol: string | null = null;
  ventasSortDir: 'asc' | 'desc' = 'desc';

  constructor(
    private ventasService: VentasService,
    private estadisticasService: EstadisticasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadVentas();
    this.loadStats();
  }

  loadStats() {
    this.estadisticasService.getComparativaMensual().subscribe({
      next: (res) => {
        this.comparativaMensual = res.data || [];
        this.loadingStats.comparativa = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.comparativaMensual = [];
        this.loadingStats.comparativa = false;
        this.cdr.detectChanges();
      }
    });

    this.estadisticasService.getStockCritico().subscribe({
      next: (res) => {
        this.stockCritico = res.data || [];
        this.loadingStats.stock = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.stockCritico = [];
        this.loadingStats.stock = false;
        this.cdr.detectChanges();
      }
    });
  }

  get kpiVentasPendientes(): number {
    return this.ventasPendientes.length;
  }

  get kpiMontoActual(): number {
    return Number(this.comparativaMensual[0]?.monto_actual) || 0;
  }

  get kpiStockCritico(): number {
    return this.stockCritico.length;
  }

  get ventasFiltradas(): Venta[] {
    const q = this.filterVentas.trim().toLowerCase();
    let list = this.ventasPendientes;
    if (q) {
      list = list.filter(v =>
        (v.cliente_nombre || '').toLowerCase().includes(q) ||
        (v.cliente_telefono || '').toLowerCase().includes(q) ||
        (v.productos_nombres || '').toLowerCase().includes(q)
      );
    }
    return this.sortVentas(list);
  }

  private sortVentas(list: Venta[]): Venta[] {
    if (!this.ventasSortCol) return list;
    const col = this.ventasSortCol;
    const dir = this.ventasSortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      let va: string | number = (a as unknown as Record<string, unknown>)[col] as string | number;
      let vb: string | number = (b as unknown as Record<string, unknown>)[col] as string | number;
      if (col === 'total_venta' || col === 'fecha_venta') {
        va = col === 'total_venta' ? Number(va) : new Date(va as string).getTime();
        vb = col === 'total_venta' ? Number(vb) : new Date(vb as string).getTime();
      } else {
        va = String(va ?? '').toLowerCase();
        vb = String(vb ?? '').toLowerCase();
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return cmp * dir;
    });
  }

  sortVentasBy(col: string) {
    if (this.ventasSortCol === col) {
      this.ventasSortDir = this.ventasSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.ventasSortCol = col;
      this.ventasSortDir = col === 'fecha_venta' || col === 'total_venta' ? 'desc' : 'asc';
    }
    this.ventasCurrentPage = 1;
    this.cdr.detectChanges();
  }

  onVentasSortPick(value: string) {
    const v = (value || '').trim();
    if (!v) {
      this.ventasSortCol = null;
      this.ventasSortDir = 'desc';
    } else {
      this.ventasSortCol = v;
      this.ventasSortDir = v === 'fecha_venta' || v === 'total_venta' ? 'desc' : 'asc';
    }
    this.ventasCurrentPage = 1;
    this.cdr.detectChanges();
  }

  get ventasPaginadas(): Venta[] {
    const start = (this.ventasCurrentPage - 1) * this.ventasPageSize;
    return this.ventasFiltradas.slice(start, start + this.ventasPageSize);
  }

  get ventasTotalPages(): number {
    return Math.max(1, Math.ceil(this.ventasFiltradas.length / this.ventasPageSize));
  }

  sortIcon(col: string, currentCol: string | null, dir: 'asc' | 'desc'): string {
    if (currentCol !== col) return '';
    return dir === 'asc' ? ' ▲' : ' ▼';
  }

  onVentasDashboardTabChange(tab: 'vendedor' | 'agente') {
    this.ventasDashboardTab = tab;
    this.ventasCurrentPage = 1;
    this.loadVentas();
  }

  loadVentas() {
    this.loadingVentas = true;
    this.ventasService.getAll({ pendientesTipo: this.ventasDashboardTab }).subscribe({
      next: (res) => {
        const raw = res.data || [];
        this.ventasPendientes = raw.filter(v =>
          ESTATUS_VENTA_PENDIENTE_DASHBOARD.has(String(v.estatus || '').trim())
        );
        this.loadingVentas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingVentas = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirFinalizar(v: Venta) {
    this.modalSubmitError = '';
    this.modalMode = v.usuario_id != null ? 'confirmar' : 'facturar';
    this.cargarModalVenta(v.venta_id);
  }

  private cargarModalVenta(ventaId: number) {
    this.modalVenta = null;
    this.modalLoading = true;
    this.cdr.detectChanges();
    this.ventasService.getById(ventaId).subscribe({
      next: (res) => {
        this.modalVenta = res.data || null;
        this.modalLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.modalLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  eliminar(ventaId: number) {
    if (!confirm('¿Eliminar esta venta?')) return;
    this.eliminando = ventaId;
    this.cdr.detectChanges();
    this.ventasService.eliminar(ventaId).subscribe({
      next: () => {
        this.eliminando = null;
        this.ventasPendientes = this.ventasPendientes.filter(v => v.venta_id !== ventaId);
        this.cdr.detectChanges();
      },
      error: () => {
        this.eliminando = null;
        this.cdr.detectChanges();
      }
    });
  }

  onModalFinalizar(dto: ConfirmarVentaDto) {
    if (!this.modalVenta) return;
    const id = this.modalVenta.venta.venta_id;
    this.modalSubmitError = '';
    this.confirmando = id;
    this.cdr.detectChanges();
    this.ventasService.confirmar(id, dto).subscribe({
      next: () => {
        this.ventasPendientes = this.ventasPendientes.filter(v => v.venta_id !== id);
        this.confirmando = null;
        this.cerrarModal();
        this.cdr.detectChanges();
      },
      error: (err: { error?: { message?: string } }) => {
        this.confirmando = null;
        this.modalSubmitError =
          err.error?.message || 'No se pudo finalizar la venta.';
        this.cdr.detectChanges();
      }
    });
  }

  cerrarModal() {
    this.modalVenta = null;
    this.modalLoading = false;
    this.modalSubmitError = '';
    this.cdr.detectChanges();
  }

  etiquetaBotonAccion(): string {
    return 'Facturar';
  }

  /** Cantidad de líneas / productos en la venta. */
  lineasVenta(v: Venta): number {
    const n = v.cantidad_productos;
    if (n != null && n >= 0) return n;
    const s = v.productos_nombres?.trim();
    if (!s) return 0;
    return s.split(',').filter(x => x.trim().length > 0).length;
  }

}
