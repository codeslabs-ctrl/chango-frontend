import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CategoriasService } from '../../../core/services/categorias.service';
import { SubcategoriasService } from '../../../core/services/subcategorias.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'chango-categoria-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './categoria-nuevo.component.html',
  styleUrl: './categoria-nuevo.component.css'
})
export class CategoriaNuevoComponent {
  categoriaNombre = '';
  subcategorias: string[] = [''];
  saving = false;

  constructor(
    private categoriasService: CategoriasService,
    private subcategoriasService: SubcategoriasService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  addSubcategoria() {
    this.subcategorias.push('');
    this.cdr.detectChanges();
  }

  removeSubcategoria(index: number) {
    this.subcategorias.splice(index, 1);
    if (this.subcategorias.length === 0) this.subcategorias.push('');
    this.cdr.detectChanges();
  }

  cancelar() {
    this.router.navigate(['/categorias']);
  }

  guardar() {
    if (!this.categoriaNombre.trim()) return;
    this.saving = true;
    this.cdr.detectChanges();
    this.categoriasService.create({ nombre: this.categoriaNombre.trim() }).subscribe({
      next: (res) => {
        const categoriaId = res.data!.categoria_id;
        const nombres = this.subcategorias.filter(s => s.trim());
        if (nombres.length === 0) {
          this.router.navigate(['/categorias']);
          return;
        }
        const creates = nombres.map(n =>
          this.subcategoriasService.create({ nombre: n.trim(), categoria_id: categoriaId })
        );
        forkJoin(creates).subscribe({
          next: () => this.router.navigate(['/categorias']),
          error: () => { this.saving = false; this.cdr.detectChanges(); }
        });
      },
      error: () => { this.saving = false; this.cdr.detectChanges(); }
    });
  }
}
