import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UsuariosService, Usuario } from '../../core/services/usuarios.service';

@Component({
  selector: 'chango-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css'
})
export class UsuariosComponent implements OnInit {
  usuarios: Usuario[] = [];
  loading = false;
  filterText = '';
  pageSize = 10;
  currentPage = 1;

  get usuariosFiltrados(): Usuario[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.usuarios;
    return this.usuarios.filter(u =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }

  get usuariosPaginados(): Usuario[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.usuariosFiltrados.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.usuariosFiltrados.length / this.pageSize));
  }

  constructor(
    private usuariosService: UsuariosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.usuariosService.getAll().subscribe({
      next: (res) => {
        this.usuarios = res.data || [];
        this.loading = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  eliminar(u: Usuario) {
    if (!confirm('¿Eliminar el usuario "' + u.username + '"?')) return;
    this.usuariosService.delete(u.id).subscribe({
      next: () => this.load(),
      error: (err) => {
        alert(err?.error?.message || 'Error al eliminar');
        this.cdr.detectChanges();
      }
    });
  }
}
