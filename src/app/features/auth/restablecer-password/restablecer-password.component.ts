import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'chango-restablecer-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './restablecer-password.component.html',
  styleUrl: './restablecer-password.component.css'
})
export class RestablecerPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  success = false;
  error = '';

  constructor(
    private api: ApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.error = 'Enlace inválido. Solicita uno nuevo desde recuperar contraseña.';
    }
  }

  onSubmit() {
    this.error = '';
    if (!this.token) return;
    if (!this.newPassword || this.newPassword.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }
    this.loading = true;
    this.api.post<{ message?: string }>('/auth/reset-password', {
      token: this.token,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Error al restablecer. El enlace puede haber expirado.';
      }
    });
  }
}
