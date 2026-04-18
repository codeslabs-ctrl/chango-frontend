import {
  Component,
  ChangeDetectorRef,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  VentaConDetalles,
  ConfirmarVentaDto,
  VentaDetalle
} from '../../core/services/ventas.service';
import { ProductosService } from '../../core/services/productos.service';
import {
  OPCIONES_METODO_PAGO_LISTA,
  normalizarTipoPago,
  etiquetaTipoPago,
  requiereReferenciaTipoPago,
  esTipoPagoEnListaScroll
} from '../../core/tipos-pago';

export type VentaModalMode = 'ver' | 'confirmar' | 'facturar';

@Component({
  selector: 'chango-venta-finalizar-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './venta-finalizar-modal.component.html',
  styleUrl: './venta-finalizar-modal.component.css'
})
export class VentaFinalizarModalComponent implements OnChanges {
  @Input() open = false;
  @Input() loadingData = false;
  @Input() data: VentaConDetalles | null = null;
  @Input() mode: VentaModalMode = 'ver';
  @Input() showPrintAction = false;
  @Input() submitting = false;
  @Input() submitError = '';

  @Output() closed = new EventEmitter<void>();
  @Output() finalizar = new EventEmitter<ConfirmarVentaDto>();
  @Output() imprimir = new EventEmitter<void>();

  readonly opcionesMetodoPago = OPCIONES_METODO_PAGO_LISTA;

  clienteNombre = '';
  clienteCedula = '';
  clienteTelefono = '';
  clienteEmail = '';
  clienteDireccion = '';
  /** Modo facturar: código en lista de métodos de pago */
  tipoPagoCodigo = '';
  /** Referencia (facturar o completar en confirmar) */
  referenciaPago = '';
  /** Solo si falta ref en BD y el tipo la requiere */
  refCompletarConfirmar = '';
  localError = '';
  previewPrecioByDetalleId: Record<number, number> = {};
  previewLoading = false;
  private previewReqSeq = 0;

  constructor(
    private productosService: ProductosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] && this.data) || changes['mode']) {
      if (this.data) this.patchFromData();
    }
    if (changes['data'] && !this.data) {
      this.resetCampos();
    }
    if (changes['open'] && !this.open) {
      this.localError = '';
    }
  }

  private resetCampos(): void {
    this.clienteNombre = '';
    this.clienteCedula = '';
    this.clienteTelefono = '';
    this.clienteEmail = '';
    this.clienteDireccion = '';
    this.tipoPagoCodigo = '';
    this.referenciaPago = '';
    this.refCompletarConfirmar = '';
    this.previewPrecioByDetalleId = {};
    this.previewLoading = false;
  }

  private patchFromData(): void {
    if (!this.data) return;
    const v = this.data.venta;
    this.clienteNombre = v.cliente_nombre ?? '';
    this.clienteCedula = v.cliente_cedula_rif ?? '';
    this.clienteTelefono = v.cliente_telefono ?? '';
    this.clienteEmail = v.cliente_email ?? '';
    this.clienteDireccion = v.cliente_direccion ?? '';
    const rawTipo = v.tipo_pago ?? '';
    const norm = normalizarTipoPago(rawTipo);
    if (this.mode === 'facturar') {
      this.tipoPagoCodigo = esTipoPagoEnListaScroll(norm) ? norm : '';
      this.referenciaPago = (v.referencia_banco || '').toString();
      this.recalcularPreciosVista();
    } else {
      this.tipoPagoCodigo = '';
      this.referenciaPago = '';
      this.previewPrecioByDetalleId = {};
      this.previewLoading = false;
    }
    this.refCompletarConfirmar = '';
    this.localError = '';
  }

  get tituloModal(): string {
    switch (this.mode) {
      case 'facturar':
        return 'Revisar y facturar venta';
      case 'confirmar':
        return 'Revisar y confirmar venta';
      default:
        return this.data ? `Detalle de venta #${this.data.venta.venta_id}` : 'Venta';
    }
  }

  etiquetaMetodoActual(): string {
    if (!this.data) return '-';
    return etiquetaTipoPago(this.data.venta.tipo_pago);
  }

  refLeidaDesdeVenta(): string {
    if (!this.data) return '';
    return (this.data.venta.referencia_banco || '')
      .toString()
      .trim();
  }

  tipoNormalizadoVenta(): string {
    if (!this.data) return '';
    return normalizarTipoPago(this.data.venta.tipo_pago ?? '');
  }

  necesitaReferenciaParaTipo(tipo: string): boolean {
    return requiereReferenciaTipoPago(tipo);
  }

  mostrarCompletarRefConfirmar(): boolean {
    if (this.mode !== 'confirmar' || !this.data) return false;
    const t = this.tipoNormalizadoVenta();
    return this.necesitaReferenciaParaTipo(t) && !this.refLeidaDesdeVenta();
  }

  onCerrar(): void {
    if (this.submitting) return;
    if (this.loadingData) return;
    this.closed.emit();
  }

  onClickOverlay(): void {
    if (this.loadingData) return;
    this.onCerrar();
  }

  onFinalizarClick(): void {
    this.localError = '';
    if (!this.data || this.mode === 'ver') return;

    if (this.mode === 'confirmar') {
      const tipo = normalizarTipoPago(this.data.venta.tipo_pago ?? '');
      if (!esTipoPagoEnListaScroll(tipo)) {
        this.localError =
          'Esta venta no tiene un método de pago válido. Corregilo desde gestión de ventas.';
        return;
      }
      const refEx = this.refLeidaDesdeVenta();
      const ref = (this.refCompletarConfirmar || refEx).trim();
      if (this.necesitaReferenciaParaTipo(tipo) && !ref) {
        this.localError = 'Indicá el número de referencia (transferencia o pago móvil).';
        return;
      }
      this.finalizar.emit({
        tipo_pago: tipo,
        referencia_banco: ref || undefined
      });
      return;
    }

    const tipo = normalizarTipoPago(this.tipoPagoCodigo);
    if (!esTipoPagoEnListaScroll(tipo)) {
      this.localError = 'Elegí un método de pago de la lista.';
      return;
    }
    const ref = (this.referenciaPago || '').trim();
    if (this.necesitaReferenciaParaTipo(tipo) && !ref) {
      this.localError =
        'Indicá el número de referencia para transferencia o pago móvil.';
      return;
    }

    if (!(this.clienteNombre || '').trim()) {
      this.localError = 'El nombre del cliente es obligatorio.';
      return;
    }

    const dto: ConfirmarVentaDto = {
      tipo_pago: tipo,
      referencia_banco: ref || undefined
    };

    if (this.data.venta.cliente_id) {
      dto.cliente = {
        nombre: this.clienteNombre.trim(),
        cedula_rif: (this.clienteCedula || '').trim() || undefined,
        telefono: (this.clienteTelefono || '').trim() || undefined,
        email: (this.clienteEmail || '').trim() || undefined,
        direccion: (this.clienteDireccion || '').trim() || undefined
      };
    }

    this.finalizar.emit(dto);
  }

  onTipoPagoChange(value: string): void {
    this.tipoPagoCodigo = value;
    this.recalcularPreciosVista();
    this.cdr.detectChanges();
  }

  getPrecioUnitarioVista(d: VentaDetalle): number {
    const p = this.previewPrecioByDetalleId[d.detalle_id];
    if (this.mode === 'facturar' && p != null) return p;
    return Number(d.precio_unitario) || 0;
  }

  getSubtotalVista(d: VentaDetalle): number {
    return (Number(d.cantidad) || 0) * this.getPrecioUnitarioVista(d);
  }

  private recalcularPreciosVista(): void {
    if (!this.data || this.mode !== 'facturar') {
      this.previewPrecioByDetalleId = {};
      this.previewLoading = false;
      this.cdr.detectChanges();
      return;
    }
    const tipo = normalizarTipoPago(this.tipoPagoCodigo);
    if (!esTipoPagoEnListaScroll(tipo)) {
      this.previewPrecioByDetalleId = {};
      this.previewLoading = false;
      this.cdr.detectChanges();
      return;
    }
    const reqSeq = ++this.previewReqSeq;
    this.previewLoading = true;
    this.cdr.detectChanges();
    const requests = this.data.detalles.map((d) =>
      this.productosService.getById(d.producto_id).pipe(
        map((res) => {
          const p = res.data;
          const pm = (p?.precios_metodo || []).find(
            (x) => normalizarTipoPago(x.tipo_pago) === tipo
          );
          const precio = Number(pm?.precio ?? p?.precio_venta_sugerido ?? d.precio_unitario) || 0;
          return { detalle_id: d.detalle_id, precio: Math.max(0, precio) };
        }),
        catchError(() => of({ detalle_id: d.detalle_id, precio: Number(d.precio_unitario) || 0 }))
      )
    );
    forkJoin(requests).subscribe((rows) => {
      if (reqSeq !== this.previewReqSeq) return;
      const next: Record<number, number> = {};
      rows.forEach((r) => {
        next[r.detalle_id] = r.precio;
      });
      this.previewPrecioByDetalleId = next;
      this.previewLoading = false;
      this.cdr.detectChanges();
    });
  }

  onImprimirClick(): void {
    if (this.submitting || this.loadingData) return;
    this.imprimir.emit();
  }
}
