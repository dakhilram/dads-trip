# Dad's Trip

A mobile-friendly expense splitter for one trip. It stores data in Cloud Firestore, calculates each member's contribution and share precisely to the paise, and shows the minimum transfers needed to settle up.

## What it does

- Add, edit, and delete trip expenses.
- Select the payer and every person included in a split.
- Read members from `trips/dad-trip` in Firestore, with the original five-member list as a fallback.
- Show total spend, each member's spend/share/net balance, and settlement instructions.
- Support existing Firestore timestamp dates and older ISO-string dates.

## Local development

```bash
npm install
npm run dev
```

The current Firebase project configuration is retained as a fallback so the existing app continues to work. For another project, copy `.env.example` to `.env.local`, supply its Firebase web configuration, and restart Vite. Do not commit `.env.local`.

Useful checks:

```bash
npm run lint
npm run build
```

## Firestore data model

```text
trips/dad-trip
  members: ["Venu", "Brahmam", "SVR", "Ravi", "PLR"]

trips/dad-trip/expenses/{expenseId}
  amount: number
  paidBy: string
  splitAmong: string[]
  notes: string
  date: Firestore server timestamp
  createdAt: Firestore server timestamp
  updatedAt: Firestore server timestamp (after edits)
```

## Firebase security

The Firebase client configuration is public by design; it is not a database access control mechanism. Before sharing the app broadly, enable Firebase Authentication and publish Firestore rules that require an authenticated user and restrict writes to valid data. Do not rely on open Firestore rules for a public deployment.

## GitHub Pages deployment

The Vite base path is configured for this repository: `/dads-trip/`.

```bash
npm run deploy
```

This builds the app and publishes the generated `dist` directory to `gh-pages`. Keep source code on `main`; `gh-pages` should contain only the generated site.

## First GitHub source push

This local repository is linked to `https://github.com/dakhilram/dads-trip.git`, but the remote currently has only `gh-pages`. After reviewing the changes:

```bash
git add .
git commit -m "Upgrade Dad's Trip expense tracker"
git push -u origin main
```

Then use `npm run deploy` to update the GitHub Pages site.
