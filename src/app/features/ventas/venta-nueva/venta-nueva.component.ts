import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  clientes: { cliente_id: number; nombre: string; cedula_rif: string | null }[] = [];
  productos: Producto[] = [];
  productoSeleccionado: number | null = null;
  clienteId: number | null = null;
  clienteSeleccionado: { nombre: string; cedula_rif: string | null } | null = null;
  cedulaBusqueda = '';
  mostrarSugerenciasCliente = false;
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
        this.clientes = data.map(c => ({ cliente_id: c.cliente_id, nombre: c.nombre, cedula_rif: c.cedula_rif }));
        setTimeout(() => this.cdr.detectChanges(), 0);
      }
    });
    this.productosService.getAll().subscribe({
      next: (res) => {
        this.productos = (res.data || []).filter(
          p => (p.estatus || 'A') === 'A' && (p.existencia_actual ?? 0) > 0 && (p.precio_venta_sugerido ?? 0) > 0
        );
        this.loading = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
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

  get clientesFiltradosPorCedula(): { cliente_id: number; nombre: string; cedula_rif: string | null }[] {
    const q = (this.cedulaBusqueda || '').trim().toLowerCase();
    if (!q) return this.clientes;
    return this.clientes.filter(c => {
      const cedula = (c.cedula_rif || '').toLowerCase();
      return cedula.includes(q);
    });
  }

  seleccionarCliente(c: { cliente_id: number; nombre: string; cedula_rif: string | null }) {
    this.clienteId = c.cliente_id;
    this.clienteSeleccionado = { nombre: c.nombre, cedula_rif: c.cedula_rif };
    this.cedulaBusqueda = c.cedula_rif || '';
    this.mostrarSugerenciasCliente = false;
  }

  quitarCliente() {
    this.clienteId = null;
    this.clienteSeleccionado = null;
    this.cedulaBusqueda = '';
  }

  onClienteInputBlur() {
    setTimeout(() => (this.mostrarSugerenciasCliente = false), 150);
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
      const clamped = Math.max(1, Math.min(n, linea.existencia_actual));
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
      if (!this.getDespachosValidos(l)) {
        this.errorMsg = `Despachos inválidos para "${l.descripcion}": la suma debe ser ${l.cantidad} y no puede superar el stock por almacén.`;
        this.cdr.detectChanges();
        return;
      }
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

    const detalles: CreateVentaDetalleDto[] = this.lineas.map(l => ({
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
