import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductosService } from '../../../core/services/productos.service';
import { CategoriasService } from '../../../core/services/categorias.service';
import { SubcategoriasService } from '../../../core/services/subcategorias.service';
import { AlmacenesService } from '../../../core/services/almacenes.service';

@Component({
  selector: 'chango-producto-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './producto-nuevo.component.html',
  styleUrl: './producto-nuevo.component.css'
})
export class ProductoNuevoComponent implements OnInit {
  categorias: { categoria_id: number; nombre: string }[] = [];
  subcategorias: { subcategoria_id: number; nombre: string; categoria_id: number }[] = [];
  almacenes: { almacen_id: number; nombre: string; estatus?: string }[] = [];
  saving = false;
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

  onlyNumbers(event: KeyboardEvent) {
    const key = event.key;
    if (key === '+' || key === '-' || key === 'e' || key === 'E' || key === '.') {
      event.preventDefault();
    }
  }

  onStockPaste(event: ClipboardEvent, item: { almacen_id: number; stock_actual: number }) {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') || '').replace(/[^0-9]/g, '');
    const num = Math.max(0, parseInt(pasted, 10) || 0);
    item.stock_actual = num;
    this.cdr.detectChanges();
  }

  constructor(
    private productosService: ProductosService,
    private categoriasService: CategoriasService,
    private subcategoriasService: SubcategoriasService,
    private almacenesService: AlmacenesService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.categoriasService.getAll().subscribe(res => {
      this.categorias = res.data || [];
      this.cdr.detectChanges();
    });
    this.almacenesService.getAll().subscribe(res => {
      this.almacenes = res.data || [];
      this.cdr.detectChanges();
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
    this.saving = true;
    this.cdr.detectChanges();
    const dto = {
      codigo_interno: this.form.codigo_interno,
      descripcion: this.form.descripcion,
      nombre: this.form.nombre || undefined,
      subcategoria_id: this.form.subcategoria_id ?? undefined,
      precio_venta_sugerido: this.form.precio_venta_sugerido,
      almacenes: this.form.almacenes.length
        ? this.form.almacenes.map(a => ({
            almacen_id: a.almacen_id,
            stock_actual: Math.max(0, Number(a.stock_actual) || 0)
          }))
        : undefined,
      estatus: this.form.estatus
    };
    this.productosService.create(dto).subscribe({
      next: () => {
        this.router.navigate(['/productos']);
      },
      error: () => {
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }
}
