import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientesService } from '../../../core/services/clientes.service';

@Component({
  selector: 'chango-cliente-editar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cliente-editar.component.html',
  styleUrl: './cliente-editar.component.css'
})
export class ClienteEditarComponent implements OnInit {
  clienteId = 0;
  nombre = '';
  cedulaRif = '';
  telefono = '';
  email = '';
  direccion = '';
  loading = true;
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientesService: ClientesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.clienteId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load() {
    this.loading = true;
    this.clientesService.getById(this.clienteId).subscribe({
      next: (res) => {
        const c = res.data;
        if (!c) {
          this.router.navigate(['/clientes']);
          return;
        }
        this.nombre = c.nombre || '';
        this.cedulaRif = c.cedula_rif || '';
        this.telefono = c.telefono || '';
        this.email = c.email || '';
        this.direccion = c.direccion || '';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/clientes']);
      }
    });
  }

  cancelar() {
    this.router.navigate(['/clientes']);
  }

  guardar() {
    if (!this.nombre.trim()) return;
    this.saving = true;
    this.cdr.detectChanges();
    this.clientesService.update(this.clienteId, {
      nombre: this.nombre.trim(),
      cedula_rif: this.cedulaRif.trim() || undefined,
      telefono: this.telefono.trim() || undefined,
      email: this.email.trim() || undefined,
      direccion: this.direccion.trim() || undefined
    }).subscribe({
      next: () => this.router.navigate(['/clientes']),
      error: () => {
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }
}
