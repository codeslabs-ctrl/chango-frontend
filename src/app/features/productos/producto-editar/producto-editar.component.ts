import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductosService } from '../../../core/services/productos.service';
import { CategoriasService } from '../../../core/services/categorias.service';
import { SubcategoriasService } from '../../../core/services/subcategorias.service';
import { AlmacenesService } from '../../../core/services/almacenes.service';

@Component({
  selector: 'chango-producto-editar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './producto-editar.component.html',
  styleUrl: './producto-editar.component.css'
})
export class ProductoEditarComponent implements OnInit {
  productoId = 0;
  loading = true;
  saving = false;
  errorMsg = '';
  categorias: { categoria_id: number; nombre: string }[] = [];
  subcategorias: { subcategoria_id: number; nombre: string; categoria_id: number }[] = [];
  almacenes: { almacen_id: number; nombre: string; estatus?: string }[] = [];
  almacenSeleccionado: number | null = null;
  form = {
    codigo_interno: '',
    descripcion: '',
    nombre: '',
    categoria_id: null as number | null,
    subcategoria_id: null as number | null,
    precio_venta_sugerido: 0,
    almacenes: [] as { almacen_id: number; stock_actual: number }[],
    estatus: 'A' as 'A' | 'C'
  };

  get almacenesDisponibles() {
    const ids = new Set(this.form.almacenes.map(a => a.almacen_id));
    return this.almacenes.filter(a => !ids.has(a.almacen_id) && (a.estatus || 'A') === 'A');
  }

  getAlmacenById(id: number) {
    return this.almacenes.find(a => a.almacen_id === id);
  }

  addAlmacen() {
    if (this.almacenSeleccionado && !this.form.almacenes.some(a => a.almacen_id === this.almacenSeleccionado)) {
      this.form.almacenes = [...this.form.almacenes, { almacen_id: this.almacenSeleccionado, stock_actual: 0 }];
      this.almacenSeleccionado = null;
      this.cdr.detectChanges();
    }
  }

  removeAlmacen(almacenId: number) {
    this.form.almacenes = this.form.almacenes.filter(a => a.almacen_id !== almacenId);
    this.cdr.detectChanges();
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productosService: ProductosService,
    private categoriasService: CategoriasService,
    private subcategoriasService: SubcategoriasService,
    private almacenesService: AlmacenesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.productoId = Number(this.route.snapshot.paramMap.get('id'));
    this.categoriasService.getAll().subscribe(res => {
      this.categorias = res.data || [];
      this.cdr.detectChanges();
    });
    this.almacenesService.getAll().subscribe(res => {
      this.almacenes = res.data || [];
      this.cdr.detectChanges();
    });
    this.productosService.getById(this.productoId).subscribe({
      next: (res) => {
        const p = res.data!;
        const data = res.data as { almacenes?: { almacen_id: number; stock_actual: number }[] } & typeof p;
        this.form = {
          codigo_interno: p.codigo_interno,
          descripcion: p.descripcion,
          nombre: p.nombre || '',
          categoria_id: null,
          subcategoria_id: p.subcategoria_id,
          precio_venta_sugerido: p.precio_venta_sugerido,
          almacenes: (data.almacenes || []).map(a => ({ almacen_id: a.almacen_id, stock_actual: a.stock_actual ?? 0 })),
          estatus: (p.estatus === 'C' ? 'C' : 'A') as 'A' | 'C'
        };
        if (p.subcategoria_id) {
          this.subcategoriasService.getAll().subscribe(subRes => {
            const all = subRes.data || [];
            const sub = all.find(s => s.subcategoria_id === p.subcategoria_id);
            if (sub) {
              this.form.categoria_id = sub.categoria_id;
              this.subcategoriasService.getAll(sub.categoria_id).subscribe(catRes => {
                this.subcategorias = catRes.data || [];
                this.loading = false;
                this.cdr.detectChanges();
              });
            } else {
              this.subcategorias = all;
              this.loading = false;
              this.cdr.detectChanges();
            }
          });
        } else {
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/productos']);
      }
    });
  }

  onCategoriaChange() {
    this.form.subcategoria_id = null;
    if (this.form.categoria_id) {
      this.subcategoriasService.getAll(this.form.categoria_id).subscribe(res => {
        this.subcategorias = res.data || [];
        this.cdr.detectChanges();
      });
    } else {
      this.subcategorias = [];
    }
  }

  cancelar() {
    this.router.navigate(['/productos']);
  }

  guardar() {
    this.errorMsg = '';
    this.saving = true;
    this.cdr.detectChanges();
    const dto = {
      codigo_interno: this.form.codigo_interno,
      descripcion: this.form.descripcion,
      nombre: this.form.nombre || undefined,
      subcategoria_id: this.form.subcategoria_id ?? undefined,
      precio_venta_sugerido: this.form.precio_venta_sugerido,
      almacenes: this.form.almacenes.map(a => ({
        almacen_id: a.almacen_id,
        stock_actual: Math.max(0, Number(a.stock_actual) || 0)
      })),
      estatus: this.form.estatus
    };
    this.productosService.update(this.productoId, dto).subscribe({
      next: () => this.router.navigate(['/productos']),
      error: (err) => {
        this.saving = false;
        this.errorMsg = err?.error?.message || err?.message || 'Error al guardar';
        this.cdr.detectChanges();
      }
    });
  }
}
