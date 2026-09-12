# GoodTerms

A modern web application to track shared expenses, calculate splits, and manage group debts. Designed with a focus on seamless onboarding and robust relational data management.

## Key Features

- **Hybrid Authentication & Guest Access:** Secure user sign-in via Clerk, paired with a custom frictionless "Guest Mode." Users can seamlessly join and participate in groups without creating an account by using a secure group PIN.
- **One-Click Demo:** A dedicated seeder that instantly generates a realistic "Weekend Trip" scenario (complete with dummy users and complex split transactions) for portfolio reviewers.
- **Smart Dashboard:** Responsive UI with real-time balance calculations showing exactly who owes whom.

## Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Backend / API:** Next.js Route Handlers (server-side TypeScript)
- **Database:** PostgreSQL via Prisma ORM
- **Authentication:** Clerk + Custom Guest ID System
- **Deployment:** Vercel

## Dev & Run

**1. Install dependencies:**

```bash
npm install

```

**2. Set up the database:**
Ensure your `.env` is configured. This project includes a `docker-compose.yml` if you prefer to run an isolated PostgreSQL container locally.

```bash
npx prisma db push

```

The production build does not seed the database. To seed the demo data, run
`npx prisma db seed` manually when needed.

**3. Run the development server:**

```bash
npm run dev

```

### Architecture Notes

This project heavily utilizes Next.js server-side route handlers (`app/api/*/route.ts`) for secure API endpoints. The database layer relies on Prisma to manage complex relational models (Groups ↔ Users ↔ Transactions ↔ Splits).
