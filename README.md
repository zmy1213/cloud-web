# cloud-web

`cloud-web` is a minimal frontend scaffold modeled after `kube-nova-web`.

## Tech stack

- Vue 3
- Vite
- TypeScript

## Quick start

```bash
cd cloud-web
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## API proxy (dev)

The dev server proxies these prefixes to local backend ports:

- `/portal` -> `http://127.0.0.1:8810`
- `/manager` -> `http://127.0.0.1:8811`
- `/console` -> `http://127.0.0.1:8818`
- `/workload` -> `http://127.0.0.1:8812`
