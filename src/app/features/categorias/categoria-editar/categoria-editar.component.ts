import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CategoriasService } from '../../../core/services/categorias.service';
import { SubcategoriasService } from '../../../core/services/subcategorias.service';
import { forkJoin } from 'rxjs';

interface SubcategoriaEdit {
  subcategoria_id: number | null;
  nombre: string;
}

@Component({
  selector: 'chango-categoria-editar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './categoria-editar.component.html',
  styleUrl: './categoria-editar.component.css'
})
export class CategoriaEditarComponent implements OnInit {
  categoriaId = 0;
  categoriaNombre = '';
  subcategorias: SubcategoriaEdit[] = [];
  originalSubcategoriaIds: number[] = [];
  loading = true;
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoriasService: CategoriasService,
    private subcategoriasService: SubcategoriasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.categoriaId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load() {
    this.loading = true;
    this.categoriasService.getAll().subscribe({
      next: (res) => {
        const cat = (res.data || []).find(c => c.categoria_id === this.categoriaId);
        if (!cat) {
          this.router.navigate(['/categorias']);
          return;
        }
        this.categoriaNombre = cat.nombre;
        this.subcategoriasService.getAll(this.categoriaId).subscribe({
          next: (subRes) => {
            const data = subRes.data || [];
            this.subcategorias = data.map(s => ({
              subcategoria_id: s.subcategoria_id,
              nombre: s.nombre
            }));
            this.originalSubcategoriaIds = data.map(s => s.subcategoria_id);
            if (this.subcategorias.length === 0) this.subcategorias.push({ subcategoria_id: null, nombre: '' });
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => { this.loading = false; this.cdr.detectChanges(); }
        });
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  addSubcategoria() {
    this.subcategorias.push({ subcategoria_id: null, nombre: '' });
    this.cdr.detectChanges();
  }

  removeSubcategoria(index: number) {
    this.subcategorias.splice(index, 1);
    if (this.subcategorias.length === 0) this.subcategorias.push({ subcategoria_id: null, nombre: '' });
    this.cdr.detectChanges();
  }

  cancelar() {
    this.router.navigate(['/categorias']);
  }

  eliminarCategoria() {
    if (!confirm(`¿Eliminar la categoría "${this.categoriaNombre}" y todas sus subcategorías?`)) return;
    this.saving = true;
    this.cdr.detectChanges();
    this.categoriasService.delete(this.categoriaId).subscribe({
      next: () => this.router.navigate(['/categorias']),
      error: () => { this.saving = false; this.cdr.detectChanges(); }
    });
  }

  guardar() {
    if (!this.categoriaNombre.trim()) return;
    this.saving = true;
    this.cdr.detectChanges();
    this.categoriasService.update(this.categoriaId, { nombre: this.categoriaNombre.trim() }).subscribe({
      next: () => {
        const currentIds = new Set(
          this.subcategorias.filter(s => s.subcategoria_id !== null && s.nombre.trim()).map(s => s.subcategoria_id!)
        );
        const toDeleteIds = [
          ...new Set([
            ...this.originalSubcategoriaIds.filter(id => !currentIds.has(id)),
            ...this.subcategorias.filter(s => s.subcategoria_id !== null && !s.nombre.trim()).map(s => s.subcategoria_id!)
          ])
        ];
        const toCreate = this.subcategorias.filter(s => s.subcategoria_id === null && s.nombre.trim());
        const toUpdate = this.subcategorias.filter(s => s.subcategoria_id !== null && s.nombre.trim());
        const ops: any[] = [];
        for (const id of toDeleteIds) {
          ops.push(this.subcategoriasService.delete(id));
        }
        for (const s of toUpdate) {
          if (s.subcategoria_id) ops.push(this.subcategoriasService.update(s.subcategoria_id, { nombre: s.nombre.trim() }));
        }
        for (const s of toCreate) {
          ops.push(this.subcategoriasService.create({ nombre: s.nombre.trim(), categoria_id: this.categoriaId }));
        }
        if (ops.length === 0) {
          this.router.navigate(['/categorias']);
          return;
        }
        forkJoin(ops).subscribe({
          next: () => this.router.navigate(['/categorias']),
          error: () => { this.saving = false; this.cdr.detectChanges(); }
        });
      },
      error: () => { this.saving = false; this.cdr.detectChanges(); }
    });
  }
}
