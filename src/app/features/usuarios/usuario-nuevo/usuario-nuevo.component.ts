import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuariosService } from '../../../core/services/usuarios.service';

@Component({
  selector: 'chango-usuario-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuario-nuevo.component.html',
  styleUrl: './usuario-nuevo.component.css'
})
export class UsuarioNuevoComponent {
  form = { username: '', email: '', password: '', rol: 'usuario' as 'administrador' | 'usuario' };
  saving = false;

  constructor(
    private usuariosService: UsuariosService,
    private router: Router
  ) {}

  cancelar() {
    this.router.navigate(['/usuarios']);
  }

  guardar() {
    if (!this.form.username.trim() || !this.form.email.trim() || !this.form.password.trim()) return;

    this.saving = true;
    this.usuariosService.create({
      username: this.form.username.trim(),
      email: this.form.email.trim(),
      password: this.form.password,
      rol: this.form.rol
    }).subscribe({
      next: () => this.router.navigate(['/usuarios']),
      error: () => { this.saving = false; }
    });
  }
}
