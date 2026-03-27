import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { EstadisticasService } from '../../core/services/estadisticas.service';

@Component({
  selector: 'chango-estadisticas',
  standalone: true,
  imports: [CommonModule, RouterLink, BaseChartDirective],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.css'
})
export class EstadisticasComponent implements OnInit {
  ventasPendientes: any[] = [];
  comparativaMensual: any[] = [];
  topProductos: any[] = [];
  stockCritico: any[] = [];
  loading = { ventas: true, comparativa: true, top: true, stock: true };
  error: string | null = null;

  comparativaChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Mes actual', 'Mes anterior'],
    datasets: [{
      label: 'Ventas',
      data: [0, 0],
      backgroundColor: ['#D22027', '#94a3b8'],
      borderRadius: 4
    }]
  };
  comparativaChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 8, left: 8 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${(ctx.parsed.y ?? 0).toLocaleString('es', { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: { ticks: { maxRotation: 45, minRotation: 0 } },
      y: { beginAtZero: true }
    }
  };

  topProductosChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{
      label: 'Ingresos',
      data: [],
      backgroundColor: '#D22027',
      borderRadius: 4
    }]
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
          label: (ctx) => ` ${(ctx.parsed.x ?? 0).toLocaleString('es', { minimumFractionDigits: 2 })}`
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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.estadisticasService.getVentasPendientes().subscribe({
      next: (res) => {
        this.ventasPendientes = res.data || [];
        this.loading.ventas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.ventasPendientes = [];
        this.loading.ventas = false;
        this.cdr.detectChanges();
      }
    });

    this.estadisticasService.getComparativaMensual().subscribe({
      next: (res) => {
        this.comparativaMensual = res.data || [];
        this.loading.comparativa = false;
        this.updateComparativaChart();
        this.cdr.detectChanges();
      },
      error: () => {
        this.comparativaMensual = [];
        this.loading.comparativa = false;
        this.cdr.detectChanges();
      }
    });

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
        this.cdr.detectChanges();
      }
    });

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

  private updateComparativaChart() {
    const row = this.comparativaMensual[0];
    const actual = Number(row?.monto_actual) || 0;
    const anterior = Number(row?.monto_anterior) || 0;
    this.comparativaChartData = {
      labels: ['Mes actual', 'Mes anterior'],
      datasets: [{
        label: 'Ventas',
        data: [actual, anterior],
        backgroundColor: ['#D22027', '#94a3b8'],
        borderRadius: 4
      }]
    };
  }

  private updateTopProductosChart() {
    const labels = this.topProductos.map(p => (p.nombre || p.codigo_interno || '-').slice(0, 30));
    const data = this.topProductos.map(p => Number(p.ingresos_totales) || 0);
    this.topProductosChartData = {
      labels,
      datasets: [{
        label: 'Ingresos',
        data,
        backgroundColor: '#D22027',
        borderRadius: 4
      }]
    };
  }

  getStockCriticoAlerta(): boolean {
    return (this.stockCritico?.length ?? 0) > 0;
  }
}
