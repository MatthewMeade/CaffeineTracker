# Caffeine Tracker Web App - Development Checklist

## Phase 0: Project Setup & Authentication Refactor

### Chunk 0.1: Switch to PostgreSQL
-   [ ] **Step 0.1.1 (Code - Prisma):** Update `prisma/schema.prisma` datasource provider to `postgresql`.
-   [ ] **Step 0.1.2 (Config - Env):** Update `DATABASE_URL` in `.env.example` to a PostgreSQL connection string placeholder.
-   [ ] **Step 0.1.2 (Config - Local Env):** Configure local `.env` file with a valid PostgreSQL connection string.
-   [ ] **Step 0.1.3 (Setup - Infra):** Ensure Docker (or local PostgreSQL instance) is running and accessible.
-   [ ] **Step 0.1.4 (DB - Prisma):** Run `prisma migrate dev --name init_postgres` to apply schema changes and initialize the database.
-   [ ] **Step 0.1.4 (Test):** Verify database connection and that initial migration was successful (e.g., check DB tables).

### Chunk 0.2: Update NextAuth.js Configuration
-   [ ] **Step 0.2.1 (Code - NextAuth):** Remove `DiscordProvider` import and usage from `src/server/auth/config.ts`.
-   [ ] **Step 0.2.1 (Code - Env Schema):** Remove `AUTH_DISCORD_ID` and `AUTH_DISCORD_SECRET` from `src/env.js` (server schema and runtimeEnv).
-   [ ] **Step 0.2.1 (Config - Env Example):** Remove Discord auth variables from `.env.example`.
-   [ ] **Step 0.2.1 (Test - Conceptual):** Review `authConfig.providers` and `env.js` to confirm removal.
-   [ ] **Step 0.2.2 (Code - NextAuth):** Add `EmailProvider` from `next-auth/providers/email` to `src/server/auth/config.ts`.
-   [ ] **Step 0.2.2 (Code - NextAuth):** Configure `EmailProvider` with server options pointing to new environment variables.
-   [ ] **Step 0.2.2 (Test - Conceptual):** Verify `EmailProvider` is in `authConfig.providers` and configured correctly.
-   [ ] **Step 0.2.3 (Code - Env Schema):** Add `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM` to `src/env.js` (server schema and runtimeEnv) with Zod validation.
-   [ ] **Step 0.2.3 (Config - Env Example):** Add new email environment variables to `.env.example` with placeholders.
-   [ ] **Step 0.2.3 (Config - Local Env):** Populate email environment variables in local `.env` (e.g., using Ethereal for dev).
-   [ ] **Step 0.2.3 (Test - Conceptual):** Verify `env.js` schema for new email variables.

### Chunk 0.3: Update Prisma User Model & Clean Up
-   [ ] **Step 0.3.1 (Code - Prisma):** Modify `User` model in `prisma/schema.prisma`:
    -   [ ] `id` to `String @id @default(uuid())`.
    -   [ ] `email` to `String @unique` (non-nullable).
    -   [ ] Keep `name String?`.
    -   [ ] Keep `emailVerified DateTime?`.
    -   [ ] Keep `image String?`.
    -   [ ] Add `created_at DateTime @default(now())`.
    -   [ ] Add `updated_at DateTime @updatedAt`.
    -   [ ] Ensure `Account` and `Session` relations are maintained.
-   [ ] **Step 0.3.2 (Code - Prisma):** Remove `Post` model definition from `prisma/schema.prisma`.
-   [ ] **Step 0.3.2 (Code - Prisma):** Remove `posts Post[]` relation from `User` model.
-   [ ] **Step 0.3.3 (DB - Prisma):** Run `prisma generate`.
-   [ ] **Step 0.3.3 (DB - Prisma):** Run `prisma migrate dev --name update_user_remove_post`.
-   [ ] **Step 0.3.3 (Test):** Verify schema changes in the database.
-   [ ] **Step 0.3.4 (Code - tRPC):** Delete `src/server/api/routers/post.ts`.
-   [ ] **Step 0.3.4 (Code - tRPC):** Remove `postRouter` import and usage from `src/server/api/root.ts`.
-   [ ] **Step 0.3.4 (Test - Conceptual):** Verify `appRouter` no longer includes `postRouter`.
-   [ ] **Step 0.3.5 (Code - Component):** Delete `src/app/_components/post.tsx`.
-   [ ] **Step 0.3.5 (Code - Page):** In `src/app/page.tsx`:
    -   [ ] Remove `LatestPost` import.
    -   [ ] Remove `api.post.getLatest.prefetch()` call.
    -   [ ] Remove `<LatestPost />` usage.
    -   [ ] Remove `api.post.hello` call and its display.
-   [ ] **Step 0.3.5 (Test - Conceptual):** Verify `page.tsx` is cleaned of Post-related elements.
-   [ ] **Step 0.3.6 (Code - Page):** Update `src/app/page.tsx` for basic auth UI:
    -   [ ] Fetch `session` using `await auth()`.
    -   [ ] If `session` (logged in): Display welcome message with email and "Sign out" link to `/api/auth/signout`.
    -   [ ] If no `session` (logged out): Display "Sign in with Email" section with placeholder for email form.
    -   [ ] Remove T3 boilerplate.
-   [ ] **Step 0.3.6 (Test - UI):** Manually check `page.tsx` renders correctly for logged-in/logged-out states (placeholder form).

### Chunk 0.4: Basic Auth UI & Testing
-   [ ] **Step 0.4.1 (Code - Component):** Create `src/app/_components/SignInForm.tsx`.
    -   [ ] Include email input and "Send Magic Link" button.
    -   [ ] Use `useState` for email input.
    -   [ ] On submit, call `signIn('email', { email: <value>, redirect: false })`.
    -   [ ] Import `signIn` from `next-auth/react`.
    -   [ ] Display "Magic link sent!" message on success.
    -   [ ] Add basic form validation.
-   [ ] **Step 0.4.1 (Code - Page):** In `src/app/page.tsx`, import and use `SignInForm` when user is not logged in.
-   [ ] **Step 0.4.1 (Code - Page):** Ensure "Sign out" link remains functional.
-   [ ] **Step 0.4.1 (Test - Component):** Write React Testing Library tests for `SignInForm.tsx`.
    -   [ ] Renders elements.
    -   [ ] Input works.
    -   [ ] `signIn` called correctly.
    -   [ ] Confirmation message displayed.
-   [ ] **Step 0.4.2 (Test - E2E):** Manually test the full Magic Email Link flow:
    -   [ ] Enter email, click "Send Magic Link".
    -   [ ] Check email (Ethereal or actual SMTP) for the link.
    -   [ ] Click magic link and verify successful sign-in.
    -   [ ] Verify user email is displayed.
    -   [ ] Click "Sign out" and verify session is cleared.

## Phase 1: Core Data Models & Basic Caffeine Logging

### Chunk 1.1: Define Core Prisma Models
-   [ ] **Step 1.1.1 (Code - Prisma):** Add `Drink` model to `prisma/schema.prisma` with specified fields, types, relations, and `@@unique` constraint.
    -   [ ] `id`, `name`, `caffeine_mg_per_ml` (`Decimal @db.Decimal(10,4)`), `base_size_ml` (`Decimal? @db.Decimal(10,2)`).
    -   [ ] `created_by_user_id` (`String?`), `createdByUser` relation (`User? @relation("UserCreatedDrinks", ...)`).
    -   [ ] `created_at`, `updated_at`.
    -   [ ] `caffeineEntries` relation (`CaffeineEntry[]`).
    -   [ ] `@@unique([name, caffeine_mg_per_ml, base_size_ml])`.
-   [ ] **Step 1.1.1 (Code - Prisma):** Add `CaffeineEntry` model to `prisma/schema.prisma` with specified fields, types, and relations.
    -   [ ] `id`, `user_id`, `user` relation, `drink_id` (`String?`), `drink` relation (`Drink?`).
    -   [ ] `caffeine_mg` (`Decimal @db.Decimal(10,2)`), `consumed_at` (`DateTime`), `created_at`.
    -   [ ] `@@index([user_id])`, `@@index([consumed_at])`.
-   [ ] **Step 1.1.1 (Code - Prisma):** Add `UserDailyLimit` model to `prisma/schema.prisma` with specified fields, types, and relations.
    -   [ ] `id`, `user_id`, `user` relation.
    -   [ ] `limit_mg` (`Decimal @db.Decimal(10,2)`), `effective_from` (`DateTime @default(now())`), `created_at`.
    -   [ ] `@@unique([user_id, effective_from])`, `@@index([user_id])`.
-   [ ] **Step 1.1.1 (Code - Prisma):** Update `User` model to include new relations:
    -   [ ] `caffeineEntries CaffeineEntry[]`.
    -   [ ] `dailyLimits UserDailyLimit[]`.
    -   [ ] `createdDrinks Drink[] @relation("UserCreatedDrinks")`.
-   [ ] **Step 1.1.2 (DB - Prisma):** Run `prisma generate`.
-   [ ] **Step 1.1.2 (DB - Prisma):** Run `prisma migrate dev --name add_core_models`.
-   [ ] **Step 1.1.2 (Test):** Verify new tables and relations in the database.

### Chunk 1.2: User Onboarding - Initial Daily Limit
-   [ ] **Step 1.2.1 (Code - tRPC):** Create `userRouter.ts` in `src/server/api/routers/`.
-   [ ] **Step 1.2.1 (Code - tRPC):** Define protected procedure `userRouter.getSettings`.
    -   [ ] Query `UserDailyLimit` for current user.
    -   [ ] Return `{ currentLimitMg: number | null, hasSetLimit: boolean }`.
-   [ ] **Step 1.2.1 (Code - tRPC):** Add `userRouter` to `appRouter` in `src/server/api/root.ts`.
-   [ ] **Step 1.2.1 (Test - Backend):** Write unit tests for `userRouter.getSettings`.
    -   [ ] User with no limits.
    -   [ ] User with one limit.
    -   [ ] User with multiple limits (if applicable for "most recent" logic).
-   [ ] **Step 1.2.2 (Code - tRPC):** Define protected procedure `userRouter.setInitialDailyLimit`.
    -   [ ] Input: `z.object({ limit_mg: z.number().positive() })`.
    -   [ ] Create new `UserDailyLimit` record.
    -   [ ] Return `{ success: true, limit: { id, limit_mg, effective_from } }`.
-   [ ] **Step 1.2.2 (Test - Backend):** Write unit tests for `userRouter.setInitialDailyLimit`.
    -   [ ] Valid input, no prior limits.
    -   [ ] Invalid input.
-   [ ] **Step 1.2.3 (Code - Component):** Create `src/app/_components/OnboardingLimitForm.tsx`.
    -   [ ] Props: `onLimitSet` callback.
    -   [ ] UI: Number input for limit, "Save Limit" button.
    -   [ ] State for input value.
    -   [ ] On submit, call `api.user.setInitialDailyLimit.mutate`.
    -   [ ] Handle `onSuccess` (call `onLimitSet`), `onError`.
    -   [ ] Client-side input validation.
-   [ ] **Step 1.2.3 (Code - Page):** Modify `src/app/page.tsx`.
    -   [ ] If logged in, call `api.user.getSettings.useQuery()`.
    -   [ ] If `data?.hasSetLimit` is `false`, render `OnboardingLimitForm`.
    -   [ ] Pass `onLimitSet` callback to refetch/update UI.
    -   [ ] If `data?.hasSetLimit` is `true`, show main app placeholder.
-   [ ] **Step 1.2.3 (Test - Component):** Write React Testing Library tests for `OnboardingLimitForm.tsx`.
-   [ ] **Step 1.2.3 (Test - UI):** Manually test onboarding flow: new user sees form, submits, form disappears, main app placeholder shows.
-   [ ] **Step 1.2.4 (Test - tRPC):** Manually test `getSettings` and `setInitialDailyLimit` tRPC procedures (e.g. via UI or API client).

### Chunk 1.3: Direct Caffeine Logging (mg)
-   [ ] **Step 1.3.1 (Code - tRPC):** Create `caffeineEntryRouter.ts` in `src/server/api/routers/`.
-   [ ] **Step 1.3.1 (Code - tRPC):** Define protected procedure `caffeineEntryRouter.create`.
    -   [ ] Input: `z.object({ caffeine_mg: z.number().positive(), consumed_at: z.date() })`.
    -   [ ] Create new `CaffeineEntry`.
    -   [ ] Return `{ success: true, entry: { id, caffeine_mg, consumed_at, ... } }`. (Simplified response for now).
-   [ ] **Step 1.3.1 (Code - tRPC):** Add `caffeineEntryRouter` to `appRouter`.
-   [ ] **Step 1.3.1 (Test - Backend):** Write unit tests for `caffeineEntryRouter.create`.
    -   [ ] Valid input.
    -   [ ] Invalid input.
-   [ ] **Step 1.3.2 (Code - Component):** Create `src/app/_components/CaffeineLogForm.tsx`.
    -   [ ] UI: Inputs for "Caffeine Amount (mg)", "Consumption Date", "Consumption Time", "Log Entry" button.
    -   [ ] Default date/time to current.
    -   [ ] State for inputs.
    -   [ ] On submit, combine date/time, call `api.caffeineEntry.create.mutate`.
    -   [ ] Handle `onSuccess` (clear form, success message, trigger refetch), `onError`.
    -   [ ] Client-side validation.
-   [ ] **Step 1.3.2 (Code - Page):** In `src/app/page.tsx`, if user onboarded, render `CaffeineLogForm`.
-   [ ] **Step 1.3.2 (Test - Component):** Write React Testing Library tests for `CaffeineLogForm.tsx`.
-   [ ] **Step 1.3.3 (Test - tRPC):** Manually test `caffeineEntry.create` tRPC procedure via UI.

### Chunk 1.4: Display Today's Entries & Total
-   [ ] **Step 1.4.1 (Code - tRPC):** Define protected procedure `caffeineEntryRouter.getForDay`.
    -   [ ] Input: `z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })`.
    -   [ ] Query `CaffeineEntry` for user and date (start to end of day, UTC).
    -   [ ] Calculate `daily_total_mg`.
    -   [ ] Return `{ entries: [CaffeineEntryObject], daily_total_mg: number }` (Simplified response). Entries ordered by `consumed_at`.
-   [ ] **Step 1.4.1 (Test - Backend):** Write unit tests for `caffeineEntryRouter.getForDay`.
    -   [ ] User has entries on date.
    -   [ ] User has no entries on date.
    -   [ ] Invalid date format.
    -   [ ] Date boundary conditions (e.g. entries near midnight).
-   [ ] **Step 1.4.2 & 1.4.3 & 1.4.4 (Code - Component):** Create `src/app/_components/DailyEntriesList.tsx`.
    -   [ ] Get current date string.
    -   [ ] Call `api.caffeineEntry.getForDay.useQuery({ date: currentDateString })`.
    -   [ ] Handle loading/error states.
    -   [ ] Display "Today's Total Caffeine: {data.daily_total_mg} mg".
    -   [ ] Render list of entries (time, amount).
-   [ ] **Step 1.4.2 & 1.4.3 & 1.4.4 (Code - Page):** In `src/app/page.tsx`, if user onboarded, render `DailyEntriesList`.
-   [ ] **Step 1.4.2 & 1.4.3 & 1.4.4 (Code - Component):** `CaffeineLogForm` `onSuccess` should call `utils.caffeineEntry.getForDay.invalidate()`.
-   [ ] **Step 1.4.2 & 1.4.3 & 1.4.4 (Test - Component):** Write React Testing Library tests for `DailyEntriesList.tsx`.
    -   [ ] Loading/error states.
    -   [ ] Data loaded: correct total and list of entries.
    -   [ ] No entries message.
-   [ ] **Step 1.4.2 & 1.4.3 & 1.4.4 (Test - UI):** Manually test logging an entry and seeing the list and total update.
-   [ ] **Step 1.4.5 (Test - tRPC):** Manually test `caffeineEntry.getForDay` tRPC procedure.
