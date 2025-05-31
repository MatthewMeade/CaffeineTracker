# Caffeine Tracker Web App: Developer Specification

---

## 1. Introduction

This document details the requirements and architectural choices for a caffeine tracking web application, built using Next.js. The application will allow users to log their daily caffeine intake, visualize consumption trends, manage a personalized and shared drink database, and configure personal limits.

---

## 2. Core Features & User Experience

* **Caffeine Logging:**
    * **Input Method:** Direct numerical input (mg) on the main screen.
    * **Timestamping:** Entries default to the current date and time (hour/minute granularity). The timestamp is editable by the user.
    * **Entry Management:** Users can **edit or delete** any historical caffeine entry.

* **Daily View (Main Screen):**
    * Direct caffeine input field.
    * **Chronological list** of today's caffeine entries, displaying **drink name** (if available), **amount (mg)**, and **time**.
    * **Prominent display** of the **current day's total caffeine consumed (mg)**.
    * **Daily Limit Indicator:** Shows **remaining caffeine allowance (mg)** or a clear "**Over Limit**" message.
    * **Navigation:** **Swipe functionality** to view previous/next days' entries.

* **Drink Management:**
    * **Selection:** Users can select from a pre-defined list of drinks.
    * **Search:** **Fuzzy search functionality** for existing drinks.
    * **Add New Drink Form:**
        * Accessed via an "Add" button if a drink isn't found in search.
        * **Mandatory Fields:** `name` (string), `size_ml` (number).
        * **Calculation:** The app will calculate and store `caffeine_mg_per_ml` based on user input for total `caffeine_mg` (provided by the user for the `size_ml` specified).
        * **Shared Database:** User-added drinks become available for selection by all other users.
        * **Prioritization:** In search results, a user's own added drinks take precedence over shared drinks from other users. Duplicates (e.g., "Coca-Cola" and "coca cola") are acceptable; the search mechanism will handle surfacing them.
        * **No Images:** No image upload functionality for drinks in this version.
    * **Logging with Drinks:** When a user selects an existing drink and enters a volume (ml), the app will **suggest the total caffeine amount** based on `caffeine_mg_per_ml * volume`. This suggested amount can be **overridden** by the user.

* **Historical View:**
    * **Graph:** **Line graph** displaying **daily caffeine intake (mg)** since tracking began.
        * **Timeframe Filters:** Quick-select buttons for 1w (week), 1m (month), 3m (3 months), 1y (year).
        * **Custom Date Range Picker:** Potential future enhancement.
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
        * **Dashboard:** A persistent visual indicator on the dashboard (e.g., "You are X mg over your limit today!" or or "You have X mg remaining.").

* **User Account & Settings:**
    * **Navigation:** Accessible via a navigation bar icon.
    * **Settings Options:**
        * Change daily caffeine limit.
        * Account management: Option to **delete all user data**.
        * Account management: Option to **export all user data as a CSV**.

* **Data Export (CSV):**
    * **Content:** A comprehensive dump of all user data.
    * **Sheets/Sections:**
        * **User Drinks:** Contains all user-defined drinks (Name, Caffeine\_mg\_per\_ml, Size\_ml, etc. - all relevant DB fields).
        * **Log Entries:** All individual caffeine log entries (Date, Time, Caffeine\_mg, Drink\_Name, Drink\_ID (if applicable), User\_ID, etc. - all relevant DB fields).
        * **Daily Totals:** Summarized daily caffeine intake (Date, Total\_Caffeine\_mg, Exceeded\_Limit (boolean), Daily\_Limit\_mg - all relevant DB fields).

---

## 3. Technical Architecture

* **Frontend:** Next.js (React)
* **Backend/API:** Next.js API Routes (Serverless functions)
* **Database:** PostgreSQL
* **Authentication:** NextAuth.js (using Magic Email Links for passwordless login)

---

## 4. Data Model (PostgreSQL)

*(Note: This is a preliminary schema and may require adjustments during implementation.)*

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- UserSessions (for NextAuth) - NextAuth handles details, but conceptually linked to users
-- No explicit table definition needed here, NextAuth handles this.

-- Drinks Table (Shared across users)
CREATE TABLE drinks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    caffeine_mg_per_ml NUMERIC(10, 4) NOT NULL, -- Stored as mg per ml
    base_size_ml NUMERIC(10, 2), -- The reference size for the caffeine_mg_per_ml calculation (e.g., 355ml for a can)
    created_by_user_id UUID REFERENCES users(id), -- User who first added this drink
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, caffeine_mg_per_ml, base_size_ml) -- Prevent exact duplicates
);

-- CaffeineEntries Table
CREATE TABLE caffeine_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    drink_id UUID REFERENCES drinks(id), -- Optional, if selected from drinks list
    caffeine_mg NUMERIC(10, 2) NOT NULL, -- Actual mg consumed for this entry
    consumed_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Date and time of consumption
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- UserDailyLimits Table
-- Stores the historical changes to a user's daily caffeine limit
CREATE TABLE user_daily_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    limit_mg NUMERIC(10, 2) NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- When this limit became active
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, effective_from) -- A user can only have one limit setting per timestamp
);
```


## 5. API Endpoints (Next.js API Routes)

* `POST /api/auth/signin` (NextAuth handles)
* `GET /api/auth/session` (NextAuth handles)
* `GET /api/user/me` (User profile data)
* `POST /api/entries`: Create a new caffeine entry.
    * **Request Body:** `{ "caffeine_mg": number, "consumed_at": datetime, "drink_id": uuid (optional), "volume_ml": number (optional, if using drink_id) }`
    * **Response:** `{ "success": boolean, "entry": CaffeineEntryObject, "over_limit": boolean, "remaining_mg": number }`
* `PUT /api/entries/:id`: Update an existing caffeine entry.
    * **Request Body:** `{ "caffeine_mg": number (optional), "consumed_at": datetime (optional), ... }`
    * **Response:** `{ "success": boolean, "entry": CaffeineEntryObject, "over_limit": boolean, "remaining_mg": number }`
* `DELETE /api/entries/:id`: Delete a caffeine entry.
    * **Response:** `{ "success": boolean }`
* `GET /api/entries/daily`: Get all entries for a specific day.
    * **Query Params:** `?date=YYYY-MM-DD`
    * **Response:** `{ "entries": [CaffeineEntryObject], "daily_total_mg": number, "over_limit": boolean, "daily_limit_mg": number }`
* `GET /api/entries/history`: Get paginated/infinite scroll log history.
    * **Query Params:** `?offset=number&limit=number`
    * **Response:** `{ "entries_by_day": { "YYYY-MM-DD": [CaffeineEntryObject] }, "has_more": boolean }`
* `GET /api/entries/graph-data`: Get data for the consumption graph.
    * **Query Params:** `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
    * **Response:** `{ "data": [{ "date": "YYYY-MM-DD", "total_mg": number, "limit_exceeded": boolean, "limit_mg": number }] }`
* `GET /api/drinks/search`: Search for drinks.
    * **Query Params:** `?q=string`
    * **Response:** `{ "drinks": [DrinkObject] }` (Prioritizing user's own drinks)
* `POST /api/drinks`: Add a new drink.
    * **Request Body:** `{ "name": string, "caffeine_mg_per_ml": number, "base_size_ml": number }`
    * **Response:** `{ "success": boolean, "drink": DrinkObject }`
* `GET /api/settings/limit`: Get current and historical daily limits for the user.
    * **Response:** `{ "current_limit_mg": number, "history": [{ "limit_mg": number, "effective_from": datetime }] }`
* `POST /api/settings/limit`: Set a new daily caffeine limit.
    * **Request Body:** `{ "limit_mg": number }`
    * **Response:** `{ "success": boolean, "new_limit": UserDailyLimitObject }`
* `POST /api/user/export`: Initiate data export.
    * **Response:** `{ "success": boolean, "download_url": string }` (e.g., temporary signed S3 URL or direct stream)
* `DELETE /api/user/delete-data`: Delete all user data.
    * **Response:** `{ "success": boolean }`

---

## 6. Error Handling Strategy

* **API Responses:**
    * Consistent JSON error format: `{ "error": { "message": "...", "code": "..." } }`
    * Appropriate HTTP status codes (e.g., 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).
* **Validation Errors:** Return **400 Bad Request** with specific error messages for invalid input (e.g., `caffeine_mg` not a number).
* **Database Errors:** Log internal server errors. For production, abstract specific DB errors from the user.
* **Client-Side:**
    * Graceful handling of API errors (e.g., display user-friendly error messages, disable forms).
    * Form validation feedback (e.g., red borders, inline error text).
* **Logging:** Implement server-side logging for errors, critical events, and suspicious activity.

---

## 7. Testing Plan

* **Unit Tests:**
    * **Frontend (Jest/React Testing Library):** Individual React components (e.g., input field, drink card, graph component).
    * **Backend (Jest/Supertest for API routes, separate tests for utility functions):**
        * Database interactions (CRUD operations for all models).
        * Caffeine calculation logic (`mg_per_ml`).
        * Daily limit calculation logic (historical limit application).
        * Authentication flow.
* **Integration Tests:**
    * **Frontend-Backend Interaction:** Test API calls end-to-end (e.g., adding an entry and seeing it appear in the daily list).
    * **Authentication Flow:** Full sign-in, session management, sign-out.
    * **Data Export:** Verify generated CSV content against the database.
    * **Daily Limit Warnings:** Test scenarios for pre-logging, post-logging, and dashboard warnings.
* **End-to-End (E2E) Tests (Cypress/Playwright):**
    * Simulate full user journeys:
        * User registration and initial limit setting.
        * Logging caffeine, including using existing drinks and adding new ones.
        * Editing and deleting entries.
        * Navigating historical views and graphs.
        * Changing limits and observing their effect.
        * Data export and deletion.
* **Performance Testing:**
    * Load testing on API endpoints, especially history and graph data endpoints, to ensure scalability with more users and data.
    * Frontend performance profiling for large data sets (e.g., infinite scroll optimization).
* **Security Testing:**
    * Authentication and Authorization checks (ensure users can only access their own data).
    * Input sanitization to prevent XSS/SQL injection.
    * Rate limiting on API endpoints (e.g., login attempts, new entry creation).
* **Usability Testing:** Informal testing with users to gather feedback on the UI/UX.