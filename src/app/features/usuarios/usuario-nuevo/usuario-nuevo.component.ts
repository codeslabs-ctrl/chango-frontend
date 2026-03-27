import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { UsuariosService } from '../../../core/services/usuarios.service';

@Component({
  selector: 'chango-usuario-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuario-nuevo.component.html',
  styleUrl: './usuario-nuevo.component.css'
})
export class UsuarioNuevoComponent {
  form = {
    nombre_usuario: '',
    username: '',
    email: '',
    password: '',
    rol: 'usuario' as 'administrador' | 'usuario' | 'vendedor'
  };
  saving = false;
  errorMsg = '';

  constructor(
    private usuariosService: UsuariosService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  cancelar() {
    this.router.navigate(['/usuarios']);
  }

  guardar() {
    if (!this.form.username.trim() || !this.form.email.trim() || !this.form.password.trim()) return;

    this.errorMsg = '';
    this.saving = true;
    const nombre = this.form.nombre_usuario.trim();
    this.usuariosService
      .create({
        username: this.form.username.trim(),
        email: this.form.email.trim(),
        password: this.form.password,
        rol: this.form.rol,
        ...(nombre ? { nombre_usuario: nombre } : {})
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => this.router.navigate(['/usuarios']),
        error: (err: HttpErrorResponse) => {
          const msg = err.error?.message;
          this.errorMsg =
            typeof msg === 'string'
              ? msg
              : 'No pudimos crear el usuario. Revisá la conexión e intentá de nuevo.';
        }
      });
  }
}
