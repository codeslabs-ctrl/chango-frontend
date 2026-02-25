import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'chango-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  loading = false;
  error = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit() {
    this.error = '';
    if (!this.username.trim() || !this.password) {
      this.error = 'Ingresa el nombre de usuario y la contraseña';
      return;
    }
    this.loading = true;
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: (res: { success?: boolean; token?: string; user?: { id: number; username: string; email: string } }) => {
        if (res?.success && res.token && res.user) {
          this.auth.setSession(res.token, res.user);
          this.router.navigate(['/dashboard']);
        } else {
          const msg = res && typeof res === 'object' && 'message' in res ? (res as { message?: string }).message : undefined;
          this.error = msg ?? 'Error al iniciar sesión';
          this.loading = false;
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error = (err?.error as { message?: string })?.message ?? 'Usuario o contraseña inválidos';
        this.cdr.detectChanges();
      }
    });
  }
}
