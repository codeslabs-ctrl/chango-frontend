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
import { VentaProductosCarouselComponent } from '../../shared/venta-productos-carousel/venta-productos-carousel.component';
import { AuthService } from '../../core/services/auth.service';

function fechaLocalHoyYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'chango-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VentaFinalizarModalComponent, VentaProductosCarouselComponent],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.css'
})
export class VentasComponent implements OnInit {
  ventas: Venta[] = [];
  loading = false;
  estatusFilter = '';
  filterText = '';
  /** YYYY-MM-DD — por defecto hoy */
  fechaDesde = '';
  fechaHasta = '';
  confirmando: number | null = null;
  eliminando: number | null = null;
  pageSize = 10;
  currentPage = 1;
  modalVenta: VentaConDetalles | null = null;
  modalLoading = false;
  modalMode: VentaModalMode = 'ver';
  modalSubmitError = '';

  get ventasPaginadas(): Venta[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.ventas.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.ventas.length / this.pageSize));
  }

  constructor(
    public auth: AuthService,
    private ventasService: VentasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const hoy = fechaLocalHoyYMD();
    this.fechaDesde = hoy;
    this.fechaHasta = hoy;
    this.load();
  }

  onEstatusChange(_val: string) {
    this.load();
  }

  setRangoHoy() {
    const hoy = fechaLocalHoyYMD();
    this.fechaDesde = hoy;
    this.fechaHasta = hoy;
    this.load();
  }

  onFechasChange() {
    this.load();
  }

  load() {
    this.loading = true;
    this.cdr.detectChanges();

    let desde = this.fechaDesde;
    let hasta = this.fechaHasta;
    if (desde && hasta && desde > hasta) {
      const t = desde;
      desde = hasta;
      hasta = t;
      this.fechaDesde = desde;
      this.fechaHasta = hasta;
    }

    const filters: {
      estatus?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      busqueda?: string;
    } = {};
    if (this.estatusFilter) filters.estatus = this.estatusFilter;
    if (desde) filters.fechaDesde = desde;
    if (hasta) filters.fechaHasta = hasta;
    const q = this.filterText.trim();
    if (q) filters.busqueda = q;

    this.ventasService.getAll(filters).subscribe({
      next: (res) => {
        this.ventas = res.data || [];
        this.currentPage = 1;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  eliminar(ventaId: number) {
    if (!confirm('¿Anular esta venta?')) return;
    this.eliminando = ventaId;
    this.cdr.detectChanges();
    this.ventasService.eliminar(ventaId).subscribe({
      next: () => {
        this.eliminando = null;
        this.load();
      },
      error: () => {
        this.eliminando = null;
        this.cdr.detectChanges();
      }
    });
  }

  verDetalle(ventaId: number) {
    this.modalSubmitError = '';
    this.modalMode = 'ver';
    this.cargarModalVenta(ventaId);
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

  onModalFinalizar(dto: ConfirmarVentaDto) {
    if (!this.modalVenta) return;
    const id = this.modalVenta.venta.venta_id;
    this.modalSubmitError = '';
    this.confirmando = id;
    this.cdr.detectChanges();
    this.ventasService.confirmar(id, dto).subscribe({
      next: () => {
        this.confirmando = null;
        this.cerrarModal();
        this.load();
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

  /** Cantidad total de productos vendidos (fallback por líneas si el API es antiguo). */
  lineasVenta(v: Venta): number {
    const n = v.cantidad_productos;
    if (n != null && n >= 0) return n;
    const s = v.productos_nombres?.trim();
    if (!s) return 0;
    return s.split(',').filter(x => x.trim().length > 0).length;
  }
}
