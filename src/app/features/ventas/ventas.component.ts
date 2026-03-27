import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VentasService, Venta, VentaConDetalles } from '../../core/services/ventas.service';

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
  imports: [CommonModule, FormsModule, RouterLink],
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

  get ventasPaginadas(): Venta[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.ventas.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.ventas.length / this.pageSize));
  }

  constructor(
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

  confirmar(ventaId: number) {
    this.confirmando = ventaId;
    this.cdr.detectChanges();
    this.ventasService.confirmar(ventaId).subscribe({
      next: () => {
        this.confirmando = null;
        this.load();
      },
      error: () => {
        this.confirmando = null;
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
        this.load();
      },
      error: () => {
        this.eliminando = null;
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
