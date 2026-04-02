import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { UsuariosService } from '../../../core/services/usuarios.service';

type RolForm = 'administrador' | 'facturador' | 'vendedor';

function apiRolToForm(rol: string | undefined | null): RolForm {
  const r = (rol || '').trim();
  if (r === 'administrador') return 'administrador';
  if (r === 'vendedor') return 'vendedor';
  if (r === 'facturador' || r === 'usuario') return 'facturador';
  return 'facturador';
}

@Component({
  selector: 'chango-usuario-editar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuario-editar.component.html',
  styleUrl: './usuario-editar.component.css'
})
export class UsuarioEditarComponent implements OnInit {
  usuarioId = 0;
  form = {
    nombre_usuario: '',
    username: '',
    email: '',
    password: '',
    rol: 'facturador' as RolForm,
    porcentaje_comision: 0,
    activo: true
  };
  loading = true;
  saving = false;
  errorMsg = '';

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
        const pctRaw = u.porcentaje_comision;
        const pct =
          pctRaw === null || pctRaw === undefined || pctRaw === ''
            ? 0
            : typeof pctRaw === 'string'
              ? parseFloat(pctRaw.replace(',', '.'))
              : Number(pctRaw);
        this.form = {
          nombre_usuario: u.nombre_usuario ?? '',
          username: u.username,
          email: u.email,
          password: '',
          rol: apiRolToForm(u.rol),
          porcentaje_comision: Number.isFinite(pct) ? pct : 0,
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

    this.errorMsg = '';
    this.saving = true;
    const dto: {
      username: string;
      email: string;
      nombre_usuario: string | null;
      password?: string;
      rol: RolForm;
      activo: boolean;
      porcentaje_comision?: number;
    } = {
      username: this.form.username.trim(),
      email: this.form.email.trim(),
      nombre_usuario: this.form.nombre_usuario.trim() || null,
      rol: this.form.rol,
      activo: this.form.activo
    };
    if (this.form.password.trim()) dto.password = this.form.password;
    if (this.form.rol === 'vendedor') {
      dto.porcentaje_comision = Number(this.form.porcentaje_comision) || 0;
    }

    this.usuariosService
      .update(this.usuarioId, dto)
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
              : 'No pudimos guardar los cambios. Revisá la conexión e intentá de nuevo.';
        }
      });
  }
}
