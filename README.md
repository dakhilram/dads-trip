# Dad's Trip

Dad's Trip is a mobile-friendly expense splitter for **one active trip at a time**. Create the people for the trip, record expenses, settle up, and permanently reset everything before the next trip. It deliberately does not keep trip history.

## Features

- Add, rename, and remove participants stored as Firestore documents with stable IDs.
- Prevent duplicate participant names (case-insensitively) and prevent removal when a person is used by an expense.
- Add, edit, and delete expenses with equal, exact, or percentage splits.
- Store all new money values as integer paise and calculate balances/settlements without floating-point errors.
- Read prior name-based expenses while the current trip remains active.
- Start a new trip by explicitly deleting people, expenses, calculated-settlement records, and the active trip document.
- Export the current trip at any time as a downloadable PDF report or Excel-friendly CSV file.

## Firestore model

The single active trip lives under `trips/dad-trip`:

```text
trips/dad-trip
  people/{personId}
    name: string
    legacyNames: string[]
    createdAt: timestamp
    updatedAt: timestamp

  expenses/{expenseId}
    amountPaise: integer
    paidBy: personId
    participants: personId[]
    splitType: "equal" | "exact" | "percentage"
    exactAmountsPaise: { personId: integer }  # exact splits only
    percentageBps: { personId: integer }      # percentage splits only; 10,000 = 100%
    notes: string
    createdAt: timestamp
    updatedAt: timestamp

  settlements/{settlementId}
    # Reserved for any future persisted settlement records; cleared on reset.
```

Existing records using `amount`, `paidBy` as a name, and `splitAmong` as names remain readable. On load, the app creates people documents from legacy participant names when required. Their original names are retained in `legacyNames`, so renaming a person does not break legacy calculations. Creating or editing an expense writes the new ID-based format.

## Local development

```bash
npm install
npm run dev
npm run lint
npm run build
```

The checked-in Firebase web configuration keeps the existing project working. For another Firebase project, copy `.env.example` to `.env.local`, fill in its Firebase web configuration, and restart Vite. `.env.local` is ignored by Git.

## Privacy and Firestore access

Dad's Trip has **no authentication by design**: no sign-in, accounts, PINs, or user management. It is a private family-use application shared through its GitHub Pages URL.

Anyone who obtains that URL may be able to read or change the application data, depending on the Firestore rules configured for the Firebase project. The owner accepts this tradeoff for this private family-use application.

The Firebase client configuration is public by design and does not itself protect data. Configure Firestore rules consistently with this login-free access model. The reset feature needs delete permission for `people`, `expenses`, `settlements`, and the active trip document.

No Firestore composite index is currently required because the client loads the small active-trip collections and sorts them locally.

## Export Trip

Use **Export Trip** on the dashboard to download a PDF report or a single Excel-friendly CSV file. Both exports include summary totals, each participant's paid/owed/balance amounts, expenses and split details, and settlement suggestions. The PDF generator is loaded only when it is requested, keeping the main app load smaller.

The Start New Trip dialog also provides **Export PDF Before Reset**. It exports without resetting; Start New Trip remains a separate, explicit action.

## GitHub Pages

The Vite base is configured for `/dads-trip/`.

```bash
npm run deploy
```

Keep source on `main`; this command only publishes the generated `dist` site to `gh-pages`.
