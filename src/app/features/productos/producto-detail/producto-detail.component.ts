import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductosService, Producto } from '../../../core/services/productos.service';

@Component({
  selector: 'chango-producto-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './producto-detail.component.html',
  styleUrl: './producto-detail.component.css'
})
export class ProductoDetailComponent implements OnInit {
  productoId = 0;
  producto: Producto | null = null;
  form = { existencia_actual: 0, precio_venta_sugerido: 0 };

  constructor(
    private route: ActivatedRoute,
    private productosService: ProductosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.productoId = Number(this.route.snapshot.paramMap.get('id'));
    this.productosService.getById(this.productoId).subscribe({
      next: (res) => {
        this.producto = res.data || null;
        if (this.producto) {
          this.form = {
            existencia_actual: this.producto.existencia_actual,
            precio_venta_sugerido: this.producto.precio_venta_sugerido
          };
        }
        this.cdr.detectChanges();
      }
    });
  }

  save() {
    this.productosService.update(this.productoId, this.form).subscribe({
      next: () => { /* could show toast */ }
    });
  }
}
