import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UsuariosService } from '../../../core/services/usuarios.service';

@Component({
  selector: 'chango-cuenta-datos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cuenta-datos.component.html',
  styleUrl: './cuenta-datos.component.css'
})
export class CuentaDatosComponent {
  form = { username: '', email: '' };
  saving = false;
  error = '';

  constructor(
    protected auth: AuthService,
    private usuariosService: UsuariosService,
    private router: Router
  ) {
    const u = this.auth.user();
    if (u) {
      this.form = { username: u.username, email: u.email };
    }
  }

  cancelar() {
    this.router.navigate(['/cuenta']);
  }

  guardar() {
    this.error = '';
    if (!this.form.username.trim() || !this.form.email.trim()) {
      this.error = 'Nombre de usuario y email son requeridos';
      return;
    }
    this.saving = true;
    this.usuariosService.updateMe({
      username: this.form.username.trim(),
      email: this.form.email.trim()
    }).subscribe({
      next: (res) => {
        if (res.data) {
          this.auth.updateUser({ username: res.data.username, email: res.data.email });
        }
        this.router.navigate(['/cuenta']);
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Error al actualizar';
        this.saving = false;
      }
    });
  }
}
