# canvas-slider

Image slider implemented with Vue + Canvas API.

## Assignment Coverage

- Slider is rendered in a single `<canvas>` element (`src/components/CanvasSlider.vue`).
- Uses four images with mixed dimensions (`public/images/0.jpg` to `public/images/3.jpg`).
- Supports drag interaction to change images.
- Built release is included in `dist/` and can be served as static files.
- Additional controls to snap slides (optional).

## Browser Support

Verified on latest:

- Chrome
- Firefox
- Chrome Mobile

## Setup

```sh
npm install
```

## Development

```sh
npm run dev
```

## Quality Checks

```sh
npm run lint
npm run test
```

## Build

```sh
npm run build
```

## Run Built Release (static server)

```sh
npx nws dist
```

Alternative:

```sh
npx serve dist
```
