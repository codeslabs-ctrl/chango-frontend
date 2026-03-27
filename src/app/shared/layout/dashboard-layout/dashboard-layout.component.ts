import { Component, OnInit, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UsuariosService } from '../../../core/services/usuarios.service';

@Component({
  selector: 'chango-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css'
})
export class DashboardLayoutComponent implements OnInit {
  constructor(
    protected auth: AuthService,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit() {
    if (!this.auth.token()) return;
    this.usuariosService.getMe().subscribe({
      next: (res) => {
        const d = res.data;
        if (!d) return;
        this.auth.updateUser({
          username: d.username,
          email: d.email,
          nombre_usuario: d.nombre_usuario ?? null
        });
      },
      error: () => {}
    });
  }
  @ViewChild('menuWrapper') menuWrapper?: ElementRef<HTMLElement>;
  menuOpen = signal(false);

  toggleMenu() {
    this.menuOpen.update(v => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const wrapper = this.menuWrapper?.nativeElement;
    if (wrapper && !wrapper.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }
}
