# Caffeine Tracker Web App: Developer Specification

---

## 1. Introduction

This document details the requirements and architectural choices for a caffeine tracking web application, built using Next.js. The application will allow users to log their daily caffeine intake, visualize consumption trends, manage a personalized and shared drink database, and configure personal limits.

---

## 2. Core Features & User Experience

* **Caffeine Logging:**
    * **Input Method:** Direct numerical input (mg) on the main screen, or by selecting a pre-defined drink.
    * **Timestamping:** Entries default to the current date and time (hour/minute granularity). The timestamp is editable by the user.
    * **Entry Management:** Users can **edit or delete** any historical caffeine entry. Edits include changing the time, name, and caffeine amount.

* **Daily View (Main Screen):**
    * Direct caffeine input field.
    * **Chronological list** of today's caffeine entries, displaying **drink name**, **amount (mg)**, and **time**.
    * **Prominent display** of the **current day's total caffeine consumed (mg)**.
    * **Daily Limit Indicator:** Shows **remaining caffeine allowance (mg)** or a clear "**Over Limit**" message.
    * **Navigation:** **Swipe functionality** to view previous/next days' entries.

* **Drink Management:**
    * **Selection:** Users can select from a pre-defined list of drinks to quickly populate a new entry.
    * **Search:** **Fuzzy search functionality** for existing drinks.
    * **Drink Types:** The system supports two types of drinks:
        * **Default Drinks:** Pre-populated global drinks available to all users (e.g., Coffee, Espresso, Tea).
        * **User-Created Drinks:** Private drinks created by individual users, only visible to the creator.
    * **Add New Drink Form:**
        * Accessed via an "Add" button if a drink isn't found in search.
        * **Mandatory Fields:** `name` (string), `caffeine_mg` (number), `size_ml` (number).
        * **Private Creation:** User-added drinks are private and only visible to the creating user.
        * **No Images:** No image upload functionality for drinks in this version.
    * **Logging with Drinks:** When a user selects an existing drink, it creates a single caffeine entry. To log multiple drinks, the user creates multiple entries.

* **Historical View:**
    * **Graph:** **Line graph** displaying **daily caffeine intake (mg)** since tracking began.
        * **Timeframe Filters:** Quick-select buttons for 1w (week), 1m (month), 3m (3 months), 1y (year).
        * **Limit Visualization:** Graph line for a given day changes color (e.g., green to red) if the day's total caffeine exceeded the active daily limit for that date.
    * **Full Log History:** Accessible via navigation bar.
        * **Infinite scrolling list** of all individual caffeine entries.
        * **Daily separators/headings** for chronological organization.

* **Daily Caffeine Limit:**
    * **Configuration:** Users set their personal daily caffeine limit (mg).
    * **Historical Application:** The limit is applied historically based on the setting **effective prior to that specific day**. Updates to the limit do not retroactively change previous days' limits. Each limit change will be timestamped.
        * **Onboarding:** Initial limit configuration is part of the user **onboarding process**.
        * **Settings Page:** Limit can be modified for future days via the "Settings" page.
        * **Warnings:**
            * **Pre-logging:** A warning will appear when entering an amount that, combined with existing entries, would push the user over their limit.
            * **Post-logging:** A dialog will pop up after saving an entry that results in exceeding the limit.
            * **Dashboard:** A persistent visual indicator on the dashboard.

* **User Account & Settings:**
    * **Navigation:** Accessible via a navigation bar icon.
    * **Settings Options:**
        * Change daily caffeine limit.
        * Account management: Option to **delete all user data**.
        * Account management: Option to **export all user data as a CSV**.

* **Data Export (CSV):**
    * **Content:** A comprehensive dump of all user data.
    * **Sheets/Sections:**
        * **User Drinks:** Contains all user-defined drinks.
        * **Log Entries:** All individual caffeine log entries.
        * **Daily Totals:** Summarized daily caffeine intake.

---

## 3. Technical Architecture

* **Frontend:** Next.js (React)
* **Backend/API:** tRPC with Next.js App Router
* **Database:** SQLite (for development and testing). The schema is managed with Prisma, allowing for other databases like PostgreSQL in production.
* **Authentication:** NextAuth.js (using Magic Email Links via Resend)

---

## 4. Data Model (Prisma Schema)

The database schema is defined using Prisma and consists of several related models to store user data, drinks, and caffeine entries. The design uses a "snapshot" approach for log entries to ensure historical data remains accurate even if the original drink presets are changed.

* **User**: Stores core user information.
    * **Fields**: `id` (unique identifier), `email` (unique), `name`, `emailVerified`, `image`, `createdAt`, `updatedAt`.
    * **Relations**: Has relationships to `Account`, `Session`, `Drink`, `CaffeineEntry`, and `UserDailyLimit`.
* **Drink**: Represents a reusable drink preset that can be either a default drink or created by a user.
    * **Fields**: `id`, `name`, `caffeineMg`, `sizeMl`, `createdByUserId` (optional, links to a User), `createdAt`, `updatedAt`.
    * **Constraints**: A user cannot have two drinks with the same name. Default drinks have `createdByUserId` set to `null`.
* **CaffeineEntry**: A self-contained record of a single instance of caffeine consumption.
    * **Fields**: `id`, `userId` (links to a User), `consumedAt` (the exact timestamp of consumption), `name` (a snapshot of the drink name or a manual description), `caffeineMg` (a snapshot of the caffeine amount), `drinkId` (an optional link back to a `Drink` preset).
    * **Indexing**: Indexed on `userId` and `consumedAt` for fast lookups.
* **UserDailyLimit**: Stores the history of a user's daily caffeine limits.
    * **Fields**: `id`, `userId` (links to a User), `limitMg`, `effectiveFrom` (the date this limit became active), `createdAt`.
    * **Constraints**: A user can only have one limit change per timestamp (`effectiveFrom`).
* **Account, Session, VerificationToken**: These are standard models required by the NextAuth.js Prisma adapter to handle authentication, session management, and the magic link verification process.

---

## 5. API (tRPC Procedures)

The API is implemented using tRPC. All procedures are protected and require an authenticated user session.

* **`user` router**
    * `me: query`
        * Fetches profile data for the currently authenticated user.
        * **Returns:** `{ id, email, createdAt }`
    * `exportData: query`
        * Generates and returns all of a user's data as a single CSV-formatted string.
        * **Returns:** `{ csv: string }`
    * `deleteAccount: mutation`
        * Deletes all data associated with the user and invalidates their session.
        * **Returns:** `{ success: boolean }`
* **`settings` router**
    * `getLimit: query`
        * Retrieves the current and historical daily caffeine limits for the user.
        * **Returns:** `{ current_limit_mg, history: [{ limit_mg, effective_from }] }`
    * `setLimit: mutation`
        * Sets a new daily caffeine limit for the user.
        * **Input:** `{ limit_mg: number }`
        * **Returns:** `{ success: boolean, new_limit: UserDailyLimitObject }`
* **`drinks` router**
    * `create: mutation`
        * Adds a new private drink for the current user.
        * **Input:** `{ name: string, caffeine_mg: number, size_ml: number }`
        * **Returns:** `{ success: boolean, drink: DrinkObject }`
    * `search: query`
        * Searches for drinks, showing both default drinks and the user's private drinks.
        * **Input:** `{ q?: string, sort_by?: 'name' | 'caffeineMg' | 'sizeMl', sort_order?: 'asc' | 'desc', limit?: number, page?: number }`
        * **Returns:** `{ drinks: [DrinkObject], pagination: { total, page, limit, total_pages } }`
* **`entries` router**
    * `create: mutation`
        * Creates a new caffeine entry from either a preset drink or a manual entry.
        * **Input:**
            * **Preset:** `{ type: 'preset', drinkId: string, consumedAt: datetime }`
            * **Manual:** `{ type: 'manual', name: string, caffeineMg: number, consumedAt: datetime }`
        * **Returns:** `EntryMutationResponse`
    * `update: mutation`
        * Updates an existing caffeine entry. If `name` or `caffeineMg` are changed, the link to the original preset drink (`drink_id`) is removed.
        * **Input:** `{ id: string, consumed_at?: datetime, name?: string, caffeine_mg?: number }`
        * **Returns:** `EntryMutationResponse`
    * `delete: mutation`
        * Deletes a caffeine entry.
        * **Input:** `{ id: string }`
        * **Returns:** `{ success: boolean }`
    * `list: query`
        * Gets a paginated list of caffeine entries.
        * **Input:** `{ start_date?: datetime, end_date?: datetime, offset?: number, limit?: number }`
        * **Returns:** `ListEntriesApiResponse`
    * `getDaily: query`
        * Gets all entries for a specific day.
        * **Input:** `{ date?: YYYY-MM-DD }`
        * **Returns:** `DailyEntriesApiResponse`
    * `getGraphData: query`
        * Gets data for the consumption graph, aggregated efficiently in the database.
        * **Input:** `{ start_date: YYYY-MM-DD, end_date: YYYY-MM-DD }`
        * **Returns:** `GraphDataApiResponse`

---

## 6. Error Handling Strategy

* **API Responses:** Consistent JSON error format: `{ "error": { "message": "...", "code": "..." } }` using `TRPCError`.
* **Validation Errors:** Use Zod for input validation on all procedures.
* **Database Errors:** Log internal server errors.
* **Client-Side:** Graceful handling of API errors and form validation.
* **Logging:** Server-side logging for errors and critical events.

---

## 7. Testing Plan

* **Unit Tests:** For individual components and helper functions.
* **Integration Tests:** For tRPC procedures and API endpoints.
* **End-to-End (E2E) Tests:** For full user journeys.
* **Performance Testing:** Load testing on API endpoints, especially history and graph data.
* **Security Testing:** Authentication, authorization, and input sanitization checks.