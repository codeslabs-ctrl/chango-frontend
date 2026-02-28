import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VentasService, Venta } from '../../core/services/ventas.service';
import { ProductosService, Producto } from '../../core/services/productos.service';

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
  loadingVentas = false;
  loadingProductos = false;
  confirmando: number | null = null;
  filterVentas = '';
  filterProductos = '';
  ventasPageSize = 10;
  ventasCurrentPage = 1;
  productosPageSize = 10;
  productosCurrentPage = 1;

  get ventasFiltradas(): Venta[] {
    const q = this.filterVentas.trim().toLowerCase();
    if (!q) return this.ventasPendientes;
    return this.ventasPendientes.filter(v =>
      (v.cliente_nombre || '').toLowerCase().includes(q) ||
      (v.cliente_telefono || '').toLowerCase().includes(q) ||
      (v.productos_nombres || '').toLowerCase().includes(q)
    );
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
    if (!q) return this.productos;
    return this.productos.filter(p =>
      (p.descripcion || '').toLowerCase().includes(q) ||
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.codigo_interno || '').toLowerCase().includes(q) ||
      (p.subcategoria_nombre || '').toLowerCase().includes(q)
    );
  }

  get productosPaginados(): Producto[] {
    const start = (this.productosCurrentPage - 1) * this.productosPageSize;
    return this.productosFiltrados.slice(start, start + this.productosPageSize);
  }

  get productosTotalPages(): number {
    return Math.max(1, Math.ceil(this.productosFiltrados.length / this.productosPageSize));
  }

  constructor(
    private ventasService: VentasService,
    private productosService: ProductosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadVentas();
    this.loadProductos();
  }

  loadVentas() {
    this.loadingVentas = true;
    this.ventasService.getAll({ estatus: 'POR CONFIRMAR' }).subscribe({
      next: (res) => {
        this.ventasPendientes = res.data || [];
        this.loadingVentas = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: () => { this.loadingVentas = false; this.cdr.detectChanges(); }
    });
  }

  loadProductos() {
    this.loadingProductos = true;
    this.cdr.detectChanges();
    this.productosService.getAll().subscribe({
      next: (res) => {
        this.productos = res.data || [];
        this.loadingProductos = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: () => { this.loadingProductos = false; this.cdr.detectChanges(); }
    });
  }

  toggleEstatusProducto(p: Producto) {
    const nuevo = (p.estatus || 'A') === 'A' ? 'C' : 'A';
    this.productosService.updateEstatus(p.producto_id, nuevo).subscribe({
      next: () => {
        this.loadProductos();
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: () => this.cdr.detectChanges()
    });
  }

  eliminarProducto(p: Producto) {
    if (!confirm('¿Eliminar el producto "' + (p.descripcion || p.nombre || p.codigo_interno) + '"?')) return;
    this.productosService.delete(p.producto_id).subscribe({
      next: () => {
        this.loadProductos();
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: (err) => {
        alert(err.error?.message || 'Error al eliminar');
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
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: () => {
        this.confirmando = null;
        this.cdr.detectChanges();
      }
    });
  }
}
