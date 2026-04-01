import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductosService } from '../../../core/services/productos.service';
import { CategoriasService } from '../../../core/services/categorias.service';
import { SubcategoriasService } from '../../../core/services/subcategorias.service';
import { AlmacenesService } from '../../../core/services/almacenes.service';
import { resolveProductImageUrl } from '../../../core/utils/product-image.util';

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
    costo: 0,
    precio_venta_sugerido: 0,
    almacenes: [] as { almacen_id: number; stock_actual: number; stock_minimo: number }[],
    estatus: 'A' as 'A' | 'C',
    imagen_url: null as string | null
  };

  imagenUrlDraft = '';
  imagenArchivoListo: File | null = null;
  imagenArchivoNombre = '';
  imagenSaving = false;
  imagenFeedback: string | null = null;
  imagenFeedbackOk = true;
  imagenDragSobreZona = false;

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productosService: ProductosService,
    private categoriasService: CategoriasService,
    private subcategoriasService: SubcategoriasService,
    private almacenesService: AlmacenesService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  /** Cierra "Cargando..." y fuerza pintado (evita quedar colgado tras HTTP anidados). */
  private terminarCargaFormulario(): void {
    this.ngZone.run(() => {
      this.loading = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  ngOnInit() {
    this.productoId = Number(this.route.snapshot.paramMap.get('id'));
    this.categoriasService.getAll().subscribe({
      next: (res) => {
        this.categorias = res.data || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.categorias = [];
        this.cdr.detectChanges();
      }
    });
    this.almacenesService.getAll().subscribe({
      next: (res) => {
        this.almacenes = res.data || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.almacenes = [];
        this.cdr.detectChanges();
      }
    });
    this.productosService.getById(this.productoId).subscribe({
      next: (res) => {
        const p = res.data!;
        const data = res.data as {
          almacenes?: { almacen_id: number; stock_actual: number; stock_minimo?: number }[];
          imagen_url?: string | null;
        } & typeof p;
        this.form = {
          codigo_interno: p.codigo_interno,
          descripcion: p.descripcion,
          nombre: p.nombre || '',
          categoria_id: null,
          subcategoria_id: p.subcategoria_id,
          costo: p.costo ?? 0,
          precio_venta_sugerido: p.precio_venta_sugerido,
          imagen_url: data.imagen_url ?? null,
          almacenes: (data.almacenes || []).map(a => {
            const sm = a.stock_minimo;
            const stockMinimo =
              sm !== undefined && sm !== null
                ? Math.max(0, Math.floor(Number(sm)))
                : 10;
            return {
              almacen_id: a.almacen_id,
              stock_actual: a.stock_actual ?? 0,
              stock_minimo: Number.isFinite(stockMinimo) ? stockMinimo : 10
            };
          }),
          estatus: (p.estatus === 'C' ? 'C' : 'A') as 'A' | 'C'
        };
        if (p.subcategoria_id) {
          this.subcategoriasService.getAll().subscribe({
            next: (subRes) => {
              const all = subRes.data || [];
              const sub = all.find(s => s.subcategoria_id === p.subcategoria_id);
              if (sub) {
                this.form.categoria_id = sub.categoria_id;
                this.subcategoriasService.getAll(sub.categoria_id).subscribe({
                  next: (catRes) => {
                    this.subcategorias = catRes.data || [];
                    this.terminarCargaFormulario();
                  },
                  error: () => this.terminarCargaFormulario()
                });
              } else {
                this.subcategorias = all;
                this.terminarCargaFormulario();
              }
            },
            error: () => this.terminarCargaFormulario()
          });
        } else {
          this.terminarCargaFormulario();
        }
      },
      error: () => {
        this.terminarCargaFormulario();
        this.router.navigate(['/productos']);
      }
    });
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

  imagenPreviewSrc(): string {
    return resolveProductImageUrl(this.form.imagen_url);
  }

  private esImagenAceptada(file: File): boolean {
    const ok =
      /^image\/(jpeg|png|gif|webp)$/i.test(file.type) ||
      /\.(jpe?g|png|gif|webp)$/i.test(file.name);
    return ok;
  }

  onImagenArchivoElegido(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    if (!f) {
      this.imagenArchivoListo = null;
      this.imagenArchivoNombre = '';
      this.cdr.detectChanges();
      return;
    }
    if (!this.esImagenAceptada(f)) {
      input.value = '';
      this.imagenArchivoListo = null;
      this.imagenArchivoNombre = '';
      this.cdr.detectChanges();
      return;
    }
    this.imagenArchivoListo = f;
    this.imagenArchivoNombre = f.name;
    this.imagenUrlDraft = '';
    this.imagenFeedback = null;
    this.cdr.detectChanges();
    this.subirImagenArchivoInmediato(f);
  }

  onImagenDragOver(ev: DragEvent) {
    if (this.imagenSaving) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.dataTransfer) {
      ev.dataTransfer.dropEffect = 'copy';
    }
    this.imagenDragSobreZona = true;
    this.cdr.detectChanges();
  }

  onImagenDragLeave(ev: DragEvent) {
    if (this.imagenSaving) return;
    ev.preventDefault();
    ev.stopPropagation();
    const related = ev.relatedTarget as Node | null;
    const zone = ev.currentTarget as HTMLElement;
    if (related && zone.contains(related)) return;
    this.imagenDragSobreZona = false;
    this.cdr.detectChanges();
  }

  onImagenDrop(ev: DragEvent) {
    if (this.imagenSaving) return;
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
    this.imagenArchivoListo = f;
    this.imagenArchivoNombre = f.name;
    this.imagenUrlDraft = '';
    this.imagenFeedback = null;
    const el = document.getElementById('producto-imagen-file-edit') as HTMLInputElement | null;
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
    this.subirImagenArchivoInmediato(f);
  }

  /** Tras pegar en el campo URL, el modelo aplica en el siguiente tick. */
  onImagenUrlPegado() {
    setTimeout(() => this.intentarGuardarImagenDesdeUrl(), 0);
  }

  onImagenUrlBlur() {
    this.intentarGuardarImagenDesdeUrl();
  }

  private intentarGuardarImagenDesdeUrl(): void {
    const url = this.imagenUrlDraft.trim();
    if (!url || !/^https?:\/\//i.test(url) || this.imagenSaving || !this.productoId) return;
    this.guardarImagenDesdeUrl(url);
  }

  private subirImagenArchivoInmediato(file: File): void {
    if (this.imagenSaving || !this.productoId) return;
    this.imagenSaving = true;
    this.imagenFeedback = null;
    this.cdr.detectChanges();
    this.productosService.setImagenArchivo(this.productoId, file).subscribe({
      next: (res) => {
        this.form.imagen_url = res.data?.imagen_url ?? null;
        this.imagenArchivoListo = null;
        this.imagenArchivoNombre = '';
        const el = document.getElementById('producto-imagen-file-edit') as HTMLInputElement | null;
        if (el) el.value = '';
        this.imagenSaving = false;
        this.imagenFeedbackOk = true;
        this.imagenFeedback = 'Imagen actualizada.';
        this.cdr.detectChanges();
      },
      error: (err: { error?: { message?: string } }) => {
        this.imagenSaving = false;
        this.imagenFeedbackOk = false;
        this.imagenFeedback =
          err?.error?.message ||
          'No se pudo subir la imagen. Revisá el formato (JPEG, PNG, GIF o WebP) y el tamaño (máx. 500 KB en el servidor).';
        const el = document.getElementById('producto-imagen-file-edit') as HTMLInputElement | null;
        if (el) el.value = '';
        this.imagenArchivoNombre = '';
        this.imagenArchivoListo = null;
        this.cdr.detectChanges();
      }
    });
  }

  private guardarImagenDesdeUrl(url: string): void {
    this.imagenSaving = true;
    this.imagenFeedback = null;
    this.cdr.detectChanges();
    this.productosService.setImagenDesdeUrl(this.productoId, { url }).subscribe({
      next: (res) => {
        this.form.imagen_url = res.data?.imagen_url ?? null;
        this.imagenUrlDraft = '';
        this.imagenSaving = false;
        this.imagenFeedbackOk = true;
        this.imagenFeedback = 'Imagen actualizada.';
        this.cdr.detectChanges();
      },
      error: (err: { error?: { message?: string } }) => {
        this.imagenSaving = false;
        this.imagenFeedbackOk = false;
        this.imagenFeedback =
          err?.error?.message ||
          'No se pudo usar esa URL. Revisá el enlace y el tamaño (máx. 500 KB en el servidor).';
        this.cdr.detectChanges();
      }
    });
  }

  quitarImagenArchivo() {
    this.imagenArchivoListo = null;
    this.imagenArchivoNombre = '';
    const el = document.getElementById('producto-imagen-file-edit') as HTMLInputElement | null;
    if (el) el.value = '';
    this.cdr.detectChanges();
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
      costo: this.form.costo,
      precio_venta_sugerido: this.form.precio_venta_sugerido,
      almacenes: this.form.almacenes.map(a => {
        const v = a.stock_minimo;
        const nMin =
          v === null || v === undefined ? 10 : Math.max(0, Math.floor(Number(v)));
        return {
          almacen_id: a.almacen_id,
          stock_actual: Math.max(0, Number(a.stock_actual) || 0),
          stock_minimo: Number.isFinite(nMin) ? nMin : 10
        };
      }),
      estatus: this.form.estatus
    };
    this.productosService.update(this.productoId, dto).subscribe({
      next: () => this.router.navigate(['/productos']),
      error: (err) => {
        this.saving = false;
        this.errorMsg =
          err?.error?.message || err?.message || 'No pudimos guardar el producto. Intentá de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }
}
