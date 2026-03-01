import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AlmacenesService, ProductoAlmacen } from '../../../core/services/almacenes.service';

@Component({
  selector: 'chango-almacen-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './almacen-detail.component.html',
  styleUrl: './almacen-detail.component.css'
})
export class AlmacenDetailComponent implements OnInit {
  almacenId = 0;
  productos: ProductoAlmacen[] = [];
  loading = false;
  filterProductos = '';
  pageSize = 10;
  currentPage = 1;

  get productosFiltrados(): ProductoAlmacen[] {
    const q = this.filterProductos.trim().toLowerCase();
    if (!q) return this.productos;
    return this.productos.filter(p =>
      (p.descripcion || '').toLowerCase().includes(q) ||
      (p.producto_nombre || '').toLowerCase().includes(q) ||
      String(p.producto_id).toLowerCase().includes(q)
    );
  }

  get productosPaginados(): ProductoAlmacen[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.productosFiltrados.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.productosFiltrados.length / this.pageSize));
  }

  constructor(
    private route: ActivatedRoute,
    private almacenesService: AlmacenesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.almacenId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load() {
    this.loading = true;
    this.almacenesService.getProductos(this.almacenId).subscribe({
      next: (res) => { this.productos = res.data || []; this.loading = false; setTimeout(() => this.cdr.detectChanges(), 0); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }
}
