import {
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { resolveProductImageUrl } from '../../core/utils/product-image.util';
import {
  parseProductosDestaque,
  type VentaProductoDestaque
} from '../../core/utils/venta-productos.util';

@Component({
  selector: 'chango-venta-productos-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './venta-productos-carousel.component.html',
  styleUrl: './venta-productos-carousel.component.css'
})
export class VentaProductosCarouselComponent implements OnChanges, OnDestroy {
  /** Evita reinicios por nuevas instancias de array en cada ciclo de detección de cambios. */
  @Input() destaqueRaw: unknown;
  /**
   * Líneas reales de la venta. Si el backend envía menos ítems en `productos_destaque`,
   * se intentan completar nombres desde `nombresCsv` (solo si al separar por comas hay exactamente `lineasTotal` partes).
   */
  @Input() lineasTotal: number | null | undefined;
  @Input() nombresCsv: string | null | undefined;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly intervalMs = 5200;

  items: VentaProductoDestaque[] = [];
  current = 0;
  private destaqueKey = '';
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private prefersReducedMotion = false;
  private motionQuery: MediaQueryList | null = null;
  private readonly onMotionChange = () => {
    this.prefersReducedMotion = this.motionQuery?.matches ?? false;
    this.restartAuto();
  };

  private hoverPause = false;
  private focusInside = false;
  private touchActive = false;
  private touchStartX = 0;

  readonly placeholderSrc = resolveProductImageUrl(null);

  constructor() {
    if (typeof matchMedia !== 'undefined') {
      this.motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = this.motionQuery.matches;
      this.motionQuery.addEventListener('change', this.onMotionChange);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['destaqueRaw'] || changes['lineasTotal'] || changes['nombresCsv']) {
      const nextKey = this.serializeInputs();
      if (nextKey !== this.destaqueKey) {
        this.destaqueKey = nextKey;
        const base = parseProductosDestaque(this.destaqueRaw);
        this.items = this.paddedDestaque(base, this.lineasTotal, this.nombresCsv);
        this.current = 0;
      }
      this.restartAuto();
    }
  }

  ngOnDestroy(): void {
    this.clearAuto();
    this.motionQuery?.removeEventListener('change', this.onMotionChange);
  }

  get paused(): boolean {
    return this.hoverPause || this.focusInside || this.touchActive;
  }

  get currentItem(): VentaProductoDestaque | null {
    return this.items[this.current] ?? null;
  }

  imagenSrc(url: string | null | undefined): string {
    return resolveProductImageUrl(url ?? null);
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.hoverPause = true;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hoverPause = false;
  }

  @HostListener('focusin')
  onHostFocusIn(): void {
    this.focusInside = true;
  }

  @HostListener('focusout', ['$event'])
  onHostFocusOut(ev: FocusEvent): void {
    const rt = ev.relatedTarget as Node | null;
    if (!rt || !this.host.nativeElement.contains(rt)) {
      this.focusInside = false;
    }
  }

  onTouchStart(ev: TouchEvent): void {
    if (ev.touches.length === 0) return;
    this.touchActive = true;
    this.touchStartX = ev.touches[0].clientX;
  }

  onTouchEnd(ev: TouchEvent): void {
    const t = ev.changedTouches[0];
    if (!t) {
      this.touchActive = false;
      return;
    }
    const dx = t.clientX - this.touchStartX;
    if (this.items.length > 1 && Math.abs(dx) > 45) {
      if (dx < 0) this.next();
      else this.prev();
      this.restartAuto();
    }
    queueMicrotask(() => {
      this.touchActive = false;
    });
  }

  next(): void {
    const n = this.items.length;
    if (n === 0) return;
    this.current = (this.current + 1) % n;
  }

  prev(): void {
    const n = this.items.length;
    if (n === 0) return;
    this.current = (this.current - 1 + n) % n;
  }

  goTo(i: number): void {
    const n = this.items.length;
    if (n === 0 || i < 0 || i >= n) return;
    this.current = i;
  }

  onArrowClick(dir: -1 | 1): void {
    if (dir < 0) this.prev();
    else this.next();
    this.restartAuto();
  }

  onDotClick(i: number): void {
    this.goTo(i);
    this.restartAuto();
  }

  private restartAuto(): void {
    this.clearAuto();
    if (this.prefersReducedMotion || this.items.length <= 1) return;
    this.intervalId = setInterval(() => {
      if (this.paused) return;
      this.next();
    }, this.intervalMs);
  }

  private clearAuto(): void {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private serializeInputs(): string {
    const rawKey = this.serializeDestaque(this.destaqueRaw);
    const n = this.lineasTotal != null && Number.isFinite(Number(this.lineasTotal)) ? Number(this.lineasTotal) : null;
    const names = (this.nombresCsv ?? '').trim();
    return `${rawKey}|${n ?? ''}|${names}`;
  }

  private serializeDestaque(raw: unknown): string {
    if (raw == null) return '';
    if (typeof raw === 'string') return raw;
    try {
      return JSON.stringify(raw);
    } catch {
      return '\0' + String(raw);
    }
  }

  private paddedDestaque(
    base: VentaProductoDestaque[],
    lineasTotal: number | null | undefined,
    nombresCsv: string | null | undefined
  ): VentaProductoDestaque[] {
    const n = lineasTotal != null && lineasTotal > 0 ? Math.floor(Number(lineasTotal)) : 0;
    if (!n || base.length >= n) return base;
    const csv = (nombresCsv || '').trim();
    if (!csv) return base;
    const parts = csv.split(/\s*,\s*/).filter(s => s.length > 0);
    if (parts.length !== n) return base;
    const out = [...base];
    for (let i = base.length; i < n; i++) {
      out.push({
        imagen_url: null,
        descripcion: parts[i] ?? 'Producto',
        cantidad: 0
      });
    }
    return out;
  }
}
