# GoodTerms

An AI-powered web app to track shared expenses and debts among friends.

## Tech Stack

- **Frontend:** Next.js (App Router) with React and TypeScript
- **Styling:** Tailwind CSS + PostCSS
- **Backend / API:** Next.js Route Handlers (server-side TypeScript)
- **Database:** PostgreSQL via Prisma ORM
- **AI:** OpenAI API

## Dev & Run

- Install dependencies: `npm install`
- Run development server: `npm run dev`
- Prisma schema: [prisma/schema.prisma](prisma/schema.prisma)

## Notes

- This project uses Next.js server-side route handlers in `app/api/*/route.ts` and Prisma for database access. Docker compose is included for local DB if you prefer containerized Postgres.
