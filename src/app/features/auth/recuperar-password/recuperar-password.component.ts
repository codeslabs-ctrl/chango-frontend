import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'chango-recuperar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recuperar-password.component.html',
  styleUrl: './recuperar-password.component.css'
})
export class RecuperarPasswordComponent {
  email = '';
  loading = false;
  error = '';

  constructor(
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  onSubmit() {
    this.error = '';
    if (!this.email.trim()) {
      this.error = 'Ingresa tu correo electrónico';
      return;
    }
    this.loading = true;
    this.api.post<{ message?: string }>('/auth/forgot-password', { email: this.email.trim() }).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Error al enviar. Intenta de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }
}
