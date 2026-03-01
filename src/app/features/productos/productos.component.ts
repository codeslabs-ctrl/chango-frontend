import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ProductosService, Producto } from '../../core/services/productos.service';
import { SubcategoriasService, Subcategoria } from '../../core/services/subcategorias.service';
import { AlmacenesService, Almacen } from '../../core/services/almacenes.service';

interface StockAlmacenInput {
  almacen_id: number;
  almacen_nombre: string;
  stock_actual: number;
  cantidad_a_sumar: number;
}

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

  stockModalProducto: Producto | null = null;
  stockModalInputs: StockAlmacenInput[] = [];
  stockModalPrecio: number = 0;
  stockModalSaving = false;

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
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.loadSubcategorias();
    this.loadAlmacenes();
    this.load();
    this.route.queryParams.subscribe(params => {
      const stockId = params['stock'];
      if (stockId) {
        const id = Number(stockId);
        if (!isNaN(id)) {
          this.router.navigate([], { queryParams: {}, replaceUrl: true });
          setTimeout(() => this.openStockModal(id), 300);
        }
      }
    });
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

  load(forceRefresh = false) {
    this.loading = true;
    const filters = {
      subcategoriaId: this.filterSubcategoriaId ? Number(this.filterSubcategoriaId) : undefined,
      almacenId: this.filterAlmacenId ? Number(this.filterAlmacenId) : undefined,
      ...(forceRefresh && { _refresh: Date.now() })
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

  openStockModal(productoId: number) {
    if (this.stockModalProducto) return;
    this.productosService.getById(productoId).subscribe({
      next: (res) => {
        const p = res.data;
        if (!p) return;
        this.almacenesService.getAll().subscribe({
          next: (almRes) => {
            const almacenesList = almRes.data || [];
            const almacenesConStock = (p as { almacenes?: { almacen_id: number; almacen_nombre: string; stock_actual: number }[] }).almacenes || [];
            const mapStock = new Map(almacenesConStock.map(a => [a.almacen_id, a.stock_actual]));
            this.stockModalInputs = almacenesList
              .filter(a => (a.estatus || 'A') === 'A')
              .map(a => ({
                almacen_id: a.almacen_id,
                almacen_nombre: a.nombre,
                stock_actual: mapStock.get(a.almacen_id) ?? 0,
                cantidad_a_sumar: 0
              }));
            this.stockModalProducto = p;
            this.stockModalPrecio = p.precio_venta_sugerido ?? 0;
            this.ngZone.run(() => this.cdr.detectChanges());
          }
        });
      }
    });
  }

  closeStockModal() {
    this.stockModalProducto = null;
    this.stockModalInputs = [];
    this.cdr.detectChanges();
  }

  onlyNumbers(event: KeyboardEvent) {
    const key = event.key;
    if (key === '+' || key === '-' || key === 'e' || key === 'E' || key === '.') {
      event.preventDefault();
    }
  }

  onStockPaste(event: ClipboardEvent, item: StockAlmacenInput) {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') || '').replace(/[^0-9]/g, '');
    const num = Math.max(0, parseInt(pasted, 10) || 0);
    item.cantidad_a_sumar = num;
    this.cdr.detectChanges();
  }

  saveStock() {
    if (!this.stockModalProducto) return;
    const almacenes = this.stockModalInputs
      .map(i => ({
        almacen_id: i.almacen_id,
        cantidad_a_sumar: Math.max(0, Math.floor(Number(i.cantidad_a_sumar) || 0))
      }))
      .filter(i => i.cantidad_a_sumar > 0);
    const tieneAlmacenes = almacenes.length > 0;
    const precioCambiado = this.stockModalPrecio !== (this.stockModalProducto.precio_venta_sugerido ?? 0);
    if (!tieneAlmacenes && !precioCambiado) {
      this.closeStockModal();
      return;
    }
    this.stockModalSaving = true;
    this.productosService.addStock(this.stockModalProducto.producto_id, {
      almacenes,
      precio_venta_sugerido: precioCambiado ? this.stockModalPrecio : undefined
    }).pipe(
      finalize(() => {
        this.stockModalSaving = false;
        this.ngZone.run(() => this.cdr.detectChanges());
      })
    ).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.closeStockModal();
          this.load(true);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        alert(err?.error?.message || 'Error al actualizar');
      }
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
