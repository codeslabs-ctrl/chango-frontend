import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  VentaConDetalles,
  ConfirmarVentaDto
} from '../../core/services/ventas.service';
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
  @Input() submitting = false;
  @Input() submitError = '';

  @Output() closed = new EventEmitter<void>();
  @Output() finalizar = new EventEmitter<ConfirmarVentaDto>();

  readonly opcionesMetodoPago = OPCIONES_METODO_PAGO_LISTA;

  clienteNombre = '';
  clienteCedula = '';
  clienteTelefono = '';
  clienteEmail = '';
  clienteDireccion = '';
  /** Modo facturar: código en lista (efectivo, transaccion, pago movil) */
  tipoPagoCodigo = '';
  /** Referencia (facturar o completar en confirmar) */
  referenciaPago = '';
  /** Solo si falta ref en BD y el tipo la requiere */
  refCompletarConfirmar = '';
  localError = '';

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
  }

  private patchFromData(): void {
    if (!this.data) return;
    const v = this.data.venta;
    this.clienteNombre = v.cliente_nombre ?? '';
    this.clienteCedula = v.cliente_cedula_rif ?? '';
    this.clienteTelefono = v.cliente_telefono ?? '';
    this.clienteEmail = v.cliente_email ?? '';
    this.clienteDireccion = v.cliente_direccion ?? '';
    const rawTipo = v.tipo_pago ?? v.metodo_pago ?? '';
    const norm = normalizarTipoPago(rawTipo);
    if (this.mode === 'facturar') {
      this.tipoPagoCodigo = esTipoPagoEnListaScroll(norm) ? norm : '';
      this.referenciaPago = (v.referencia_banco || v.referencia_pago || '').toString();
    } else {
      this.tipoPagoCodigo = '';
      this.referenciaPago = '';
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
    return etiquetaTipoPago(this.data.venta.tipo_pago ?? this.data.venta.metodo_pago);
  }

  refLeidaDesdeVenta(): string {
    if (!this.data) return '';
    return (this.data.venta.referencia_banco || this.data.venta.referencia_pago || '')
      .toString()
      .trim();
  }

  tipoNormalizadoVenta(): string {
    if (!this.data) return '';
    return normalizarTipoPago(this.data.venta.tipo_pago ?? this.data.venta.metodo_pago);
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
      const tipo = normalizarTipoPago(this.data.venta.tipo_pago ?? this.data.venta.metodo_pago);
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
}
