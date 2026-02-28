import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuariosService } from '../../../core/services/usuarios.service';

@Component({
  selector: 'chango-cuenta-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cuenta-password.component.html',
  styleUrl: './cuenta-password.component.css'
})
export class CuentaPasswordComponent {
  form = { currentPassword: '', newPassword: '', confirmPassword: '' };
  saving = false;
  error = '';

  constructor(
    private usuariosService: UsuariosService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  cancelar() {
    this.router.navigate(['/cuenta']);
  }

  guardar() {
    this.error = '';
    if (!this.form.currentPassword || !this.form.newPassword) {
      this.error = 'Contraseña actual y nueva son requeridas';
      return;
    }
    if (this.form.newPassword.length < 6) {
      this.error = 'La nueva contraseña debe tener al menos 6 caracteres';
      return;
    }
    if (this.form.newPassword !== this.form.confirmPassword) {
      this.error = 'Las contraseñas nuevas no coinciden';
      return;
    }
    this.saving = true;
    this.usuariosService.changePassword(
      this.form.currentPassword,
      this.form.newPassword
    ).subscribe({
      next: () => this.router.navigate(['/cuenta']),
      error: (err) => {
        this.error = err?.error?.message ?? 'Contraseña actual incorrecta';
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }
}
