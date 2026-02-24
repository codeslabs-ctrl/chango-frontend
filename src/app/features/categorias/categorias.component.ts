import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CategoriasService } from '../../core/services/categorias.service';
import { SubcategoriasService, Subcategoria } from '../../core/services/subcategorias.service';

export interface CategoriaRow {
  categoria_id: number;
  categoria_nombre: string;
  subcategoria_id: number | null;
  subcategoria_nombre: string;
}

@Component({
  selector: 'chango-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.css'
})
export class CategoriasComponent implements OnInit {
  categorias: { categoria_id: number; nombre: string }[] = [];
  subcategorias: Subcategoria[] = [];
  loading = false;
  filterText = '';

  get tableRows(): CategoriaRow[] {
    const rows: CategoriaRow[] = [];
    for (const s of this.subcategorias) {
      rows.push({
        categoria_id: s.categoria_id,
        categoria_nombre: s.categoria_nombre ?? '',
        subcategoria_id: s.subcategoria_id,
        subcategoria_nombre: s.nombre
      });
    }
    const catIdsWithSub = new Set(this.subcategorias.map(s => s.categoria_id));
    for (const c of this.categorias) {
      if (!catIdsWithSub.has(c.categoria_id)) {
        rows.push({
          categoria_id: c.categoria_id,
          categoria_nombre: c.nombre,
          subcategoria_id: null,
          subcategoria_nombre: '-'
        });
      }
    }
    return rows.sort((a, b) => a.categoria_nombre.localeCompare(b.categoria_nombre) || a.subcategoria_nombre.localeCompare(b.subcategoria_nombre));
  }

  pageSize = 10;
  currentPage = 1;

  get rowsFiltradas(): CategoriaRow[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.tableRows;
    return this.tableRows.filter(r =>
      (r.categoria_nombre || '').toLowerCase().includes(q) ||
      (r.subcategoria_nombre || '').toLowerCase().includes(q)
    );
  }

  get rowsPaginadas(): CategoriaRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.rowsFiltradas.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.rowsFiltradas.length / this.pageSize));
  }

  constructor(
    private categoriasService: CategoriasService,
    private subcategoriasService: SubcategoriasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.categoriasService.getAll().subscribe({
      next: (res) => {
        this.categorias = res.data || [];
        this.subcategoriasService.getAll().subscribe({
          next: (subRes) => {
            this.subcategorias = subRes.data || [];
            this.loading = false;
            setTimeout(() => this.cdr.detectChanges(), 0);
          },
          error: () => { this.loading = false; this.cdr.detectChanges(); }
        });
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  deleteCategoria(categoriaId: number, nombre: string) {
    if (confirm('¿Eliminar categoría "' + nombre + '" y todas sus subcategorías?')) {
      this.categoriasService.delete(categoriaId).subscribe({
        next: () => { this.load(); }
      });
    }
  }
}
