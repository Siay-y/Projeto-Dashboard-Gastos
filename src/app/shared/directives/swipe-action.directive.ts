import {
  DestroyRef,
  Directive,
  ElementRef,
  Renderer2,
  afterNextRender,
  inject,
  input,
  output,
} from '@angular/core';

const AXIS_LOCK_PX = 8;

const RUBBER_BAND = 0.35;

const SPRING = 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)';
const FLY_OUT = 'transform 220ms cubic-bezier(0.4, 0, 1, 1)';

type Side = 'none' | 'edit' | 'delete';

@Directive({
  selector: '[appSwipeAction]',
  host: { class: 'swipe-action' },
})
export class SwipeActionDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly destroyRef = inject(DestroyRef);

  readonly swipeThreshold = input(0.4);
  readonly swipeDisabled = input(false);

  readonly swipeEdit = output<void>();
  readonly swipeDelete = output<void>();

  private foreground: HTMLElement | null = null;
  private startX = 0;
  private startY = 0;
  private dx = 0;
  private width = 0;
  private axis: 'none' | 'x' | 'y' = 'none';
  private armed: Side = 'none';
  private animating = false;

  constructor() {
    afterNextRender(() => this.setup());
  }

  private setup(): void {
    const el = this.host.nativeElement;
    this.foreground = el.firstElementChild as HTMLElement | null;
    if (!this.foreground) return;

    this.foreground.classList.add('swipe-action__fg');
    el.appendChild(this.buildBackground('edit', 'edit'));
    el.appendChild(this.buildBackground('delete', 'delete'));

    const opts: AddEventListenerOptions = { passive: true };
    const onStart = (e: TouchEvent) => this.onStart(e);
    const onMove = (e: TouchEvent) => this.onMove(e);
    const onEnd = () => this.onEnd();
    const onCancel = () => this.springBack();

    el.addEventListener('touchstart', onStart, opts);
    // `passive: false` para poder bloquear a rolagem durante o deslize horizontal.
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, opts);
    el.addEventListener('touchcancel', onCancel, opts);

    this.destroyRef.onDestroy(() => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onCancel);
    });
  }

  private buildBackground(side: Exclude<Side, 'none'>, icon: string): HTMLElement {
    const bg = this.renderer.createElement('div') as HTMLElement;
    bg.className = `swipe-action__bg swipe-action__bg--${side}`;
    bg.setAttribute('aria-hidden', 'true');

    const glyph = this.renderer.createElement('span') as HTMLElement;
    glyph.className = 'swipe-action__icon material-symbols-rounded';
    glyph.textContent = icon;

    bg.appendChild(glyph);
    return bg;
  }

  private onStart(event: TouchEvent): void {
    if (this.swipeDisabled() || this.animating || event.touches.length !== 1) return;

    const touch = event.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.dx = 0;
    this.axis = 'none';
    this.armed = 'none';
    this.width = this.host.nativeElement.offsetWidth;

    if (this.foreground) this.foreground.style.transition = 'none';
  }

  private onMove(event: TouchEvent): void {
    if (this.swipeDisabled() || this.animating || !this.foreground) return;

    const touch = event.touches[0];
    const rawDx = touch.clientX - this.startX;
    const rawDy = touch.clientY - this.startY;

    if (this.axis === 'none') {
      // Trava o eixo uma vez: horizontal = deslize, vertical = rolagem da página.
      if (Math.abs(rawDx) < AXIS_LOCK_PX && Math.abs(rawDy) < AXIS_LOCK_PX) return;
      this.axis = Math.abs(rawDx) > Math.abs(rawDy) ? 'x' : 'y';
      if (this.axis === 'x') this.host.nativeElement.classList.add('is-swiping');
    }
    if (this.axis === 'y') return;

    event.preventDefault();
    this.dx = this.rubberBand(rawDx);
    this.render();

    const next = this.sideFor(this.dx);
    if (next !== this.armed) {
      this.armed = next;
      this.host.nativeElement.classList.toggle('is-armed', next !== 'none');
      if (next !== 'none') navigator.vibrate?.(12);
    }
  }

  private onEnd(): void {
    if (this.axis !== 'x') {
      this.reset();
      return;
    }

    if (this.armed === 'delete') {
      this.flyOut(() => this.swipeDelete.emit());
    } else if (this.armed === 'edit') {
      this.springBack(() => this.swipeEdit.emit());
    } else {
      this.springBack();
    }
  }

  private get thresholdPx(): number {
    return Math.max(72, this.width * this.swipeThreshold());
  }

  private rubberBand(dx: number): number {
    const limit = this.thresholdPx;
    const abs = Math.abs(dx);
    if (abs <= limit) return dx;
    return Math.sign(dx) * (limit + (abs - limit) * RUBBER_BAND);
  }

  private sideFor(dx: number): Side {
    if (dx >= this.thresholdPx) return 'edit';
    if (dx <= -this.thresholdPx) return 'delete';
    return 'none';
  }

  private render(): void {
    const el = this.host.nativeElement;
    this.foreground!.style.transform = `translate3d(${this.dx}px, 0, 0)`;
    el.dataset['swipeDir'] = this.dx > 0 ? 'edit' : this.dx < 0 ? 'delete' : '';
    el.style.setProperty('--swipe-progress', String(Math.min(1, Math.abs(this.dx) / this.thresholdPx)));
  }

  private springBack(done?: () => void): void {
    const fg = this.foreground;
    if (!fg) return;

    if (this.dx === 0) {
      this.reset();
      done?.();
      return;
    }

    this.animating = true;
    this.afterTransition(fg, () => {
      this.reset();
      done?.();
    });
    fg.style.transition = reducedMotion() ? 'none' : SPRING;
    fg.style.transform = 'translate3d(0, 0, 0)';
  }

  private flyOut(done: () => void): void {
    const fg = this.foreground!;
    this.animating = true;
    this.afterTransition(fg, () => {
      done();
      this.reset();
    });
    fg.style.transition = reducedMotion() ? 'none' : FLY_OUT;
    fg.style.transform = 'translate3d(-110%, 0, 0)';
  }

  private afterTransition(el: HTMLElement, cb: () => void): void {
    if (reducedMotion()) {
      requestAnimationFrame(cb);
      return;
    }
    const handler = (e: TransitionEvent) => {
      if (e.target !== el) return;
      el.removeEventListener('transitionend', handler);
      cb();
    };
    el.addEventListener('transitionend', handler);
  }

  private reset(): void {
    const el = this.host.nativeElement;
    this.dx = 0;
    this.axis = 'none';
    this.armed = 'none';
    this.animating = false;
    el.classList.remove('is-swiping', 'is-armed');
    delete el.dataset['swipeDir'];
    el.style.removeProperty('--swipe-progress');
    if (this.foreground) {
      this.foreground.style.transition = '';
      this.foreground.style.transform = '';
    }
  }
}

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
