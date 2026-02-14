import { vi } from 'vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: ResizeObserverMock,
  writable: true,
});

Object.defineProperty(window, 'devicePixelRatio', {
  value: 1,
  writable: true,
});

Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  value() {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 640,
      bottom: 360,
      width: 640,
      height: 360,
      toJSON() {
        return {};
      },
    };
  },
  writable: true,
});

HTMLCanvasElement.prototype.getContext = vi.fn(() => {
  return {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    setTransform: vi.fn(),
    font: '',
    textAlign: 'left',
    fillStyle: '#000',
  };
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

class MockImage {
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  naturalWidth = 1200;
  naturalHeight = 800;
  decoding = 'auto';
  private _src = '';

  set src(value: string) {
    this._src = value;
    queueMicrotask(() => {
      this.onload?.();
    });
  }

  get src() {
    return this._src;
  }
}

Object.defineProperty(globalThis, 'Image', {
  value: MockImage,
  writable: true,
});

if (!HTMLCanvasElement.prototype.setPointerCapture) {
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
}
