import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClientesService, Cliente } from '../../core/services/clientes.service';

@Component({
  selector: 'chango-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.css'
})
export class ClientesComponent implements OnInit {
  clientes: Cliente[] = [];
  loading = false;
  filterText = '';
  pageSize = 10;
  currentPage = 1;

  get clientesFiltrados(): Cliente[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.clientes;
    return this.clientes.filter(c =>
      (c.nombre || '').toLowerCase().includes(q) ||
      (c.cedula_rif || '').toLowerCase().includes(q) ||
      (c.telefono || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.direccion || '').toLowerCase().includes(q)
    );
  }

  get clientesPaginados(): Cliente[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.clientesFiltrados.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.clientesFiltrados.length / this.pageSize));
  }

  constructor(
    private clientesService: ClientesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.cdr.detectChanges();
    this.clientesService.getAll().subscribe({
      next: (res) => {
        this.clientes = res.data || [];
        this.loading = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
