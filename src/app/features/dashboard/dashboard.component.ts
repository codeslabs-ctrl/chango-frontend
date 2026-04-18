import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  VentasService,
  Venta,
  VentaConDetalles,
  ConfirmarVentaDto
} from '../../core/services/ventas.service';
import {
  VentaFinalizarModalComponent,
  VentaModalMode
} from '../../shared/venta-finalizar-modal/venta-finalizar-modal.component';
import {
  EstadisticasService,
  StockCriticoItem,
  TazaDiaResumen
} from '../../core/services/estadisticas.service';
import { VentaProductosCarouselComponent } from '../../shared/venta-productos-carousel/venta-productos-carousel.component';
import { AuthService } from '../../core/services/auth.service';

/** Solo estos estatus listan en el dashboard (nunca confirmadas ni anuladas). */
const ESTATUS_VENTA_PENDIENTE_DASHBOARD = new Set(['PENDIENTE', 'POR FACTURAR']);

@Component({
  selector: 'chango-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VentaFinalizarModalComponent, VentaProductosCarouselComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly storageKeyVentasPorImprimir = 'dashboard_ventas_por_imprimir_ids_v1';
  ventasPendientes: Venta[] = [];
  ventasParaImprimir: VentaConDetalles[] = [];
  comparativaMensual: { monto_actual?: number; monto_anterior?: number; variacion_porcentaje?: number }[] = [];
  stockCritico: StockCriticoItem[] = [];
  tazaDia: TazaDiaResumen = {
    tasa_google: null,
    taza_manual: null,
    fuente_google: 'https://www.google.com/finance/quote/USD-VES'
  };
  tazaManualInput: number | null = null;
  tazaDiaSaving = false;
  tazaDiaError = '';

  loadingVentas = false;
  loadingStats = { comparativa: true, stock: true, taza: true };
  confirmando: number | null = null;
  eliminando: number | null = null;
  modalVenta: VentaConDetalles | null = null;
  modalLoading = false;
  modalMode: VentaModalMode = 'confirmar';
  modalSubmitError = '';
  modalShowPrintAction = false;
  ventaListaParaImprimirEnModalId: number | null = null;
  imprimiendoVentaId: number | null = null;

  filterVentas = '';
  /** Pestaña: pendientes con vendedor asignado vs ventas del agente (sin usuario_id). */
  ventasDashboardTab: 'vendedor' | 'agente' = 'vendedor';
  ventasPageSize = 10;
  ventasCurrentPage = 1;

  ventasSortCol: string | null = null;
  ventasSortDir: 'asc' | 'desc' = 'desc';

  constructor(
    private ventasService: VentasService,
    private estadisticasService: EstadisticasService,
    private cdr: ChangeDetectorRef,
    protected auth: AuthService
  ) {}

  ngOnInit() {
    this.loadVentas();
    this.loadStats();
    this.cargarVentasPendientesImpresionGuardadas();
  }

  loadStats() {
    this.estadisticasService.getComparativaMensual().subscribe({
      next: (res) => {
        this.comparativaMensual = res.data || [];
        this.loadingStats.comparativa = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.comparativaMensual = [];
        this.loadingStats.comparativa = false;
        this.cdr.detectChanges();
      }
    });

    this.estadisticasService.getStockCritico().subscribe({
      next: (res) => {
        this.stockCritico = res.data || [];
        this.loadingStats.stock = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.stockCritico = [];
        this.loadingStats.stock = false;
        this.cdr.detectChanges();
      }
    });

    this.estadisticasService.getTazaDia().subscribe({
      next: (res) => {
        this.tazaDia = res.data || this.tazaDia;
        this.tazaManualInput = this.tazaDia.taza_manual;
        this.loadingStats.taza = false;
        this.tazaDiaError = '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingStats.taza = false;
        this.tazaDiaError = 'No se pudo cargar la taza del día.';
        this.cdr.detectChanges();
      }
    });
  }

  get kpiVentasPendientes(): number {
    return this.ventasPendientes.length;
  }

  get kpiMontoActual(): number {
    return Number(this.comparativaMensual[0]?.monto_actual) || 0;
  }

  get kpiStockCritico(): number {
    return this.stockCritico.length;
  }

  guardarTazaDiaManual() {
    const valor = Number(this.tazaManualInput);
    if (!Number.isFinite(valor) || valor <= 0) {
      this.tazaDiaError = 'Ingresá una taza del día válida.';
      this.cdr.detectChanges();
      return;
    }
    this.tazaDiaSaving = true;
    this.tazaDiaError = '';
    this.cdr.detectChanges();
    this.estadisticasService.saveTazaDiaManual(valor).subscribe({
      next: (res) => {
        this.tazaDia = res.data || this.tazaDia;
        this.tazaManualInput = this.tazaDia.taza_manual;
        this.tazaDiaSaving = false;
        this.cdr.detectChanges();
      },
      error: (err: { error?: { message?: string } }) => {
        this.tazaDiaSaving = false;
        this.tazaDiaError = err?.error?.message || 'No se pudo guardar la taza del día.';
        this.cdr.detectChanges();
      }
    });
  }

  get ventasFiltradas(): Venta[] {
    const q = this.filterVentas.trim().toLowerCase();
    let list = this.ventasPendientes;
    if (q) {
      list = list.filter(v =>
        (v.cliente_nombre || '').toLowerCase().includes(q) ||
        (v.cliente_telefono || '').toLowerCase().includes(q) ||
        (v.productos_nombres || '').toLowerCase().includes(q)
      );
    }
    return this.sortVentas(list);
  }

  private sortVentas(list: Venta[]): Venta[] {
    if (!this.ventasSortCol) return list;
    const col = this.ventasSortCol;
    const dir = this.ventasSortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      let va: string | number = (a as unknown as Record<string, unknown>)[col] as string | number;
      let vb: string | number = (b as unknown as Record<string, unknown>)[col] as string | number;
      if (col === 'total_venta' || col === 'fecha_venta') {
        va = col === 'total_venta' ? Number(va) : new Date(va as string).getTime();
        vb = col === 'total_venta' ? Number(vb) : new Date(vb as string).getTime();
      } else {
        va = String(va ?? '').toLowerCase();
        vb = String(vb ?? '').toLowerCase();
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return cmp * dir;
    });
  }

  sortVentasBy(col: string) {
    if (this.ventasSortCol === col) {
      this.ventasSortDir = this.ventasSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.ventasSortCol = col;
      this.ventasSortDir = col === 'fecha_venta' || col === 'total_venta' ? 'desc' : 'asc';
    }
    this.ventasCurrentPage = 1;
    this.cdr.detectChanges();
  }

  onVentasSortPick(value: string) {
    const v = (value || '').trim();
    if (!v) {
      this.ventasSortCol = null;
      this.ventasSortDir = 'desc';
    } else {
      this.ventasSortCol = v;
      this.ventasSortDir = v === 'fecha_venta' || v === 'total_venta' ? 'desc' : 'asc';
    }
    this.ventasCurrentPage = 1;
    this.cdr.detectChanges();
  }

  get ventasPaginadas(): Venta[] {
    const start = (this.ventasCurrentPage - 1) * this.ventasPageSize;
    return this.ventasFiltradas.slice(start, start + this.ventasPageSize);
  }

  get ventasTotalPages(): number {
    return Math.max(1, Math.ceil(this.ventasFiltradas.length / this.ventasPageSize));
  }

  sortIcon(col: string, currentCol: string | null, dir: 'asc' | 'desc'): string {
    if (currentCol !== col) return '';
    return dir === 'asc' ? ' ▲' : ' ▼';
  }

  onVentasDashboardTabChange(tab: 'vendedor' | 'agente') {
    this.ventasDashboardTab = tab;
    this.ventasCurrentPage = 1;
    this.loadVentas();
  }

  loadVentas() {
    this.loadingVentas = true;
    this.ventasService.getAll({ pendientesTipo: this.ventasDashboardTab }).subscribe({
      next: (res) => {
        const raw = res.data || [];
        this.ventasPendientes = raw.filter(v =>
          ESTATUS_VENTA_PENDIENTE_DASHBOARD.has(String(v.estatus || '').trim())
        );
        this.loadingVentas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingVentas = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirFinalizar(v: Venta) {
    this.modalSubmitError = '';
    this.modalMode = v.usuario_id != null ? 'confirmar' : 'facturar';
    this.cargarModalVenta(v.venta_id);
  }

  private cargarModalVenta(ventaId: number) {
    this.modalVenta = null;
    this.modalLoading = true;
    this.cdr.detectChanges();
    this.ventasService.getById(ventaId).subscribe({
      next: (res) => {
        this.modalVenta = res.data || null;
        this.modalLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.modalLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  eliminar(ventaId: number) {
    if (!confirm('¿Anular esta venta?')) return;
    this.eliminando = ventaId;
    this.cdr.detectChanges();
    this.ventasService.eliminar(ventaId).subscribe({
      next: () => {
        this.eliminando = null;
        this.ventasPendientes = this.ventasPendientes.filter(v => v.venta_id !== ventaId);
        this.cdr.detectChanges();
      },
      error: () => {
        this.eliminando = null;
        this.cdr.detectChanges();
      }
    });
  }

  onModalFinalizar(dto: ConfirmarVentaDto) {
    if (!this.modalVenta) return;
    const id = this.modalVenta.venta.venta_id;
    this.modalSubmitError = '';
    this.confirmando = id;
    this.cdr.detectChanges();
    this.ventasService.confirmar(id, dto).subscribe({
      next: (res) => {
        const confirmada = res.data || null;
        this.ventasPendientes = this.ventasPendientes.filter(v => v.venta_id !== id);
        if (confirmada) {
          this.agregarVentaParaImprimir(confirmada);
          this.modalVenta = confirmada;
          this.modalMode = 'ver';
          this.modalShowPrintAction = true;
          this.ventaListaParaImprimirEnModalId = confirmada.venta.venta_id;
        }
        this.confirmando = null;
        this.cdr.detectChanges();
      },
      error: (err: { error?: { message?: string } }) => {
        this.confirmando = null;
        this.modalSubmitError =
          err.error?.message || 'No se pudo finalizar la venta.';
        this.cdr.detectChanges();
      }
    });
  }

  cerrarModal() {
    this.modalVenta = null;
    this.modalLoading = false;
    this.modalSubmitError = '';
    this.modalShowPrintAction = false;
    this.ventaListaParaImprimirEnModalId = null;
    this.cdr.detectChanges();
  }

  etiquetaBotonAccion(): string {
    return 'Facturar';
  }

  private agregarVentaParaImprimir(data: VentaConDetalles): void {
    this.ventasParaImprimir = [
      data,
      ...this.ventasParaImprimir.filter(v => v.venta.venta_id !== data.venta.venta_id)
    ];
    this.persistirVentasPendientesImpresion();
    this.cdr.detectChanges();
  }

  private leerIdsVentasPendientesImpresion(): number[] {
    try {
      const raw = localStorage.getItem(this.storageKeyVentasPorImprimir);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0);
    } catch {
      return [];
    }
  }

  private persistirVentasPendientesImpresion(): void {
    try {
      const ids = this.ventasParaImprimir.map(v => v.venta.venta_id);
      localStorage.setItem(this.storageKeyVentasPorImprimir, JSON.stringify(ids));
    } catch {
      // Sin persistencia si el navegador bloquea storage.
    }
  }

  private cargarVentasPendientesImpresionGuardadas(): void {
    const ids = this.leerIdsVentasPendientesImpresion();
    if (!ids.length) return;
    ids.forEach((id) => {
      this.ventasService.getById(id).subscribe({
        next: (res) => {
          const data = res.data || null;
          if (!data || data.venta.estatus !== 'FACTURADA') {
            this.ventasParaImprimir = this.ventasParaImprimir.filter(v => v.venta.venta_id !== id);
            this.persistirVentasPendientesImpresion();
            this.cdr.detectChanges();
            return;
          }
          this.agregarVentaParaImprimir(data);
        },
        error: () => {
          this.ventasParaImprimir = this.ventasParaImprimir.filter(v => v.venta.venta_id !== id);
          this.persistirVentasPendientesImpresion();
          this.cdr.detectChanges();
        }
      });
    });
  }

  private tasaDelDiaActiva(): number {
    const manual = Number(this.tazaDia.taza_manual);
    if (Number.isFinite(manual) && manual > 0) return manual;
    const google = Number(this.tazaDia.tasa_google);
    if (Number.isFinite(google) && google > 0) return google;
    return 1;
  }

  private formatVes(n: number): string {
    return (Number(n) || 0).toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  private formatCantidad(n: number): string {
    return (Number(n) || 0).toLocaleString('es-VE', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });
  }

  private toYmdCaracas(fechaIso: string): string {
    const d = new Date(fechaIso);
    return new Intl.DateTimeFormat('es-VE', {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    }).format(d);
  }

  imprimirVenta(ventaId: number): void {
    const data = this.ventasParaImprimir.find(v => v.venta.venta_id === ventaId);
    if (!data) return;
    this.imprimiendoVentaId = ventaId;
    this.cdr.detectChanges();
    try {
      const tasa = this.tasaDelDiaActiva();
      const v = data.venta;
      const detallesHtml = (data.detalles || [])
        .map((d) => {
          const subtotalVes = (Number(d.cantidad) || 0) * (Number(d.precio_unitario) || 0) * tasa;
          return `
            <tr>
              <td class="desc">${(d.producto_descripcion || String(d.producto_id)).toUpperCase()}</td>
              <td class="qty">${this.formatCantidad(Number(d.cantidad) || 0)}</td>
              <td class="tot">${this.formatVes(subtotalVes)}</td>
            </tr>
          `;
        })
        .join('');
      const totalVes = (Number(v.total_venta) || 0) * tasa;
      const metodo = (v.tipo_pago || 'OTRO').toUpperCase();
      const presupuesto = String(v.venta_id).padStart(6, '0');
      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Factura ${presupuesto}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    body { font-family: Arial, sans-serif; width: 76mm; margin: 0 auto; color: #000; font-size: 11px; }
    .c { text-align: center; }
    .h { font-weight: 700; }
    .sep { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 2px 0; vertical-align: top; }
    th { font-weight: 700; border-bottom: 1px dashed #000; }
    td.qty, th.qty { text-align: right; width: 20%; }
    td.tot, th.tot { text-align: right; width: 30%; }
    td.desc, th.desc { width: 50%; }
    .line { display:flex; justify-content:space-between; gap:8px; }
    .mt { margin-top: 4px; }
  </style>
</head>
<body>
  <div class="c h">SANTA BARBARA CHANGO F6, C.A.</div>
  <div class="c">RIF 400865468</div>
  <div class="sep"></div>
  <div class="line"><span>Presupuesto:</span><span>${presupuesto}</span></div>
  <div class="line"><span>CARACAS, ${this.toYmdCaracas(v.fecha_venta)}</span></div>
  <div class="line mt"><span>Cliente:</span><span>${(v.cliente_nombre || 'CONSUMIDOR FINAL').toUpperCase()}</span></div>
  <div class="sep"></div>
  <table>
    <thead>
      <tr><th class="desc">Descripcion</th><th class="qty">Cant.</th><th class="tot">Total</th></tr>
    </thead>
    <tbody>${detallesHtml}</tbody>
  </table>
  <div class="sep"></div>
  <div class="line h"><span>TOTAL</span><span>${this.formatVes(totalVes)}</span></div>
  <div class="line"><span>A pagar</span><span>${this.formatVes(totalVes)}</span></div>
  <div class="line"><span>${metodo}</span><span>${this.formatVes(totalVes)}</span></div>
</body>
</html>`;
      const w = window.open('', '_blank', 'width=420,height=760');
      if (!w) throw new Error('No se pudo abrir la ventana de impresión.');
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
      this.ventasParaImprimir = this.ventasParaImprimir.filter(x => x.venta.venta_id !== ventaId);
      this.persistirVentasPendientesImpresion();
      if (this.ventaListaParaImprimirEnModalId === ventaId) {
        this.cerrarModal();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo imprimir la factura.';
      alert(message);
    } finally {
      this.imprimiendoVentaId = null;
      this.cdr.detectChanges();
    }
  }

  onModalImprimir() {
    if (!this.ventaListaParaImprimirEnModalId) return;
    this.imprimirVenta(this.ventaListaParaImprimirEnModalId);
  }

  /** Cantidad total de productos vendidos en la venta. */
  lineasVenta(v: Venta): number {
    const n = v.cantidad_productos;
    if (n != null && n >= 0) return n;
    const s = v.productos_nombres?.trim();
    if (!s) return 0;
    return s.split(',').filter(x => x.trim().length > 0).length;
  }

}
