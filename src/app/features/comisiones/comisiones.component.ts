import { Component, OnInit, ChangeDetectorRef, NgZone, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  ComisionesService,
  ResumenComisionVendedor,
  VentaComisionRow
} from '../../core/services/comisiones.service';

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

type DetalleComisionesVendedor = {
  status: 'loading' | 'ok' | 'err';
  pendientes: VentaComisionRow[];
  pagadas: VentaComisionRow[];
};

@Component({
  selector: 'chango-comisiones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './comisiones.component.html',
  styleUrl: './comisiones.component.css'
})
export class ComisionesComponent implements OnInit {
  resumen: ResumenComisionVendedor[] = [];
  loading = true;
  errorMsg = '';

  /** Detalle por vendedor: se pide al cargar el resumen (sin pulsar nada). */
  detallePorVendedor: Record<number, DetalleComisionesVendedor> = {};

  hastaFecha: Record<number, string> = {};
  marcando: Record<number, boolean> = {};
  feedback: Record<number, string> = {};

  pendientesSeleccionados: Record<number, number[]> = {};
  marcarEnCurso: Record<number, 'seleccion' | 'todas' | 'fecha' | null> = {};

  private detalleGen = 0;

  constructor(
    private comisiones: ComisionesService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private appRef: ApplicationRef
  ) {}

  ngOnInit() {
    this.cargarResumen();
  }

  num = num;

  nombreVendedor(r: ResumenComisionVendedor): string {
    const n = r.nombre_usuario?.trim();
    return n || r.username;
  }

  /** Hay filas FACTURADAS con comisión (pendientes o ya pagadas). */
  vendedorTieneDetalle(r: ResumenComisionVendedor): boolean {
    return r.ventas_pendientes > 0 || r.ventas_pagadas > 0;
  }

  pendientesRows(vendedorId: number): VentaComisionRow[] {
    const d = this.detallePorVendedor[vendedorId];
    return d?.status === 'ok' ? d.pendientes : [];
  }

  pagadasRows(vendedorId: number): VentaComisionRow[] {
    const d = this.detallePorVendedor[vendedorId];
    return d?.status === 'ok' ? d.pagadas : [];
  }

  countSeleccionados(vendedorId: number): number {
    return (this.pendientesSeleccionados[vendedorId] ?? []).length;
  }

  isVentaSeleccionada(vendedorId: number, ventaId: number): boolean {
    return (this.pendientesSeleccionados[vendedorId] ?? []).includes(ventaId);
  }

  onToggleVentaSeleccion(vendedorId: number, ventaId: number, checked: boolean) {
    const cur = new Set(this.pendientesSeleccionados[vendedorId] ?? []);
    if (checked) cur.add(ventaId);
    else cur.delete(ventaId);
    const next = [...cur];
    if (next.length === 0) delete this.pendientesSeleccionados[vendedorId];
    else this.pendientesSeleccionados[vendedorId] = next;
    this.refrescarVista();
  }

  allPendientesEnTablaSeleccionados(vendedorId: number): boolean {
    const pend = this.pendientesRows(vendedorId);
    if (pend.length === 0) return false;
    const set = new Set(this.pendientesSeleccionados[vendedorId] ?? []);
    return pend.every((v) => set.has(v.venta_id));
  }

  onToggleSeleccionarTodasPendientesEnTabla(vendedorId: number, checked: boolean) {
    const pend = this.pendientesRows(vendedorId);
    if (!checked || pend.length === 0) {
      delete this.pendientesSeleccionados[vendedorId];
    } else {
      this.pendientesSeleccionados[vendedorId] = pend.map((v) => v.venta_id);
    }
    this.refrescarVista();
  }

  private limpiarSeleccion(vendedorId: number) {
    delete this.pendientesSeleccionados[vendedorId];
  }

  /** Asegura que la vista refleje datos async (p. ej. Angular 21 + HttpClient). */
  private refrescarVista() {
    this.ngZone.run(() => {
      this.cdr.detectChanges();
      try {
        this.appRef.tick();
      } catch {
        /* noop */
      }
    });
  }

  cargarResumen() {
    this.loading = true;
    this.errorMsg = '';
    this.comisiones.getResumen().subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          const gen = ++this.detalleGen;
          this.resumen = res.data ?? [];
          this.detallePorVendedor = {};
          this.pendientesSeleccionados = {};
          this.loading = false;

          for (const r of this.resumen) {
            if (!this.vendedorTieneDetalle(r)) continue;
            const uid = r.usuario_id;
            this.detallePorVendedor[uid] = { status: 'loading', pendientes: [], pagadas: [] };
            this.comisiones.getVentasVendedor(uid, {}).subscribe({
              next: (x) => {
                if (gen !== this.detalleGen) return;
                this.ngZone.run(() => {
                  const rows = x.data ?? [];
                  this.detallePorVendedor[uid] = {
                    status: 'ok',
                    pendientes: rows.filter((v) => !v.comision_pagada),
                    pagadas: rows.filter((v) => v.comision_pagada)
                  };
                  this.refrescarVista();
                });
              },
              error: () => {
                if (gen !== this.detalleGen) return;
                this.ngZone.run(() => {
                  this.detallePorVendedor[uid] = { status: 'err', pendientes: [], pagadas: [] };
                  this.refrescarVista();
                });
              }
            });
          }
          this.refrescarVista();
        });
      },
      error: (err: HttpErrorResponse) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.errorMsg =
            typeof err.error?.message === 'string'
              ? err.error.message
              : 'No se pudo cargar el resumen de comisiones.';
          this.refrescarVista();
        });
      }
    });
  }

  marcarTodasPendientes(r: ResumenComisionVendedor) {
    this.marcar(r.usuario_id, {}, 'todas');
  }

  marcarHastaFecha(r: ResumenComisionVendedor) {
    const f = this.hastaFecha[r.usuario_id]?.trim();
    if (!f) {
      this.feedback[r.usuario_id] = 'Seleccione una fecha límite (AAAA-MM-DD).';
      this.refrescarVista();
      return;
    }
    this.marcar(r.usuario_id, { hasta_fecha: f }, 'fecha');
  }

  marcarSoloSeleccionadas(r: ResumenComisionVendedor) {
    const ids = this.pendientesSeleccionados[r.usuario_id] ?? [];
    if (ids.length === 0) {
      this.feedback[r.usuario_id] =
        'Marque con la casilla las ventas cuya comisión ya pagó; luego use «Marcar solo las seleccionadas».';
      this.refrescarVista();
      return;
    }
    this.marcar(r.usuario_id, { venta_ids: ids }, 'seleccion');
  }

  private marcar(
    vendedorId: number,
    body: { hasta_fecha?: string; venta_ids?: number[] },
    modo: 'seleccion' | 'todas' | 'fecha'
  ) {
    this.marcando[vendedorId] = true;
    this.marcarEnCurso[vendedorId] = modo;
    this.feedback[vendedorId] = '';
    this.comisiones
      .marcarPagadas({ vendedor_id: vendedorId, ...body })
      .pipe(
        finalize(() => {
          this.ngZone.run(() => {
            this.marcando[vendedorId] = false;
            this.marcarEnCurso[vendedorId] = null;
            this.refrescarVista();
          });
        })
      )
      .subscribe({
        next: (res) => {
          this.ngZone.run(() => {
            this.feedback[vendedorId] = res.message ?? '';
            this.limpiarSeleccion(vendedorId);
            this.cargarResumen();
            this.refrescarVista();
          });
        },
        error: (err: HttpErrorResponse) => {
          const msg = err.error?.message;
          this.feedback[vendedorId] =
            typeof msg === 'string' ? msg : 'No se pudo actualizar. Inténtelo de nuevo.';
          this.refrescarVista();
        }
      });
  }
}
