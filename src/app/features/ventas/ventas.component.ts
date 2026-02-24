import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VentasService, Venta, VentaConDetalles } from '../../core/services/ventas.service';

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
  confirmando: number | null = null;
  eliminando: number | null = null;
  pageSize = 10;
  currentPage = 1;
  modalVenta: VentaConDetalles | null = null;
  modalLoading = false;

  get ventasFiltradas(): Venta[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.ventas;
    return this.ventas.filter(v =>
      (v.cliente_nombre || '').toLowerCase().includes(q) ||
      (v.cliente_telefono || '').toLowerCase().includes(q) ||
      (v.productos_nombres || '').toLowerCase().includes(q) ||
      (v.estatus || '').toLowerCase().includes(q)
    );
  }

  get ventasPaginadas(): Venta[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.ventasFiltradas.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.ventasFiltradas.length / this.pageSize));
  }

  constructor(
    private ventasService: VentasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.load(); }

  onEstatusChange(val: string) {
    this.estatusFilter = val;
    this.load();
  }

  load() {
    this.loading = true;
    this.cdr.detectChanges();
    const filters = this.estatusFilter ? { estatus: this.estatusFilter } : undefined;
    this.ventasService.getAll(filters).subscribe({
      next: (res) => {
        this.ventas = res.data || [];
        this.currentPage = 1;
        this.loading = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
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
