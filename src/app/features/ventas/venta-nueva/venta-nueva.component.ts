import { Component, OnInit, ChangeDetectorRef, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { VentasService, CreateVentaDetalleDto } from '../../../core/services/ventas.service';
import { ProductosService, Producto } from '../../../core/services/productos.service';
import { ClientesService, Cliente } from '../../../core/services/clientes.service';
import { AlmacenesService } from '../../../core/services/almacenes.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  OPCIONES_METODO_PAGO_LISTA,
  requiereReferenciaTipoPago,
  esTipoPagoEnListaScroll,
  normalizarTipoPago
} from '../../../core/tipos-pago';
import { resolveProductImageUrl } from '../../../core/utils/product-image.util';

/** Solo dígitos significativos del número (sin 58 ni ceros a la izquierda). Sirve para comparar búsqueda vs BD. */
function digitosNucleoTelefonoVe(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('58')) d = d.slice(2);
  while (d.startsWith('0')) d = d.slice(1);
  return d;
}

/** Guarda teléfono como 58 + número nacional (sin 0 inicial), p. ej. 0412… → 58412…. */
function telefonoVenParaBaseDatos(raw: string | undefined | null): string | undefined {
  const nucleo = digitosNucleoTelefonoVe(raw ?? '');
  if (!nucleo) return undefined;
  return `58${nucleo}`;
}

interface LineaVenta {
  producto_id: number;
  descripcion: string;
  imagen_url?: string | null;
  existencia_actual: number;
  precio_unitario: number;
  cantidad: number;
  almacenes: { almacen_id: number; almacen_nombre: string; stock_actual: number; cantidad_despachar: number }[];
}

@Component({
  selector: 'chango-venta-nueva',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './venta-nueva.component.html',
  styleUrl: './venta-nueva.component.css'
})
export class VentaNuevaComponent implements OnInit {
  loading = true;
  saving = false;
  errorMsg = '';
  clientes: { cliente_id: number; nombre: string; cedula_rif: string | null; telefono: string | null }[] = [];
  productos: Producto[] = [];
  productoSeleccionado: number | null = null;
  productoBusqueda = '';
  mostrarProductosDropdown = false;
  productoHighlightIndex = 0;
  clienteId: number | null = null;
  clienteSeleccionado: { nombre: string; cedula_rif: string | null; telefono: string | null } | null = null;
  cedulaBusqueda = '';
  mostrarSugerenciasCliente = false;
  clienteHighlightIndex = 0;
  mostrarFormNuevoCliente = false;
  nuevoClienteNombre = '';
  nuevoClienteCedula = '';
  nuevoClienteTelefono = '';
  nuevoClienteDireccion = '';
  nuevoClienteCorreo = '';
  guardandoCliente = false;
  @ViewChildren('sugerenciaItem') sugerenciaItems!: QueryList<ElementRef>;
  readonly opcionesMetodoPago = OPCIONES_METODO_PAGO_LISTA;
  /** Código: efectivo | transaccion | pago movil; vacío → A convenir (solo admin sin confirmar al instante) */
  tipoPagoCodigo = '';
  referenciaBanco = '';
  lineas: LineaVenta[] = [];

  almacenesOpciones: { almacen_id: number; nombre: string }[] = [];
  almacenId: number | null = null;

  constructor(
    private router: Router,
    private ventasService: VentasService,
    private productosService: ProductosService,
    private clientesService: ClientesService,
    private almacenesService: AlmacenesService,
    private cdr: ChangeDetectorRef,
    public auth: AuthService
  ) {}

  get labelPlaceholderMetodoPago(): string {
    return this.auth.isVendedor()
      ? '— Elegir método —'
      : '— A convenir / elegir —';
  }

  necesitaReferenciaMetodo(): boolean {
    return requiereReferenciaTipoPago(this.tipoPagoCodigo);
  }

  get muestraDatosPagoMovil(): boolean {
    return normalizarTipoPago(this.tipoPagoCodigo) === 'pago movil';
  }

  get muestraDatosTransferencia(): boolean {
    return normalizarTipoPago(this.tipoPagoCodigo) === 'transaccion';
  }

  ngOnInit() {
    this.clientesService.getAll().subscribe({
      next: (res) => {
        const data = (res.data || []) as Cliente[];
        this.clientes = data.map(c => ({ cliente_id: c.cliente_id, nombre: c.nombre, cedula_rif: c.cedula_rif, telefono: c.telefono }));
        this.cdr.detectChanges();
      }
    });
    this.almacenesService.getParaVenta().subscribe({
      next: (res) => {
        this.almacenesOpciones = res.data || [];
        if (this.almacenesOpciones.length === 0) {
          this.loading = false;
          this.errorMsg = 'No hay almacenes activos. No se pueden registrar ventas hasta que exista al menos uno.';
          this.cdr.detectChanges();
          return;
        }
        this.almacenId = this.almacenesOpciones[0].almacen_id;
        this.cargarProductos();
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'No pudimos cargar los almacenes. Intentá de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }

  private cargarProductos() {
    if (this.almacenId == null) return;
    this.productosService.getAll({ almacenId: this.almacenId }).subscribe({
      next: (res) => {
        this.productos = (res.data || []).filter(
          p => (p.estatus || 'A') === 'A' && (p.existencia_actual ?? 0) > 0 && (p.precio_venta_sugerido ?? 0) > 0
        );
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'No pudimos cargar los productos para este almacén.';
        this.cdr.detectChanges();
      }
    });
  }

  onAlmacenChange() {
    this.errorMsg = '';
    this.lineas = [];
    this.productoSeleccionado = null;
    this.productoBusqueda = '';
    this.loading = true;
    this.cargarProductos();
  }

  agregarProducto() {
    this.errorMsg = '';
    if (this.almacenId == null) {
      this.errorMsg = 'Elegí un almacén antes de añadir productos.';
      return;
    }
    if (!this.productoSeleccionado) return;
    const p = this.productos.find(x => x.producto_id === this.productoSeleccionado);
    if (!p || this.lineas.some(l => l.producto_id === p.producto_id)) return;

    const stock = Math.floor(Number(p.existencia_actual) || 0);
    if (stock <= 0) {
      this.errorMsg = `«${p.descripcion}» no tiene stock en el almacén seleccionado.`;
      this.cdr.detectChanges();
      return;
    }
    const almacen = this.almacenesOpciones.find(a => a.almacen_id === this.almacenId);
    const cantidadInicial = Math.min(1, stock);
    const almacenes = [
      {
        almacen_id: this.almacenId,
        almacen_nombre: almacen?.nombre ?? '',
        stock_actual: stock,
        cantidad_despachar: cantidadInicial
      }
    ];
    this.lineas = [
      ...this.lineas,
      {
        producto_id: p.producto_id,
        descripcion: p.descripcion,
        imagen_url: p.imagen_url ?? null,
        existencia_actual: stock,
        precio_unitario: p.precio_venta_sugerido ?? 0,
        cantidad: cantidadInicial,
        almacenes
      }
    ];
    this.productoSeleccionado = null;
    this.productoBusqueda = '';
    this.cdr.detectChanges();
  }

  quitarLinea(productoId: number) {
    this.lineas = this.lineas.filter(l => l.producto_id !== productoId);
    this.cdr.detectChanges();
  }

  productoYaAgregado(productoId: number): boolean {
    return this.lineas.some(l => l.producto_id === productoId);
  }

  get productosDisponibles(): Producto[] {
    const q = (this.productoBusqueda || '').trim().toLowerCase();
    return this.productos.filter(p => {
      if (this.productoYaAgregado(p.producto_id)) return false;
      if (!q) return true;
      const desc = ((p.descripcion || '') + ' ' + (p.nombre || '') + ' ' + (p.codigo_interno || '')).toLowerCase();
      return desc.includes(q);
    });
  }

  seleccionarProducto(p: Producto) {
    this.productoSeleccionado = p.producto_id;
    this.productoBusqueda = p.descripcion || p.nombre || p.codigo_interno || '';
    this.mostrarProductosDropdown = false;
    this.productoHighlightIndex = 0;
  }

  onProductoInputFocus() {
    this.mostrarProductosDropdown = true;
    this.productoHighlightIndex = 0;
  }

  onProductoInputBlur() {
    setTimeout(() => (this.mostrarProductosDropdown = false), 150);
  }

  onProductoInputKeydown(event: KeyboardEvent) {
    const list = this.productosDisponibles;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.productoHighlightIndex = Math.min(this.productoHighlightIndex + 1, list.length - 1);
      this.cdr.detectChanges();
      this.scrollProductoHighlightIntoView();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.productoHighlightIndex = Math.max(this.productoHighlightIndex - 1, 0);
      this.cdr.detectChanges();
      this.scrollProductoHighlightIntoView();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const p = list[this.productoHighlightIndex];
      if (p) this.seleccionarProducto(p);
    } else if (event.key === 'Escape') {
      this.mostrarProductosDropdown = false;
      this.cdr.detectChanges();
    }
  }

  onProductoSearchInput() {
    this.productoHighlightIndex = 0;
    if (!this.productoBusqueda.trim()) {
      this.productoSeleccionado = null;
    }
  }

  private scrollProductoHighlightIntoView() {
    setTimeout(() => {
      const el = document.querySelector('.productos-dropdown li.highlighted');
      if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, 0);
  }

  get clientesFiltrados(): { cliente_id: number; nombre: string; cedula_rif: string | null; telefono: string | null }[] {
    const q = (this.cedulaBusqueda || '').trim().toLowerCase();
    if (!q) return this.clientes;
    return this.clientes.filter(c => {
      const cedula = (c.cedula_rif || '').toLowerCase();
      if (cedula.includes(q)) return true;
      const qNucleo = digitosNucleoTelefonoVe(q);
      if (qNucleo.length < 3) return false;
      const telNucleo = digitosNucleoTelefonoVe(c.telefono || '');
      if (!telNucleo) return false;
      return telNucleo.includes(qNucleo) || qNucleo.includes(telNucleo);
    });
  }

  seleccionarCliente(c: { cliente_id: number; nombre: string; cedula_rif: string | null; telefono: string | null }) {
    this.clienteId = c.cliente_id;
    this.clienteSeleccionado = { nombre: c.nombre, cedula_rif: c.cedula_rif, telefono: c.telefono };
    this.cedulaBusqueda = c.cedula_rif || c.telefono || '';
    this.mostrarSugerenciasCliente = false;
    this.clienteHighlightIndex = 0;
  }

  quitarCliente() {
    this.clienteId = null;
    this.clienteSeleccionado = null;
    this.cedulaBusqueda = '';
  }

  onClienteInputFocus() {
    this.mostrarSugerenciasCliente = true;
    this.clienteHighlightIndex = 0;
  }

  onClienteInputBlur() {
    setTimeout(() => (this.mostrarSugerenciasCliente = false), 150);
  }

  onClienteInputKeydown(event: KeyboardEvent) {
    if (!this.mostrarSugerenciasCliente || !this.cedulaBusqueda.trim()) return;
    const list = this.clientesFiltrados;
    const tieneOpcionNuevoCliente = list.length === 0;
    const totalOpciones = tieneOpcionNuevoCliente ? 1 : list.length;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.clienteHighlightIndex = Math.min(this.clienteHighlightIndex + 1, totalOpciones - 1);
      this.cdr.detectChanges();
      this.scrollClienteHighlightIntoView();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.clienteHighlightIndex = Math.max(this.clienteHighlightIndex - 1, 0);
      this.cdr.detectChanges();
      this.scrollClienteHighlightIntoView();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (tieneOpcionNuevoCliente) {
        this.abrirFormNuevoCliente();
      } else {
        const c = list[this.clienteHighlightIndex];
        if (c) this.seleccionarCliente(c);
      }
    } else if (event.key === 'Escape') {
      this.mostrarSugerenciasCliente = false;
      this.cdr.detectChanges();
    }
  }

  onClienteSearchInput() {
    this.clienteHighlightIndex = 0;
    if (!this.cedulaBusqueda.trim()) this.mostrarFormNuevoCliente = false;
  }

  abrirFormNuevoCliente() {
    this.mostrarFormNuevoCliente = true;
    this.mostrarSugerenciasCliente = false;
    this.nuevoClienteNombre = '';
    this.nuevoClienteCedula = '';
    this.nuevoClienteTelefono = '';
    this.nuevoClienteDireccion = '';
    this.nuevoClienteCorreo = '';
  }

  cancelarFormNuevoCliente() {
    this.mostrarFormNuevoCliente = false;
  }

  guardarNuevoCliente() {
    const nombre = (this.nuevoClienteNombre || '').trim();
    if (!nombre) return;
    const cedula = (this.nuevoClienteCedula || '').trim();
    const telefonoNormalizado = telefonoVenParaBaseDatos(this.nuevoClienteTelefono);
    this.guardandoCliente = true;
    this.errorMsg = '';
    this.cdr.detectChanges();
    this.clientesService.create({
      nombre,
      cedula_rif: cedula || undefined,
      telefono: telefonoNormalizado,
      direccion: this.nuevoClienteDireccion.trim() || undefined,
      email: this.nuevoClienteCorreo.trim() || undefined
    }).subscribe({
      next: (res) => {
        const c = res.data;
        this.clientes = [...this.clientes, { cliente_id: c.cliente_id, nombre: c.nombre, cedula_rif: c.cedula_rif, telefono: c.telefono }];
        this.clienteId = c.cliente_id;
        this.clienteSeleccionado = { nombre: c.nombre, cedula_rif: c.cedula_rif, telefono: c.telefono };
        this.cedulaBusqueda = c.cedula_rif || c.telefono || '';
        this.mostrarFormNuevoCliente = false;
        this.mostrarSugerenciasCliente = false;
        this.nuevoClienteNombre = '';
        this.nuevoClienteCedula = '';
        this.nuevoClienteTelefono = '';
        this.nuevoClienteDireccion = '';
        this.nuevoClienteCorreo = '';
        this.guardandoCliente = false;
        this.cdr.detectChanges();
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: (err) => {
        this.guardandoCliente = false;
        this.errorMsg =
          err?.error?.message || err?.message || 'No pudimos registrar el cliente. Intentá de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }

  private scrollClienteHighlightIntoView() {
    setTimeout(() => {
      const items = this.sugerenciaItems?.toArray();
      const el = items?.[this.clienteHighlightIndex]?.nativeElement;
      if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, 0);
  }

  lineaImagenSrc(linea: LineaVenta): string {
    return resolveProductImageUrl(linea.imagen_url);
  }

  getSubtotal(linea: LineaVenta): number {
    return linea.cantidad * linea.precio_unitario;
  }

  onCantidadChange(linea: LineaVenta) {
    setTimeout(() => {
      const stockMax = linea.almacenes[0]?.stock_actual ?? linea.existencia_actual;
      const n = Math.floor(Number(linea.cantidad) || 0);
      const clamped = Math.max(0, Math.min(n, stockMax));
      linea.cantidad = clamped;
      if (linea.almacenes[0]) {
        linea.almacenes[0].cantidad_despachar = clamped;
      }
      this.cdr.detectChanges();
    }, 0);
  }

  getDespachosValidos(linea: LineaVenta): boolean {
    const a = linea.almacenes[0];
    if (!a) return false;
    const desp = a.cantidad_despachar || 0;
    return desp === linea.cantidad && desp <= a.stock_actual;
  }

  get totalVenta(): number {
    return this.lineas.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0);
  }

  guardar() {
    this.errorMsg = '';
    for (const l of this.lineas) {
      if (l.cantidad > 0 && !this.getDespachosValidos(l)) {
        this.errorMsg = `Revisá la cantidad de «${l.descripcion}» en el almacén elegido.`;
        this.cdr.detectChanges();
        return;
      }
    }
    if (this.almacenId == null) {
      this.errorMsg = 'Elegí el almacén desde el cual se despacha la venta.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.clienteId) {
      this.errorMsg = 'El cliente es obligatorio.';
      this.cdr.detectChanges();
      return;
    }
    if (this.lineas.length === 0) {
      this.errorMsg = 'Agrega al menos un producto.';
      this.cdr.detectChanges();
      return;
    }
    const tipoSel = (this.tipoPagoCodigo || '').trim();
    const refBanco = (this.referenciaBanco || '').trim();
    const exigeMetodoLista = this.auth.isVendedor();
    if (exigeMetodoLista) {
      if (!esTipoPagoEnListaScroll(tipoSel)) {
        this.errorMsg =
          'Elegí un método de pago (efectivo, transferencia o pago móvil).';
        this.cdr.detectChanges();
        return;
      }
    }

    const lineasConCantidad = this.lineas.filter(l => l.cantidad > 0);
    if (lineasConCantidad.length === 0) {
      this.errorMsg = 'Agrega al menos un producto con cantidad mayor a 0.';
      this.cdr.detectChanges();
      return;
    }
    const detalles: CreateVentaDetalleDto[] = lineasConCantidad.map(l => ({
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
      despachos: l.almacenes
        .filter(a => (a.cantidad_despachar || 0) > 0)
        .map(a => ({ almacen_id: a.almacen_id, cantidad: a.cantidad_despachar! }))
    }));

    this.saving = true;
    this.cdr.detectChanges();
    this.ventasService.create({
      cliente_id: this.clienteId ?? undefined,
      tipo_pago: tipoSel || undefined,
      referencia_banco: refBanco || undefined,
      detalles,
      confirmar: false
    }).subscribe({
      next: () => this.router.navigate(['/ventas']),
      error: (err) => {
        this.saving = false;
        this.errorMsg =
          err?.error?.message || err?.message || 'No pudimos crear la venta. Intentá de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }

  cancelar() {
    this.router.navigate(['/ventas']);
  }
}
