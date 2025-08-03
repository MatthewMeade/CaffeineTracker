# lesspresso Web App: Developer Specification

## 1. Introduction

This document provides a comprehensive technical specification for the
lesspresso web application. The application is a modern, full-stack
solution built with Next.js, designed to help users monitor their daily caffeine
intake. It features a sophisticated authentication system supporting both
registered and guest users, a dynamic and interactive UI for logging and
visualizing data, and a robust backend powered by tRPC.

## 2. Core Features & User Experience

### 2.1 Authentication & User Flow

The application provides two distinct user experiences, ensuring immediate
usability for new visitors while offering data persistence for registered
users.

**Anonymous Guest Users:**

*   Upon first visit, an anonymous guest session is automatically created,
    allowing immediate access to all features.
*   All data (entries, favorites, limits) is tracked and associated with this
    temporary guest account.
*   A clear path is provided for guests to sign in and permanently save their
    data.

**Email-Based Authentication:**

*   Users can register or sign in using a passwordless, magic link system.
*   Upon successful sign-in, any existing data from a guest session is
    seamlessly and atomically migrated to the authenticated user's account.
*   The original guest account is then securely deleted.

### 2.2 Dashboard & Main Interface

The application is centered around a single, dynamic "Daily View" that serves
as the main dashboard.

*   **Caffeine Gauge:** A central, animated gauge provides an at-a-glance
    visualization of the total caffeine consumed relative to the user's daily
    limit. The gauge changes color to indicate proximity to or exceeding the
    limit.
*   **Entry Form:** A smart input field allows users to either search for their
    favorite drinks or manually enter a specific caffeine amount. The UI
    dynamically adapts to show a "drink name" field when a manual amount is
    entered.
*   **Quick-Add Favorites:** A grid displays the user's top six favorite
    drinks, enabling one-click logging of frequent entries.
*   **Collapsible Daily Timeline:** A chronological list of the current day's
    entries, grouped by time of day (Morning, Afternoon, Evening). It is
    collapsed by default to show a summary of the most recent entry and total
    entry count.

### 2.3 Favorites Management

A dedicated modal interface allows users to manage a personal library of
frequently consumed drinks.

*   **Full CRUD Functionality:** Users can add, update, and delete their
    favorite drinks.
*   **Customization:** Each favorite includes a name, `caffeineMg`, and a
    user-selectable icon (emoji) for easy identification.
*   **Integration:** The favorites list directly powers the quick-add grid and
    search suggestions, streamlining the logging process.

### 2.4 Historical View

The application provides a detailed and interactive historical data
visualization integrated into the main dashboard.

*   **Bar Chart:** A stacked bar chart displays daily caffeine intake. Bars are
    color-coded to distinguish consumption within the daily limit versus
    overage.
*   **Timeframe Filters:** Users can filter the chart view by 7 days, 30 days,
    or a custom date range.
*   **Interactive Day Details:** Clicking a bar on the chart reveals a detailed,
    editable timeline of all entries for that specific day, allowing users to
    review, modify, or delete past entries.

### 2.5 Daily Caffeine Limit

*   **Configuration:** Users can set their personal daily caffeine limit (in
    mg).
*   **Historical Application:** The correct historical limit is applied to each
    day in the historical view, ensuring accurate visualization even if the
    user's limit has changed over time.

### 2.6 User Account & Settings

*   **Settings Access:** Users can access a settings area to manage their
    account.
*   **Functionality:**
    *   Change the daily caffeine limit.
    *   Export all user data to a CSV file.
    *   Delete their account and all associated data.

## 3. Technical Architecture

*   **Framework:** Next.js 15+ with App Router
*   **Backend API:** tRPC
*   **Database ORM:** Prisma
*   **Database:** SQLite (for development and testing)
*   **Authentication:** NextAuth.js v5 (Auth.js)
*   **Styling:** Tailwind CSS
*   **UI Components:** shadcn/ui
*   **Animations:** Framer Motion
*   **State Management:** React Query (via tRPC) for server state; React hooks
    for local state.
*   **Validation:** Zod for schema validation on API inputs.

## 4. Data Model (Prisma Schema)

*   **User:** Stores user information. `email` is nullable to support guest
    accounts, identified by an `isGuest` flag.
*   **UserFavorite:** Represents a user's saved drinks for quick access.
    Includes `name`, `icon`, and `caffeineMg`.
*   **CaffeineEntry:** A self-contained record of a single caffeine dose. It
    uses a snapshot model, storing the `name`, `caffeineMg`, and `icon` at the
    time of logging to ensure historical data integrity.
*   **UserDailyLimit:** A historical log of a user's daily limits, each with an
    `effectiveFrom` timestamp.
*   **Account, Session, VerificationToken:** Standard NextAuth.js models
    required by the Prisma adapter.

## 5. Authentication Flow

*   **Guest Creation:** A custom NextAuth.js `CredentialsProvider`
    automatically creates an anonymous `User` record (`isGuest: true`) on a
    user's first visit.
*   **Data Linking:** When a guest user signs in via the magic link provider, a
    client-side component triggers a secure API endpoint (`/api/auth/link-guest`).
    This endpoint executes a database transaction to re-associate all of the
    guest's data (`CaffeineEntry`, `UserFavorite`, etc.) with the newly
    authenticated `User` record before deleting the original guest record.

## 6. API (tRPC Procedures)

All procedures are protected and require a valid session (either guest or
authenticated).

*   `user` router
    *   `me`: Fetches profile data for the current user.
*   `settings` router
    *   `getLimit`: Retrieves the current and historical daily limits.
    *   `setLimit`: Sets a new daily caffeine limit, effective immediately.
*   `favorites` router
    *   `getAll`: Retrieves all favorites for the user.
    *   `add`: Adds a new favorite drink.
    *   `update`: Updates an existing favorite drink.
    *   `remove`: Removes a favorite drink.
*   `entries` router
    *   `create`: Creates a new caffeine entry.
    *   `update`: Updates an existing entry.
    *   `delete`: Deletes an entry.
    *   `list`: Gets a paginated list of all historical entries.
    *   `getDaily`: Gets all entries for a specific day.
    *   `getSuggestions`: Gets drink suggestions from favorites and entry
        history.
    *   `getGraphData`: Gets aggregated daily totals for the historical bar
        chart.

## 7. Error Handling Strategy

*   **API:** `TRPCError` is used for consistent, typed error responses.
*   **Validation:** Zod schemas on all tRPC inputs provide robust validation
    and clear error messages.
*   **Database:** A `withDbErrorHandling` utility wraps database calls to
    catch common Prisma errors (e.g., unique constraint violations) and convert
    them into appropriate `TRPCError` responses.

## 8. Testing Strategy

*   **Framework:** Vitest with JSDOM for the test environment.
*   **Methodology:** A combination of unit and integration tests are co-located
    with their respective source files.
*   **Component Testing:** React Testing Library is used for testing UI
    components and user interactions.
*   **Database:** Tests run against an isolated, in-memory SQLite database that
    is reset for each test file.
*   **Mocking:** `vi.mock` is used to mock dependencies such as tRPC hooks,
    NextAuth, and environment variables.

## 9. Development Standards

*   **TypeScript:** The project enforces strict TypeScript rules.
*   **Code Quality:** ESLint and Prettier are configured to maintain consistent
    code style and quality.
*   **File Structure:** Test files are co-located with the source files they
    are testing.
*   **Environment Variables:** Managed and validated using `@t3-oss/env-nextjs`.