import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UsuariosService } from '../../../core/services/usuarios.service';

@Component({
  selector: 'chango-usuario-editar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuario-editar.component.html',
  styleUrl: './usuario-editar.component.css'
})
export class UsuarioEditarComponent implements OnInit {
  usuarioId = 0;
  form = { username: '', email: '', password: '', rol: 'usuario' as 'administrador' | 'usuario', activo: true };
  loading = true;
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usuariosService: UsuariosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.usuarioId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load() {
    this.loading = true;
    this.usuariosService.getById(this.usuarioId).subscribe({
      next: (res) => {
        const u = res.data;
        if (!u) {
          this.router.navigate(['/usuarios']);
          return;
        }
        this.form = {
          username: u.username,
          email: u.email,
          password: '',
          rol: u.rol || 'usuario',
          activo: u.activo ?? true
        };
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/usuarios']);
      }
    });
  }

  cancelar() {
    this.router.navigate(['/usuarios']);
  }

  guardar() {
    if (!this.form.username.trim() || !this.form.email.trim()) return;

    this.saving = true;
    const dto: { username: string; email: string; password?: string; rol: 'administrador' | 'usuario'; activo: boolean } = {
      username: this.form.username.trim(),
      email: this.form.email.trim(),
      rol: this.form.rol,
      activo: this.form.activo
    };
    if (this.form.password.trim()) dto.password = this.form.password;

    this.usuariosService.update(this.usuarioId, dto).subscribe({
      next: () => this.router.navigate(['/usuarios']),
      error: () => { this.saving = false; this.cdr.detectChanges(); }
    });
  }
}
