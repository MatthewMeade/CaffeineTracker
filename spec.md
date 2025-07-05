# Caffeine Tracker Web App: Developer Specification

---

## 1. Introduction

This document details the requirements and architectural choices for a caffeine tracking web application, built using Next.js. The application allows users to log their daily caffeine intake, visualize consumption trends, manage a personalized and shared drink database, and configure personal limits. The app supports both anonymous guest users and authenticated email users with seamless data linking.

---

## 2. Core Features & User Experience

### 2.1 Authentication & User Flow

* **Anonymous Guest Users:**
    * Users can immediately start using the app without signing up
    * Automatic anonymous session creation on first visit
    * Full access to all tracking features with data stored locally
    * Option to sign in with email to permanently save their data
    * Seamless data migration from guest to authenticated account

* **Email Authentication:**
    * Magic link authentication via NextAuth.js and Resend
    * No password required - users receive a secure login link via email
    * Automatic linking of guest data to authenticated account upon sign-in
    * Session persistence with JWT strategy

### 2.2 Dashboard & Main Interface

* **Simplified Dashboard:**
    * Clean, minimal interface showing welcome message
    * For guests: Sign-in form prominently displayed
    * For authenticated users: Sign-out button
    * Responsive design optimized for mobile and desktop

* **Future Features (Planned):**
    * Direct caffeine input field
    * Chronological list of today's caffeine entries
    * Daily total caffeine consumption display
    * Daily limit indicator with remaining allowance
    * Navigation between days with swipe functionality

### 2.3 Drink Management (Planned)

* **Selection:** Users can select from a pre-defined list of drinks to quickly populate a new entry
* **Search:** Fuzzy search functionality for existing drinks
* **Drink Types:** The system will support two types of drinks:
    * **Default Drinks:** Pre-populated global drinks available to all users (e.g., Coffee, Espresso, Tea)
    * **User-Created Drinks:** Private drinks created by individual users, only visible to the creator
* **Add New Drink Form:**
    * Accessed via an "Add" button if a drink isn't found in search
    * **Mandatory Fields:** `name` (string), `caffeine_mg` (number), `size_ml` (number)
    * **Private Creation:** User-added drinks are private and only visible to the creating user

### 2.4 Historical View (Planned)

* **Graph:** Line graph displaying daily caffeine intake (mg) since tracking began
    * **Timeframe Filters:** Quick-select buttons for 1w (week), 1m (month), 3m (3 months), 1y (year)
    * **Limit Visualization:** Graph line changes color if daily total exceeded the active limit
* **Full Log History:** Accessible via navigation bar
    * **Infinite scrolling list** of all individual caffeine entries
    * **Daily separators/headings** for chronological organization

### 2.5 Daily Caffeine Limit (Planned)

* **Configuration:** Users set their personal daily caffeine limit (mg)
* **Historical Application:** Limit applied based on effective date, not retroactively
* **Settings Page:** Limit modification for future days
* **Warnings:** Pre-logging and post-logging warnings when approaching/exceeding limits

### 2.6 User Account & Settings (Planned)

* **Navigation:** Accessible via navigation bar icon
* **Settings Options:**
    * Change daily caffeine limit
    * Account management: Option to delete all user data
    * Account management: Option to export all user data as CSV

---

## 3. Technical Architecture

* **Frontend:** Next.js 15+ with App Router
* **Backend/API:** tRPC with Next.js App Router
* **Database:** SQLite (development/testing) with Prisma ORM
* **Authentication:** NextAuth.js v5 (Auth.js) with:
    * Email magic links via Resend
    * Anonymous credentials provider for guest users
    * JWT session strategy
    * Prisma adapter for database integration

---

## 4. Data Model (Prisma Schema)

The database schema uses Prisma and includes support for both authenticated and anonymous users:

* **User**: Stores core user information
    * **Fields**: `id` (unique identifier), `email` (nullable for anonymous users), `isGuest` (boolean), `name`, `emailVerified`, `image`, `createdAt`, `updatedAt`
    * **Relations**: Has relationships to `Account`, `Session`, `Drink`, `CaffeineEntry`, and `UserDailyLimit`
    * **Anonymous Users**: Users with `isGuest: true` and `email: null`

* **Drink**: Represents reusable drink presets
    * **Fields**: `id`, `name`, `caffeineMg`, `sizeMl`, `createdByUserId` (optional, links to a User), `createdAt`, `updatedAt`
    * **Constraints**: A user cannot have two drinks with the same name. Default drinks have `createdByUserId` set to `null`

* **CaffeineEntry**: Self-contained record of caffeine consumption
    * **Fields**: `id`, `userId` (links to a User), `consumedAt` (timestamp), `name` (snapshot of drink name or manual description), `caffeineMg` (snapshot of caffeine amount), `drinkId` (optional link to `Drink` preset)
    * **Indexing**: Indexed on `userId` and `consumedAt` for fast lookups

* **UserDailyLimit**: History of user's daily caffeine limits
    * **Fields**: `id`, `userId` (links to a User), `limitMg`, `effectiveFrom` (date limit became active), `createdAt`
    * **Constraints**: One limit change per timestamp (`effectiveFrom`)

* **Account, Session, VerificationToken**: Standard NextAuth.js models for authentication

---

## 5. Authentication Flow

### 5.1 Anonymous User Creation
* Automatic creation of anonymous users via NextAuth.js CredentialsProvider
* Anonymous users receive a unique session ID and can use all app features
* Data is stored and associated with the anonymous user ID

### 5.2 Guest to Authenticated User Linking
* When a guest user signs in with email, the system:
    1. Creates a new authenticated user account
    2. Transfers all associated data (entries, drinks, limits) to the new account
    3. Deletes the anonymous user account
    4. Maintains data integrity throughout the process
* This process is atomic and handles edge cases gracefully

### 5.3 Session Management
* JWT-based sessions for both guest and authenticated users
* Automatic session refresh and persistence
* Secure session invalidation on sign-out

---

## 6. API (tRPC Procedures)

The API is implemented using tRPC with all procedures requiring an authenticated session (guest or email).

* **`user` router**
    * `me: query` - Fetches profile data for the current user
    * `exportData: query` - Generates CSV export of all user data
    * `deleteAccount: mutation` - Deletes all user data and invalidates session

* **`settings` router**
    * `getLimit: query` - Retrieves current and historical daily limits
    * `setLimit: mutation` - Sets new daily caffeine limit

* **`drinks` router**
    * `create: mutation` - Adds new private drink for current user
    * `search: query` - Searches drinks with pagination and sorting

* **`entries` router**
    * `create: mutation` - Creates new caffeine entry (preset or manual)
    * `update: mutation` - Updates existing caffeine entry
    * `delete: mutation` - Deletes caffeine entry
    * `list: query` - Gets paginated list of entries
    * `getDaily: query` - Gets all entries for specific day
    * `getGraphData: query` - Gets aggregated data for consumption graph

---

## 7. Error Handling Strategy

* **API Responses:** Consistent JSON error format using `TRPCError`
* **Validation:** Zod schema validation on all procedures
* **Database Errors:** Graceful handling of constraint violations and missing records
* **Authentication Errors:** Clear error messages for auth failures
* **Guest Linking Errors:** Robust error handling for data migration process

---

## 8. Testing Strategy

* **Unit Tests:** Components, utilities, and helper functions
* **Integration Tests:** tRPC procedures and API endpoints
* **Authentication Tests:** Guest user flow, email sign-in, data linking
* **Database Tests:** Prisma operations and data integrity
* **Error Handling Tests:** Edge cases and failure scenarios

---

## 9. Development Standards

* **TypeScript:** Strict typing throughout the application
* **ESLint & Prettier:** Code quality and formatting
* **Test-Driven Development:** Comprehensive test coverage
* **Git Workflow:** Conventional commits and clean history
* **Documentation:** Inline code documentation and API documentation