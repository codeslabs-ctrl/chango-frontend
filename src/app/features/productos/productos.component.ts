import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductosService, Producto } from '../../core/services/productos.service';
import { SubcategoriasService, Subcategoria } from '../../core/services/subcategorias.service';
import { AlmacenesService, Almacen } from '../../core/services/almacenes.service';

@Component({
  selector: 'chango-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {
  productos: Producto[] = [];
  loading = false;
  filterText = '';
  subcategorias: Subcategoria[] = [];
  almacenes: Almacen[] = [];
  filterSubcategoriaId: number | '' = '';
  filterAlmacenId: number | '' = '';
  pageSize = 10;
  currentPage = 1;

  get productosFiltrados(): Producto[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.productos;
    return this.productos.filter(p =>
      (p.codigo_interno || '').toLowerCase().includes(q) ||
      (p.descripcion || '').toLowerCase().includes(q) ||
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.subcategoria_nombre || '').toLowerCase().includes(q)
    );
  }

  get productosPaginados(): Producto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.productosFiltrados.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.productosFiltrados.length / this.pageSize));
  }

  get existenciaColumnLabel(): string {
    return this.filterAlmacenId
      ? 'Existencia en almacén'
      : 'Existencia total';
  }

  constructor(
    private productosService: ProductosService,
    private subcategoriasService: SubcategoriasService,
    private almacenesService: AlmacenesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadSubcategorias();
    this.loadAlmacenes();
    this.load();
  }

  loadSubcategorias() {
    this.subcategoriasService.getAll().subscribe({
      next: (res) => { this.subcategorias = res.data || []; setTimeout(() => this.cdr.detectChanges(), 0); }
    });
  }

  loadAlmacenes() {
    this.almacenesService.getAll().subscribe({
      next: (res) => { this.almacenes = res.data || []; setTimeout(() => this.cdr.detectChanges(), 0); }
    });
  }

  load() {
    this.loading = true;
    const filters = {
      subcategoriaId: this.filterSubcategoriaId ? Number(this.filterSubcategoriaId) : undefined,
      almacenId: this.filterAlmacenId ? Number(this.filterAlmacenId) : undefined
    };
    this.productosService.getAll(filters).subscribe({
      next: (res) => { this.productos = res.data || []; this.currentPage = 1; this.loading = false; setTimeout(() => this.cdr.detectChanges(), 0); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  onFilterTextChange() {
    this.currentPage = 1;
  }

  onFilterChange(subcategoriaId?: number | string | '', almacenId?: number | string | '') {
    if (subcategoriaId !== undefined) this.filterSubcategoriaId = subcategoriaId === '' ? '' : Number(subcategoriaId);
    if (almacenId !== undefined) this.filterAlmacenId = almacenId === '' ? '' : Number(almacenId);
    this.load();
  }

  toggleEstatus(p: Producto) {
    const nuevo = (p.estatus || 'A') === 'A' ? 'C' : 'A';
    this.productosService.updateEstatus(p.producto_id, nuevo).subscribe({
      next: () => {
        p.estatus = nuevo;
        this.cdr.detectChanges();
        this.load();
      },
      error: () => this.cdr.detectChanges()
    });
  }

  eliminar(p: Producto) {
    if (!confirm('¿Eliminar el producto "' + (p.descripcion || p.nombre || p.codigo_interno) + '"?')) return;
    this.productosService.delete(p.producto_id).subscribe({
      next: () => {
        this.load();
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: (err) => {
        alert(err.error?.message || 'Error al eliminar');
        this.cdr.detectChanges();
      }
    });
  }
}
