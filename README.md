This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Reflections

Chrome surfaces are image-based. `src/three/create-scene.ts` bakes Three.js `RoomEnvironment` into a PMREM cubemap and sets it as `scene.environment` — the default reflection for every `MeshStandardMaterial`.

As for the material itself: the chrome look is `src/three/chrome.ts` (`createChromeMaterial` / `applyChrome`): metalness 1, roughness 0, high `envMapIntensity`, though you can play with the params in the debug panel. 
Those materials go on the wordmark (`src/three/load-text.ts`), hero star field (`src/three/star-field.ts`), and chrome-stars model (`src/three/load-stars.ts`).

On the hero canvas (`src/components/underworld-text.tsx`), a live webcam can override that default, so basically the material itself is a fallback. `src/three/webcam-env.ts` paints the camera onto a screen inside a cubemap room and renders it with a `CubeCamera`; each frame `applyChrome` assigns that cubemap as the material `envMap`. Mix, intensity, and related knobs live in `src/debug/params.ts` (webcam is off on mobile). The menu chrome-stars scene uses RoomEnvironment only — it never passes a webcam `envMap`.

## Debug

Append `/#debug` in the end of the url to trigger the debug panel.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
