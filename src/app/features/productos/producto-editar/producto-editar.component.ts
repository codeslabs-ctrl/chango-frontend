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
  readonly totalPasos = 4;
  pasoActual = 1;
  productoId = 0;
  loading = true;
  saving = false;
  errorMsg = '';
  categorias: { categoria_id: number; nombre: string }[] = [];
  subcategorias: { subcategoria_id: number; nombre: string; categoria_id: number }[] = [];
  almacenes: { almacen_id: number; nombre: string; estatus?: string }[] = [];
  metodosPago: { metodo_id: number; tipo_pago: string }[] = [];
  almacenSeleccionado: number | null = null;
  form = {
    codigo_interno: '',
    descripcion: '',
    nombre: '',
    categoria_id: null as number | null,
    subcategoria_id: null as number | null,
    costo: 0,
    precio_venta_sugerido: 0,
    precios_metodo: [] as { metodo_id: number; precio: number }[],
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

  private normalizarTipoPago(tipo: string): string {
    return tipo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private esMetodoAgrupado(tipo: string): boolean {
    const t = this.normalizarTipoPago(tipo);
    return t === 'efectivo' || t === 'transferencia' || t === 'pago movil';
  }

  private asegurarPreciosMetodoIniciales() {
    if (!this.metodosPago.length) return;
    const existente = new Map(this.form.precios_metodo.map(p => [p.metodo_id, Math.max(0, Number(p.precio) || 0)]));
    this.form.precios_metodo = this.metodosPago.map(m => ({
      metodo_id: m.metodo_id,
      precio: existente.get(m.metodo_id) ?? 0
    }));
  }

  tipoPagoLabel(tipo: string): string {
    const t = this.normalizarTipoPago(tipo);
    if (t === 'pago movil') return 'Pago móvil';
    if (t === 'efectivo') return 'Efectivo';
    if (t === 'transferencia') return 'Transferencia';
    if (!tipo) return '';
    return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
  }

  get metodosIndividuales() {
    return this.metodosPago.filter(m => !this.esMetodoAgrupado(m.tipo_pago));
  }

  get precioUnificadoContado(): number {
    const primerAgrupado = this.metodosPago.find(m => this.esMetodoAgrupado(m.tipo_pago));
    if (!primerAgrupado) return Math.max(0, Number(this.form.precio_venta_sugerido) || 0);
    return this.getPrecioMetodo(primerAgrupado.metodo_id);
  }

  setPrecioUnificadoContado(value: number) {
    const precio = Math.max(0, Number(value) || 0);
    this.form.precio_venta_sugerido = precio;
    const idsAgrupados = this.metodosPago.filter(m => this.esMetodoAgrupado(m.tipo_pago)).map(m => m.metodo_id);
    this.form.precios_metodo = this.form.precios_metodo.map(pm =>
      idsAgrupados.includes(pm.metodo_id) ? { ...pm, precio } : pm
    );
    this.cdr.detectChanges();
  }

  getPrecioMetodo(metodoId: number): number {
    const row = this.form.precios_metodo.find(m => m.metodo_id === metodoId);
    return Math.max(0, Number(row?.precio) || 0);
  }

  setPrecioMetodo(metodoId: number, value: number) {
    const precio = Math.max(0, Number(value) || 0);
    this.form.precios_metodo = this.form.precios_metodo.map(pm =>
      pm.metodo_id === metodoId ? { ...pm, precio } : pm
    );
    this.cdr.detectChanges();
  }

  private buildPreciosMetodoPayload(): { metodo_id: number; precio: number }[] {
    const precioUnificado = this.precioUnificadoContado;
    return this.metodosPago.map((m) => ({
      metodo_id: m.metodo_id,
      precio: this.esMetodoAgrupado(m.tipo_pago) ? precioUnificado : this.getPrecioMetodo(m.metodo_id)
    }));
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
    this.productosService.getMetodosPago().subscribe({
      next: (res) => {
        this.metodosPago = res.data || [];
        this.asegurarPreciosMetodoIniciales();
        this.cdr.detectChanges();
      },
      error: () => {
        this.metodosPago = [];
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
          precios_metodo: (p.precios_metodo || []).map(pm => ({
            metodo_id: pm.metodo_id,
            precio: Number(pm.precio) || 0
          })),
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
        this.asegurarPreciosMetodoIniciales();
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

  irAPaso(paso: number) {
    if (paso < 1 || paso > this.totalPasos) return;
    this.pasoActual = paso;
    this.cdr.detectChanges();
  }

  pasoSiguiente() {
    if (this.pasoActual < this.totalPasos) {
      this.pasoActual += 1;
      this.cdr.detectChanges();
    }
  }

  pasoAnterior() {
    if (this.pasoActual > 1) {
      this.pasoActual -= 1;
      this.cdr.detectChanges();
    }
  }

  puedeContinuarPasoActual(): boolean {
    if (this.pasoActual !== 1) return true;
    return !!this.form.codigo_interno.trim() && !!this.form.descripcion.trim();
  }

  private inventarioObligatorioCompleto(): boolean {
    if (!this.form.almacenes.length) return false;
    return this.form.almacenes.every((a) => {
      const stockActual = Number(a.stock_actual);
      const stockMinimo = Number(a.stock_minimo);
      return Number.isFinite(stockActual) && stockActual >= 0 && Number.isFinite(stockMinimo) && stockMinimo >= 0;
    });
  }

  private costoYPrecioObligatoriosCompletos(): boolean {
    const costo = Number(this.form.costo);
    const precio = Number(this.form.precio_venta_sugerido);
    return Number.isFinite(costo) && costo >= 0 && Number.isFinite(precio) && precio >= 0;
  }

  private estatusObligatorioCompleto(): boolean {
    return this.form.estatus === 'A' || this.form.estatus === 'C';
  }

  puedeFinalizar(): boolean {
    const basicoCompleto = !!this.form.codigo_interno.trim() && !!this.form.descripcion.trim();
    return (
      basicoCompleto &&
      this.inventarioObligatorioCompleto() &&
      this.costoYPrecioObligatoriosCompletos() &&
      this.estatusObligatorioCompleto() &&
      !this.saving
    );
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
      precio_venta_sugerido: this.precioUnificadoContado,
      precios_metodo: this.buildPreciosMetodoPayload(),
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
