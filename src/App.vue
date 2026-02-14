<script lang="ts" setup>
import { ref } from 'vue';
import CanvasSlider from './components/CanvasSlider.vue';

const snap = ref(false);
</script>

<template>
  <main>
    <section>
      <CanvasSlider
        :items="[
          '/images/image-1.jpg',
          '/images/image-2.jpg',
          '/images/image-3.jpg',
          '/images/image-4.jpg',
        ]"
        :snap="snap"
      />
      <span class="note">Drag to change image</span>
      <label><input v-model="snap" type="checkbox" /> Enable slide snapping</label>
    </section>
  </main>
</template>

<style scoped>
main {
  width: 100%;
  padding: 1rem;
  display: flex;
  justify-content: center;
}

section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.note {
  color: var(--color-heading);
  font-size: 1.25rem;
}
</style>
