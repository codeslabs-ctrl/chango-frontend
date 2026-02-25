import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EstadisticasService } from '../../core/services/estadisticas.service';

@Component({
  selector: 'chango-estadisticas',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: () => {
        this.ventasPendientes = [];
        this.loading.ventas = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
      }
    });

    this.estadisticasService.getComparativaMensual().subscribe({
      next: (res) => {
        this.comparativaMensual = res.data || [];
        this.loading.comparativa = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: () => {
        this.comparativaMensual = [];
        this.loading.comparativa = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
      }
    });

    this.estadisticasService.getTopProductos().subscribe({
      next: (res) => {
        this.topProductos = res.data || [];
        this.loading.top = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: () => {
        this.topProductos = [];
        this.loading.top = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
      }
    });

    this.estadisticasService.getStockCritico().subscribe({
      next: (res) => {
        this.stockCritico = res.data || [];
        this.loading.stock = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: () => {
        this.stockCritico = [];
        this.loading.stock = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
      }
    });
  }

  /** La vista solo devuelve productos con stock < 5, así que si hay filas = alerta */
  getStockCriticoAlerta(): boolean {
    return (this.stockCritico?.length ?? 0) > 0;
  }

  /** Porcentaje para la barra comparativa (máx = 100%) */
  getBarWidth(val: number, other: number): number {
    const a = Number(val) || 0;
    const b = Number(other) || 0;
    const max = Math.max(a, b, 1);
    return Math.min(100, (a / max) * 100);
  }
}
