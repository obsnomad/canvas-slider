import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import CanvasSlider from './CanvasSlider.vue';

const items = ['/images/image-1.jpg', '/images/image-2.jpg', '/images/image-3.jpg'];

async function dispatchPointer(
  element: Element,
  type: string,
  pointerId: number,
  clientX: number,
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  Object.defineProperty(event, 'clientX', { value: clientX });
  element.dispatchEvent(event);
  await nextTick();
}

describe('CanvasSlider', () => {
  it('renders a canvas element', () => {
    const wrapper = mount(CanvasSlider, {
      props: { items },
    });

    expect(wrapper.find('canvas').exists()).toBe(true);
  });

  it('does not trigger snap animation when snap=false', async () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
    const wrapper = mount(CanvasSlider, {
      props: { items, snap: false },
    });
    const canvas = wrapper.get('canvas').element;

    await dispatchPointer(canvas, 'pointerdown', 1, 300);
    await dispatchPointer(canvas, 'pointermove', 1, 120);
    await dispatchPointer(canvas, 'pointerup', 1, 120);

    expect(rafSpy).not.toHaveBeenCalled();
    rafSpy.mockRestore();
  });

  it('triggers snap animation when snap=true', async () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      return setTimeout(() => cb(performance.now()), 0) as unknown as number;
    });

    const wrapper = mount(CanvasSlider, {
      props: { items, snap: true },
    });
    const canvas = wrapper.get('canvas').element;

    await dispatchPointer(canvas, 'pointerdown', 2, 300);
    await dispatchPointer(canvas, 'pointermove', 2, 120);
    await dispatchPointer(canvas, 'pointerup', 2, 120);

    expect(rafSpy).toHaveBeenCalled();
    rafSpy.mockRestore();
  });
});
