<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    items: string[];
    snap?: boolean;
  }>(),
  {
    snap: false,
  },
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const wrapperRef = ref<HTMLDivElement | null>(null);

const currentIndex = ref(0);
const viewportWidth = ref(0);
const viewportHeight = ref(0);
const dragOffset = ref(0);
const isDragging = ref(false);
const pointerId = ref<number | null>(null);
const dragStartX = ref(0);
const dragStartOffset = ref(0);
const animationFrame = ref<number | null>(null);
const resizeObserver = ref<ResizeObserver | null>(null);
const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement | null>>();

const slideCount = computed(() => props.items.length);

function clampIndex(index: number) {
  if (slideCount.value === 0) return 0;
  return Math.max(0, Math.min(index, slideCount.value - 1));
}

function getTrackOffset() {
  return -currentIndex.value * viewportWidth.value + dragOffset.value;
}

function normalizeTrackOffset(trackOffset: number) {
  if (viewportWidth.value <= 0) return;
  const nextIndex = clampIndex(Math.round(-trackOffset / viewportWidth.value));
  currentIndex.value = nextIndex;
  dragOffset.value = trackOffset + nextIndex * viewportWidth.value;
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, x: number, width: number) {
  const styles = getComputedStyle(wrapperRef.value ?? document.documentElement);

  ctx.fillStyle = styles.getPropertyValue('--slider-loading-text-color').trim();
  const fontFamily = styles.getPropertyValue('--font-family-primary').trim();
  ctx.font = `${Math.max(14, Math.floor(viewportWidth.value * 0.03))}px ${fontFamily}, sans-serif`;
  ctx.textAlign = 'center';

  ctx.fillText('Loading...', x + width / 2, viewportHeight.value / 2);
}

function ensureImageLoaded(src: string): Promise<HTMLImageElement | null> {
  const cachedImage = imageCache.get(src);
  if (cachedImage) return Promise.resolve(cachedImage);

  const existingPromise = loadingPromises.get(src);
  if (existingPromise) return existingPromise;

  const imagePromise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    let settled = false;

    img.onload = () => {
      if (settled) return;
      settled = true;
      if (img) {
        imageCache.set(src, img);
      }
      loadingPromises.delete(src);
      resolve(img);
    };

    img.onerror = () => {
      loadingPromises.delete(src);
      resolve(null);
    };

    img.src = src;
  });

  loadingPromises.set(src, imagePromise);
  return imagePromise;
}

function preloadVisibleImages() {
  if (slideCount.value === 0) return;
  const center = currentIndex.value;
  for (let i = center - 1; i <= center + 1; i += 1) {
    const idx = clampIndex(i);
    const src = props.items[idx];
    if (src) void ensureImageLoaded(src);
  }
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  width: number,
  height: number,
) {
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;

  const scale = Math.min(width / iw, height / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (width - dw) / 2;
  const dy = (height - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas || viewportWidth.value === 0 || viewportHeight.value === 0) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, viewportWidth.value, viewportHeight.value);

  const baseX = -currentIndex.value * viewportWidth.value + dragOffset.value;
  for (let i = 0; i < slideCount.value; i += 1) {
    const x = baseX + i * viewportWidth.value;
    if (x + viewportWidth.value < 0 || x > viewportWidth.value) continue;

    const src = props.items[i];
    const loadedImage = imageCache.get(src);

    if (loadedImage) {
      drawImageContain(ctx, loadedImage, x, viewportWidth.value, viewportHeight.value);
    } else {
      ensureImageLoaded(src).then((image) => {
        if (!image) return;
        draw();
      });
      drawPlaceholder(ctx, x, viewportWidth.value);
    }
  }
}

function updateCanvasSize() {
  const canvas = canvasRef.value;
  const wrapper = wrapperRef.value;
  if (!canvas || !wrapper) return;

  const rect = wrapper.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  viewportWidth.value = Math.max(1, Math.floor(rect.width));
  viewportHeight.value = Math.max(1, Math.floor(rect.height));

  canvas.width = Math.floor(viewportWidth.value * dpr);
  canvas.height = Math.floor(viewportHeight.value * dpr);
  canvas.style.width = `${viewportWidth.value}px`;
  canvas.style.height = `${viewportHeight.value}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function stopAnimation() {
  if (animationFrame.value !== null) {
    cancelAnimationFrame(animationFrame.value);
    animationFrame.value = null;
  }
}

function animateToSlide(index: number) {
  stopAnimation();

  const targetIndex = clampIndex(index);
  const targetOffset = -targetIndex * viewportWidth.value;
  let currentOffset = -currentIndex.value * viewportWidth.value + dragOffset.value;

  const tick = () => {
    const delta = targetOffset - currentOffset;
    currentOffset += delta * 0.18;

    if (Math.abs(delta) < 0.8) {
      currentIndex.value = targetIndex;
      dragOffset.value = 0;
      draw();
      animationFrame.value = null;
      return;
    }

    const base = -currentIndex.value * viewportWidth.value;
    dragOffset.value = currentOffset - base;
    draw();
    animationFrame.value = requestAnimationFrame(tick);
  };

  animationFrame.value = requestAnimationFrame(tick);
}

function onPointerDown(event: PointerEvent): void {
  if (!canvasRef.value || slideCount.value <= 1) return;

  canvasRef.value.setPointerCapture(event.pointerId);
  pointerId.value = event.pointerId;
  isDragging.value = true;
  dragStartX.value = event.clientX;
  dragStartOffset.value = dragOffset.value;
  stopAnimation();
}

function onPointerMove(event: PointerEvent): void {
  if (!isDragging.value || pointerId.value !== event.pointerId) return;

  const delta = event.clientX - dragStartX.value;
  const minOffset = -(slideCount.value - 1 - currentIndex.value) * viewportWidth.value;
  const maxOffset = currentIndex.value * viewportWidth.value;
  const nextOffset = delta + dragStartOffset.value;
  dragOffset.value = Math.max(minOffset, Math.min(nextOffset, maxOffset));
  draw();
}

function onPointerUp(event: PointerEvent): void {
  if (!isDragging.value || pointerId.value !== event.pointerId) return;

  isDragging.value = false;
  pointerId.value = null;

  const trackOffset = getTrackOffset();

  if (!props.snap) {
    normalizeTrackOffset(trackOffset);
    preloadVisibleImages();
    draw();
    return;
  }

  const targetIndex = clampIndex(Math.round(-trackOffset / viewportWidth.value));
  animateToSlide(targetIndex);
}

watch(
  () => props.items,
  () => {
    currentIndex.value = clampIndex(currentIndex.value);
    dragOffset.value = 0;
    preloadVisibleImages();
    draw();
  },
  { immediate: true },
);

watch(currentIndex, () => {
  preloadVisibleImages();
});

onMounted(() => {
  updateCanvasSize();
  preloadVisibleImages();
  draw();

  const wrapper = wrapperRef.value;
  if (wrapper) {
    resizeObserver.value = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.value.observe(wrapper);
  }
});

onBeforeUnmount(() => {
  stopAnimation();
  resizeObserver.value?.disconnect();
  resizeObserver.value = null;
});
</script>

<template>
  <div ref="wrapperRef" class="slider">
    <canvas
      ref="canvasRef"
      class="slider__canvas"
      @pointercancel="onPointerUp"
      @pointerdown="onPointerDown"
      @pointerleave="onPointerUp"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    />
  </div>
</template>

<style scoped>
.slider {
  --slider-loading-text-color: var(--color-text);
  width: min(50rem, 90vw);
  height: min(calc(100vh - 2rem), 35rem);
  margin: 0 auto;
  border: 1px solid var(--color-border);
  overflow: hidden;
  background: var(--color-background-soft);
}

.slider__canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: pan-y;
  cursor: grab;
}

.slider__canvas:active {
  cursor: grabbing;
}
</style>
