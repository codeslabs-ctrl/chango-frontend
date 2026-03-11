import { Component, OnInit, ChangeDetectorRef, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { VentasService, CreateVentaDetalleDto, DespachoAlmacenDto } from '../../../core/services/ventas.service';
import { ProductosService, Producto } from '../../../core/services/productos.service';
import { ClientesService, Cliente } from '../../../core/services/clientes.service';

interface ProductoAlmacen {
  almacen_id: number;
  almacen_nombre: string;
  stock_actual: number;
}

interface ProductoConAlmacenes extends Producto {
  almacenes?: ProductoAlmacen[];
}

interface LineaVenta {
  producto_id: number;
  descripcion: string;
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
  metodoPago = '';
  lineas: LineaVenta[] = [];
  lineaExpandida: number | null = null;
  confirmarVenta = true;

  constructor(
    private router: Router,
    private ventasService: VentasService,
    private productosService: ProductosService,
    private clientesService: ClientesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.clientesService.getAll().subscribe({
      next: (res) => {
        const data = (res.data || []) as Cliente[];
        this.clientes = data.map(c => ({ cliente_id: c.cliente_id, nombre: c.nombre, cedula_rif: c.cedula_rif, telefono: c.telefono }));
        this.cdr.detectChanges();
      }
    });
    this.productosService.getAll().subscribe({
      next: (res) => {
        this.productos = (res.data || []).filter(
          p => (p.estatus || 'A') === 'A' && (p.existencia_actual ?? 0) > 0 && (p.precio_venta_sugerido ?? 0) > 0
        );
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  agregarProducto() {
    this.errorMsg = '';
    if (!this.productoSeleccionado) return;
    const p = this.productos.find(x => x.producto_id === this.productoSeleccionado);
    if (!p || this.lineas.some(l => l.producto_id === p.producto_id)) return;

    this.productosService.getById(p.producto_id).subscribe({
      next: (res) => {
        const data = res.data as ProductoConAlmacenes;
        const almacenesRaw = data.almacenes || [];
        if (almacenesRaw.length === 0) {
          this.errorMsg = `El producto "${p.descripcion}" no tiene stock en ningún almacén.`;
          this.cdr.detectChanges();
          return;
        }
        const almacenes = almacenesRaw.map(a => ({
          almacen_id: a.almacen_id,
          almacen_nombre: a.almacen_nombre,
          stock_actual: a.stock_actual ?? 0,
          cantidad_despachar: 0
        }));
        this.lineas = [
          ...this.lineas,
          {
            producto_id: p.producto_id,
            descripcion: p.descripcion,
            existencia_actual: p.existencia_actual ?? 0,
            precio_unitario: p.precio_venta_sugerido ?? 0,
            cantidad: 1,
            almacenes
          }
        ];
        this.lineaExpandida = p.producto_id;
        this.productoSeleccionado = null;
        this.productoBusqueda = '';
        this.cdr.detectChanges();
      }
    });
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
      const telefono = (c.telefono || '').replace(/\D/g, '');
      const qDigits = q.replace(/\D/g, '');
      return cedula.includes(q) || (qDigits.length >= 4 && telefono.includes(qDigits));
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
    const telefono = (this.nuevoClienteTelefono || '').trim();
    this.guardandoCliente = true;
    this.errorMsg = '';
    this.cdr.detectChanges();
    this.clientesService.create({
      nombre,
      cedula_rif: cedula || undefined,
      telefono: telefono || undefined,
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
        this.errorMsg = err?.error?.message || err?.message || 'Error al registrar el cliente';
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

  toggleDespacho(productoId: number) {
    this.lineaExpandida = this.lineaExpandida === productoId ? null : productoId;
  }

  getSubtotal(linea: LineaVenta): number {
    return linea.cantidad * linea.precio_unitario;
  }

  onCantidadChange(linea: LineaVenta) {
    setTimeout(() => {
      const n = Math.floor(Number(linea.cantidad) || 0);
      const clamped = Math.max(0, Math.min(n, linea.existencia_actual));
      linea.cantidad = clamped;
      this.cdr.detectChanges();
    }, 0);
  }

  onDespachoChange(linea: LineaVenta, a: { almacen_id: number; stock_actual: number; cantidad_despachar: number }) {
    const n = Math.floor(Number(a.cantidad_despachar) || 0);
    a.cantidad_despachar = Math.max(0, Math.min(n, a.stock_actual));
    this.cdr.detectChanges();
  }

  getSumaDespachos(linea: LineaVenta): number {
    return linea.almacenes.reduce((s, a) => s + (a.cantidad_despachar || 0), 0);
  }

  getDespachosValidos(linea: LineaVenta): boolean {
    const suma = this.getSumaDespachos(linea);
    if (suma !== linea.cantidad) return false;
    return linea.almacenes.every(a => (a.cantidad_despachar || 0) <= a.stock_actual);
  }

  get totalVenta(): number {
    return this.lineas.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0);
  }

  guardar() {
    this.errorMsg = '';
    for (const l of this.lineas) {
      if (l.cantidad > 0 && !this.getDespachosValidos(l)) {
        this.errorMsg = `Despachos inválidos para "${l.descripcion}": la suma debe ser ${l.cantidad} y no puede superar el stock por almacén.`;
        this.cdr.detectChanges();
        return;
      }
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
    if (this.confirmarVenta && !(this.metodoPago || '').trim()) {
      this.errorMsg = 'El método de pago es obligatorio al confirmar la venta.';
      this.cdr.detectChanges();
      return;
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
      metodo_pago: this.metodoPago || undefined,
      detalles,
      confirmar: this.confirmarVenta
    }).subscribe({
      next: () => this.router.navigate(['/ventas']),
      error: (err) => {
        this.saving = false;
        this.errorMsg = err?.error?.message || err?.message || 'Error al crear la venta';
        this.cdr.detectChanges();
      }
    });
  }

  cancelar() {
    this.router.navigate(['/ventas']);
  }
}
