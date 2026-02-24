import { Component, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'chango-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.css'
})
export class DashboardLayoutComponent {
  constructor(protected auth: AuthService) {}
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
