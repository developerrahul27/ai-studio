This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Install:
- pnpm: `pnpm install`
- npm: `npm install`
- yarn: `yarn`

Run dev server:
- pnpm: `pnpm dev`
- npm: `npm run dev`
- yarn: `yarn dev`
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


Testing (suggested setup):
- Unit/Component: Add Jest + React Testing Library or Vitest
- E2E: Add Playwright or Cypress

Example Playwright setup (optional):
- `pnpm add -D @playwright/test` (or npm/yarn equivalent)
- `npx playwright install`
- Add script: `"test:e2e": "playwright test"`
- Run: `pnpm test:e2e`

## Design Notes

- Color palette (max 5 colors)
  - Primary: sky-600
  - Accent: emerald-500
  - Neutrals: white, slate-900, slate-300
- Typography
  - Geist Sans for body and UI
  - Geist Mono available for code/mono
- Layout
  - Mobile-first, fully responsive
  - Flex layout with gap utilities; no absolute positioning for structure
  - Constrained image containers using `object-contain` to show full image within limited height
- Accessibility
  - Semantic elements, aria-labels, sr-only where necessary
  - Focus-visible rings (no harsh black borders)
  - Sufficient color contrast for text and controls

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
