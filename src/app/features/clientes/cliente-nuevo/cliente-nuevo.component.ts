import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ClientesService } from '../../../core/services/clientes.service';

@Component({
  selector: 'chango-cliente-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cliente-nuevo.component.html',
  styleUrl: './cliente-nuevo.component.css'
})
export class ClienteNuevoComponent {
  nombre = '';
  cedulaRif = '';
  telefono = '';
  email = '';
  direccion = '';
  saving = false;

  constructor(
    private router: Router,
    private clientesService: ClientesService,
    private cdr: ChangeDetectorRef
  ) {}

  cancelar() {
    this.router.navigate(['/clientes']);
  }

  guardar() {
    if (!this.nombre.trim()) return;
    this.saving = true;
    this.cdr.detectChanges();
    this.clientesService
      .create({
        nombre: this.nombre.trim(),
        cedula_rif: this.cedulaRif.trim() || undefined,
        telefono: this.telefono.trim() || undefined,
        email: this.email.trim() || undefined,
        direccion: this.direccion.trim() || undefined
      })
      .subscribe({
        next: () => this.router.navigate(['/clientes']),
        error: () => {
          this.saving = false;
          this.cdr.detectChanges();
        }
      });
  }
}
