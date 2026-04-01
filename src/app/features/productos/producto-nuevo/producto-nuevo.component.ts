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
  imagenUrlDraft = '';
  imagenArchivoListo: File | null = null;
  imagenArchivoNombre = '';
  imagenError = '';
  imagenDragSobreZona = false;
  almacenSeleccionado: number | null = null;
  form = {
    codigo_interno: '',
    descripcion: '',
    nombre: '',
    categoria_id: null as number | null,
    subcategoria_id: null as number | null,
    costo: 0,
    precio_venta_sugerido: 0,
    almacenes: [] as { almacen_id: number; stock_actual: number; stock_minimo: number }[],
    estatus: 'A' as 'A' | 'C'
  };

  get almacenesDisponibles() {
    const ids = new Set(this.form.almacenes.map(a => a.almacen_id));
    return this.almacenes.filter(a => !ids.has(a.almacen_id) && (a.estatus || 'A') === 'A');
  }

  getAlmacenById(id: number) {
    return this.almacenes.find(a => a.almacen_id === id);
  }

  onAlmacenElegidoEnDropdown(id: number | null) {
    if (id == null) {
      this.almacenSeleccionado = null;
      this.cdr.detectChanges();
      return;
    }
    if (this.form.almacenes.some(a => a.almacen_id === id)) {
      this.almacenSeleccionado = null;
      this.cdr.detectChanges();
      return;
    }
    this.form.almacenes = [...this.form.almacenes, { almacen_id: id, stock_actual: 0, stock_minimo: 10 }];
    this.almacenSeleccionado = null;
    this.cdr.detectChanges();
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

  onStockPaste(event: ClipboardEvent, item: { almacen_id: number; stock_actual: number; stock_minimo: number }) {
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

  private esImagenAceptada(file: File): boolean {
    const ok =
      /^image\/(jpeg|png|gif|webp)$/i.test(file.type) ||
      /\.(jpe?g|png|gif|webp)$/i.test(file.name);
    return ok;
  }

  private aplicarArchivoImagenNuevo(file: File | null) {
    this.imagenArchivoListo = file;
    this.imagenArchivoNombre = file?.name ?? '';
    if (file) {
      this.imagenUrlDraft = '';
    }
    this.cdr.detectChanges();
  }

  onImagenArchivoElegido(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    if (f && !this.esImagenAceptada(f)) {
      input.value = '';
      this.aplicarArchivoImagenNuevo(null);
      return;
    }
    this.aplicarArchivoImagenNuevo(f);
  }

  onImagenDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.dataTransfer) {
      ev.dataTransfer.dropEffect = 'copy';
    }
    this.imagenDragSobreZona = true;
    this.cdr.detectChanges();
  }

  onImagenDragLeave(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    const related = ev.relatedTarget as Node | null;
    const zone = ev.currentTarget as HTMLElement;
    if (related && zone.contains(related)) return;
    this.imagenDragSobreZona = false;
    this.cdr.detectChanges();
  }

  onImagenDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.imagenDragSobreZona = false;
    const f = ev.dataTransfer?.files?.[0] ?? null;
    if (!f) {
      this.cdr.detectChanges();
      return;
    }
    if (!this.esImagenAceptada(f)) {
      this.cdr.detectChanges();
      return;
    }
    this.aplicarArchivoImagenNuevo(f);
    const el = document.getElementById('producto-imagen-file-nuevo') as HTMLInputElement | null;
    if (el) {
      try {
        const dt = new DataTransfer();
        dt.items.add(f);
        el.files = dt.files;
      } catch {
        el.value = '';
      }
    }
    this.cdr.detectChanges();
  }

  onImagenUrlDraftChange() {
    this.imagenArchivoListo = null;
    this.imagenArchivoNombre = '';
    const el = document.getElementById('producto-imagen-file-nuevo') as HTMLInputElement | null;
    if (el) el.value = '';
    this.cdr.detectChanges();
  }

  quitarImagenArchivo() {
    this.imagenArchivoListo = null;
    this.imagenArchivoNombre = '';
    const el = document.getElementById('producto-imagen-file-nuevo') as HTMLInputElement | null;
    if (el) el.value = '';
    this.cdr.detectChanges();
  }

  guardar() {
    this.saving = true;
    this.cdr.detectChanges();
    const dto = {
      codigo_interno: this.form.codigo_interno,
      descripcion: this.form.descripcion,
      nombre: this.form.nombre || undefined,
      subcategoria_id: this.form.subcategoria_id ?? undefined,
      costo: this.form.costo,
      precio_venta_sugerido: this.form.precio_venta_sugerido,
      almacenes: this.form.almacenes.length
        ? this.form.almacenes.map(a => {
            const nMin = Math.max(0, Math.floor(Number(a.stock_minimo ?? 10)));
            const row: { almacen_id: number; stock_actual: number; stock_minimo: number } = {
              almacen_id: a.almacen_id,
              stock_actual: Math.max(0, Number(a.stock_actual) || 0),
              stock_minimo: Number.isFinite(nMin) ? nMin : 10
            };
            return row;
          })
        : undefined,
      estatus: this.form.estatus
    };
    this.imagenError = '';
    this.productosService.create(dto).subscribe({
      next: (res) => {
        const id = res.data?.producto_id;
        if (!id) {
          this.router.navigate(['/productos']);
          return;
        }
        const file = this.imagenArchivoListo;
        const u = this.imagenUrlDraft.trim();
        if (file) {
          this.productosService.setImagenArchivo(id, file).subscribe({
            next: () => this.router.navigate(['/productos']),
            error: (err: { error?: { message?: string } }) => {
              this.saving = false;
              this.imagenError =
                err?.error?.message ||
                'El producto se creó, pero no se pudo guardar la imagen. Podés cargarla desde editar.';
              this.cdr.detectChanges();
            }
          });
          return;
        }
        if (!u) {
          this.router.navigate(['/productos']);
          return;
        }
        this.productosService.setImagenDesdeUrl(id, { url: u }).subscribe({
          next: () => this.router.navigate(['/productos']),
          error: (err: { error?: { message?: string } }) => {
            this.saving = false;
            this.imagenError =
              err?.error?.message ||
              'El producto se creó, pero no se pudo guardar la imagen. Podés cargarla desde editar.';
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }
}
