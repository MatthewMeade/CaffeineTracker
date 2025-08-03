# Caffeine Tracker

A modern, full-stack web application built with Next.js to help users monitor their daily caffeine intake. Features a sophisticated authentication system supporting both registered and guest users, with a dynamic and interactive UI for logging and visualizing caffeine consumption data.

## ✨ Features

### 🔐 Authentication & User Experience
- **Guest Mode**: Anonymous users can immediately start tracking without registration
- **Email Authentication**: Passwordless magic link authentication via NextAuth.js
- **Seamless Migration**: Guest data automatically transfers to authenticated accounts

### 📊 Dashboard & Tracking
- **Caffeine Gauge**: Animated visual indicator showing daily consumption vs. limit
- **Smart Entry Form**: Search favorites or manually enter caffeine amounts
- **Quick-Add Favorites**: One-click logging of frequently consumed drinks
- **Daily Timeline**: Chronological view of today's entries, grouped by time

### ⭐ Favorites Management
- **Full CRUD Operations**: Add, update, and delete favorite drinks
- **Custom Icons**: Emoji selection for easy drink identification
- **Smart Integration**: Powers quick-add grid and search suggestions

### 📈 Historical Analytics
- **Interactive Bar Chart**: Stacked visualization of daily caffeine intake
- **Timeframe Filters**: 7-day, 30-day, or custom date range views
- **Day Details**: Click any bar to view and edit specific day's entries

### ⚙️ User Settings
- **Daily Limit Configuration**: Set personal caffeine limits
- **Data Export**: Download all user data as CSV
- **Account Management**: Delete account and associated data

## 🛠️ Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js v5 (Auth.js)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Animations**: Framer Motion
- **State Management**: TanStack Query (React Query)
- **Validation**: Zod schema validation
- **Testing**: Vitest with React Testing Library
- **Email**: Resend for magic link authentication

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CaffeineTracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables in `.env.local`:
   ```env
   DATABASE_URL="file:./dev.db"
   AUTH_SECRET="your-secret-key"
   AUTH_RESEND_KEY="your-resend-api-key"
   ```

4. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📝 Available Scripts

- `npm run dev` - Start development server with turbo
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format:write` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run db:generate` - Generate Prisma migrations
- `npm run db:studio` - Open Prisma Studio

## 🧪 Testing

The project uses Vitest for testing with comprehensive coverage:

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test API endpoints and database operations
- **Component Tests**: Test UI components with React Testing Library

Run tests with:
```bash
npm test
```

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── _components/       # Page-specific components
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
├── server/                # Server-side logic and tRPC routers
├── styles/                # Global styles
├── trpc/                  # tRPC client configuration
└── types/                 # TypeScript type definitions
```

## 🔧 Development Guidelines

### Code Quality
- Follow TypeScript strict mode
- Use ESLint and Prettier for code formatting
- Write comprehensive tests for all features
- Follow the established project standards

### Database
- Use Prisma for all database operations
- Run migrations with `npm run db:generate`
- Use Prisma Studio for database inspection

### Authentication
- Guest users are automatically created on first visit
- Email authentication uses magic links via Resend
- Guest data migrates seamlessly to authenticated accounts

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
