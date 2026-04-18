import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstadisticasService, CierreVentaDiaResumen } from '../../core/services/estadisticas.service';

function fechaLocalHoyYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'chango-cierre-venta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cierre-venta.component.html',
  styleUrl: './cierre-venta.component.css'
})
export class CierreVentaComponent implements OnInit {
  fecha = fechaLocalHoyYMD();
  loading = false;
  error = '';
  data: CierreVentaDiaResumen | null = null;

  constructor(
    private estadisticasService: EstadisticasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();
    this.estadisticasService.getCierreVentaDia(this.fecha).subscribe({
      next: (res) => {
        this.data = res.data || null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'No pudimos cargar el cierre de venta.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
