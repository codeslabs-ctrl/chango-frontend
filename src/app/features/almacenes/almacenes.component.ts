import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlmacenesService, Almacen } from '../../core/services/almacenes.service';

@Component({
  selector: 'chango-almacenes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './almacenes.component.html',
  styleUrl: './almacenes.component.css'
})
export class AlmacenesComponent implements OnInit {
  almacenes: Almacen[] = [];
  loading = false;
  showForm = false;
  editingAlmacen: Almacen | null = null;
  form = { nombre: '', ubicacion: '', estatus: 'A' as 'A' | 'C' };
  filterAlmacenes = '';
  pageSize = 10;
  currentPage = 1;

  get almacenesFiltrados(): Almacen[] {
    const q = this.filterAlmacenes.trim().toLowerCase();
    if (!q) return this.almacenes;
    return this.almacenes.filter(a =>
      (a.nombre || '').toLowerCase().includes(q) ||
      (a.ubicacion || '').toLowerCase().includes(q)
    );
  }

  get almacenesPaginados(): Almacen[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.almacenesFiltrados.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.almacenesFiltrados.length / this.pageSize));
  }

  constructor(
    private almacenesService: AlmacenesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.almacenesService.getAll().subscribe({
      next: (res) => { this.almacenes = res.data || []; this.loading = false; setTimeout(() => this.cdr.detectChanges(), 0); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  openAddForm() {
    this.editingAlmacen = null;
    this.form = { nombre: '', ubicacion: '', estatus: 'A' as 'A' | 'C' };
    this.showForm = true;
  }

  edit(a: Almacen) {
    this.editingAlmacen = a;
    this.form = {
      nombre: a.nombre,
      ubicacion: a.ubicacion || '',
      estatus: (a.estatus === 'C' ? 'C' : 'A') as 'A' | 'C'
    };
    this.showForm = true;
  }

  cancelForm() {
    this.showForm = false;
    this.editingAlmacen = null;
  }

  saveAlmacen() {
    const dto = { nombre: this.form.nombre, ubicacion: this.form.ubicacion, estatus: this.form.estatus };
    if (this.editingAlmacen) {
      this.almacenesService.update(this.editingAlmacen.almacen_id, dto).subscribe({
        next: () => { this.cancelForm(); this.load(); }
      });
    } else {
      this.almacenesService.create(dto).subscribe({
        next: () => { this.cancelForm(); this.load(); }
      });
    }
  }

  toggleEstatus(a: Almacen) {
    const nuevo = (a.estatus || 'A') === 'A' ? 'C' : 'A';
    this.almacenesService.update(a.almacen_id, { estatus: nuevo }).subscribe({
      next: () => this.load(),
      error: () => this.cdr.detectChanges()
    });
  }

  eliminar(a: Almacen) {
    if (!confirm('¿Eliminar el almacén "' + a.nombre + '"?')) return;
    this.almacenesService.delete(a.almacen_id).subscribe({
      next: () => this.load(),
      error: (err) => {
        alert(err.error?.message || 'Error al eliminar');
        this.cdr.detectChanges();
      }
    });
  }
}
