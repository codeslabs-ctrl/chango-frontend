import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { VentasService, Venta, VentaConDetalles } from '../../core/services/ventas.service';
import { ProductosService, Producto } from '../../core/services/productos.service';
import { EstadisticasService } from '../../core/services/estadisticas.service';

@Component({
  selector: 'chango-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  ventasPendientes: Venta[] = [];
  productos: Producto[] = [];
  comparativaMensual: { monto_actual?: number; monto_anterior?: number; variacion_porcentaje?: number }[] = [];
  stockCritico: { producto_id: number; nombre?: string; codigo_interno?: string; stock_total?: number }[] = [];

  loadingVentas = false;
  loadingProductos = false;
  loadingStats = { comparativa: true, stock: true };
  confirmando: number | null = null;
  modalVenta: VentaConDetalles | null = null;
  modalLoading = false;

  filterVentas = '';
  filterProductos = '';
  ventasPageSize = 10;
  ventasCurrentPage = 1;
  productosPageSize = 10;
  productosCurrentPage = 1;

  ventasSortCol: string | null = null;
  ventasSortDir: 'asc' | 'desc' = 'desc';
  productosSortCol: string | null = null;
  productosSortDir: 'asc' | 'desc' = 'asc';

  constructor(
    private ventasService: VentasService,
    private productosService: ProductosService,
    private estadisticasService: EstadisticasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadVentas();
    this.loadProductos();
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

  get kpiVariacion(): number | null {
    const v = this.comparativaMensual[0]?.variacion_porcentaje;
    return v != null ? v : null;
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

  get ventasPaginadas(): Venta[] {
    const start = (this.ventasCurrentPage - 1) * this.ventasPageSize;
    return this.ventasFiltradas.slice(start, start + this.ventasPageSize);
  }

  get ventasTotalPages(): number {
    return Math.max(1, Math.ceil(this.ventasFiltradas.length / this.ventasPageSize));
  }

  get productosFiltrados(): Producto[] {
    const q = this.filterProductos.trim().toLowerCase();
    let list = this.productos;
    if (q) {
      list = list.filter(p =>
        (p.descripcion || '').toLowerCase().includes(q) ||
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.codigo_interno || '').toLowerCase().includes(q) ||
        (p.subcategoria_nombre || '').toLowerCase().includes(q)
      );
    }
    return this.sortProductos(list);
  }

  private sortProductos(list: Producto[]): Producto[] {
    if (!this.productosSortCol) return list;
    const col = this.productosSortCol;
    const dir = this.productosSortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      let va: string | number = (a as unknown as Record<string, unknown>)[col] as string | number;
      let vb: string | number = (b as unknown as Record<string, unknown>)[col] as string | number;
      if (col === 'existencia_actual') {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else {
        va = String(va ?? '').toLowerCase();
        vb = String(vb ?? '').toLowerCase();
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return cmp * dir;
    });
  }

  sortProductosBy(col: string) {
    if (this.productosSortCol === col) {
      this.productosSortDir = this.productosSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.productosSortCol = col;
      this.productosSortDir = col === 'existencia_actual' ? 'desc' : 'asc';
    }
    this.productosCurrentPage = 1;
    this.cdr.detectChanges();
  }

  get productosPaginados(): Producto[] {
    const start = (this.productosCurrentPage - 1) * this.productosPageSize;
    return this.productosFiltrados.slice(start, start + this.productosPageSize);
  }

  get productosTotalPages(): number {
    return Math.max(1, Math.ceil(this.productosFiltrados.length / this.productosPageSize));
  }

  sortIcon(col: string, currentCol: string | null, dir: 'asc' | 'desc'): string {
    if (currentCol !== col) return '';
    return dir === 'asc' ? ' ▲' : ' ▼';
  }

  loadVentas() {
    this.loadingVentas = true;
    this.ventasService.getAll({ estatus: 'POR CONFIRMAR' }).subscribe({
      next: (res) => {
        this.ventasPendientes = res.data || [];
        this.loadingVentas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingVentas = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadProductos() {
    this.loadingProductos = true;
    this.productosService.getAll().subscribe({
      next: (res) => {
        this.productos = res.data || [];
        this.loadingProductos = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingProductos = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleEstatusProducto(p: Producto) {
    const nuevo = (p.estatus || 'A') === 'A' ? 'C' : 'A';
    this.productosService.updateEstatus(p.producto_id, nuevo).subscribe({
      next: () => {
        this.loadProductos();
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });
  }

  eliminarProducto(p: Producto) {
    if (!confirm('¿Eliminar el producto "' + (p.descripcion || p.nombre || p.codigo_interno) + '"?')) return;
    this.productosService.delete(p.producto_id).subscribe({
      next: () => {
        this.loadProductos();
        this.cdr.detectChanges();
      },
      error: (err) => {
        alert(err.error?.message || 'No pudimos eliminar. Intentá de nuevo.');
        this.cdr.detectChanges();
      }
    });
  }

  confirmar(ventaId: number) {
    this.confirmando = ventaId;
    this.cdr.detectChanges();
    this.ventasService.confirmar(ventaId).subscribe({
      next: () => {
        this.ventasPendientes = this.ventasPendientes.filter(v => v.venta_id !== ventaId);
        this.confirmando = null;
        this.modalVenta = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.confirmando = null;
        this.cdr.detectChanges();
      }
    });
  }

  verDetalle(ventaId: number) {
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

  cerrarModal() {
    this.modalVenta = null;
    this.cdr.detectChanges();
  }
}
