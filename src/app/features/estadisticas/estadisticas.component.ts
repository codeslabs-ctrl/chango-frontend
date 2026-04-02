import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import {
  EstadisticasService,
  StockCriticoItem
} from '../../core/services/estadisticas.service';

function fechaLocalHoyYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fechaInicioMesYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function fechaFinMesYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = d.getMonth();
  const last = new Date(y, mo + 1, 0).getDate();
  return `${y}-${String(mo + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

@Component({
  selector: 'chango-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BaseChartDirective],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.css'
})
export class EstadisticasComponent implements OnInit {
  fechaDesde = '';
  fechaHasta = '';

  resumenVendedores: {
    usuario_id: number | null;
    nombre_usuario?: string | null;
    unidades_vendidas?: string | number;
    ingresos_totales?: string | number;
  }[] = [];

  topProductos: {
    producto_id: number;
    nombre?: string | null;
    unidades_vendidas?: string | number;
  }[] = [];

  stockCritico: StockCriticoItem[] = [];

  /** Error al cargar resumen por vendedor (p. ej. API caída). */
  errorResumen: string | null = null;

  loading = { resumen: true, top: true, stock: true };

  vendedoresChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Ingresos',
        data: [],
        backgroundColor: '#D22027',
        borderRadius: 4
      }
    ]
  };
  vendedoresChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 8, left: 8 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ` ${(ctx.parsed.x ?? 0).toLocaleString('es', { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: { beginAtZero: true },
      y: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } }
    }
  };

  topProductosChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Unidades vendidas',
        data: [],
        backgroundColor: '#D22027',
        borderRadius: 4
      }
    ]
  };
  topProductosChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 8, left: 8 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.x ?? 0} uds.`
        }
      }
    },
    scales: {
      x: { beginAtZero: true },
      y: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 10 } }
    }
  };

  constructor(
    private estadisticasService: EstadisticasService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.fechaDesde = fechaInicioMesYMD();
    this.fechaHasta = fechaFinMesYMD();
    this.cargarStock();
    this.cargarTopProductos();
    this.cargarResumenVendedores();

    this.route.fragment.subscribe((frag) => {
      if (frag !== 'stock-critico') return;
      const scrollTo = () =>
        document.getElementById('stock-critico')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      requestAnimationFrame(scrollTo);
      setTimeout(scrollTo, 120);
    });
  }

  etiquetaVendedor(row: { usuario_id: number | null; nombre_usuario?: string | null }): string {
    if (row.usuario_id == null) return 'Agente';
    const n = (row.nombre_usuario || '').trim();
    if (n) return n;
    return `Vendedor #${row.usuario_id}`;
  }

  totalUnidadesResumen(): number {
    return this.resumenVendedores.reduce((s, r) => s + (Number(r.unidades_vendidas) || 0), 0);
  }

  totalIngresosResumen(): number {
    return this.resumenVendedores.reduce((s, r) => s + (Number(r.ingresos_totales) || 0), 0);
  }

  setRangoHoy() {
    const hoy = fechaLocalHoyYMD();
    this.fechaDesde = hoy;
    this.fechaHasta = hoy;
    this.cargarResumenVendedores();
  }

  aplicarFiltroResumen() {
    let desde = this.fechaDesde;
    let hasta = this.fechaHasta;
    if (desde && hasta && desde > hasta) {
      const t = desde;
      desde = hasta;
      hasta = t;
      this.fechaDesde = desde;
      this.fechaHasta = hasta;
    }
    this.cargarResumenVendedores();
  }

  private cargarResumenVendedores() {
    const desde = this.fechaDesde || undefined;
    const hasta = this.fechaHasta || undefined;
    this.loading.resumen = true;
    this.errorResumen = null;
    this.cdr.detectChanges();

    this.estadisticasService.getResumenPorVendedor(desde, hasta).subscribe({
      next: (res) => {
        this.resumenVendedores = res.data || [];
        this.errorResumen = null;
        this.loading.resumen = false;
        this.updateVendedoresChart();
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        this.resumenVendedores = [];
        this.loading.resumen = false;
        this.errorResumen = this.mensajeErrorResumen(err);
        this.updateVendedoresChart();
        this.cdr.detectChanges();
      }
    });
  }

  private mensajeErrorResumen(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'No se pudo conectar con el servidor (comprobá que el backend esté en marcha y que la URL de la API en environment sea correcta, p. ej. puerto 3005).';
      }
      if (err.status === 404) {
        return 'El servidor respondió 404: esa ruta no existe en el API desplegado. En el VPS suele pasar si el backend no está actualizado: subí la última versión de chango-backend, ejecutá `npm run build` y reiniciá el proceso (pm2, systemd, Docker, etc.). Verificá también que nginx (o el proxy) reenvíe `/api` al Node.';
      }
      const msg = (err.error as { message?: string } | null)?.message;
      if (msg) return msg;
    }
    return 'No pudimos cargar el resumen por vendedor. Intentá de nuevo.';
  }

  private cargarTopProductos() {
    this.loading.top = true;
    this.cdr.detectChanges();
    this.estadisticasService.getTopProductos().subscribe({
      next: (res) => {
        this.topProductos = res.data || [];
        this.loading.top = false;
        this.updateTopProductosChart();
        this.cdr.detectChanges();
      },
      error: () => {
        this.topProductos = [];
        this.loading.top = false;
        this.updateTopProductosChart();
        this.cdr.detectChanges();
      }
    });
  }

  private cargarStock() {
    this.loading.stock = true;
    this.cdr.detectChanges();
    this.estadisticasService.getStockCritico().subscribe({
      next: (res) => {
        this.stockCritico = res.data || [];
        this.loading.stock = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.stockCritico = [];
        this.loading.stock = false;
        this.cdr.detectChanges();
      }
    });
  }

  private updateVendedoresChart() {
    const labels = this.resumenVendedores.map((r) => this.etiquetaVendedor(r));
    const data = this.resumenVendedores.map((r) => Number(r.ingresos_totales) || 0);
    this.vendedoresChartData = {
      labels,
      datasets: [
        {
          label: 'Ingresos',
          data,
          backgroundColor: '#D22027',
          borderRadius: 4
        }
      ]
    };
  }

  private updateTopProductosChart() {
    const labels = this.topProductos.map((p) => (p.nombre || '-').slice(0, 36));
    const data = this.topProductos.map((p) => Number(p.unidades_vendidas) || 0);
    this.topProductosChartData = {
      labels,
      datasets: [
        {
          label: 'Unidades vendidas',
          data,
          backgroundColor: '#D22027',
          borderRadius: 4
        }
      ]
    };
  }

  getStockCriticoAlerta(): boolean {
    return (this.stockCritico?.length ?? 0) > 0;
  }

  /** Clave estable por producto + almacén (una fila por depósito bajo mínimo). */
  stockCriticoTrackKey(row: StockCriticoItem): string {
    const aid = row.almacen_id != null ? String(row.almacen_id) : '0';
    return `${row.producto_id}-${aid}`;
  }
}
