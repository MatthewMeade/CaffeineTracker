import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock next/server
vi.mock('next/server', () => ({
    headers: () => new Headers(),
    cookies: () => new Map(),
    NextResponse: {
        json: (body: any, init?: ResponseInit) => new Response(JSON.stringify(body), init),
        error: () => new Response(null, { status: 500 }),
    },
}));

// Mock NextResponse
declare global {
    var NextResponse: {
        json: (data: any) => { data: any };
        error: (message: string) => { error: string };
    };
}

global.NextResponse = {
    json: vi.fn((data) => ({ data })),
    error: vi.fn((message) => ({ error: message })),
};

// Mock auth config
vi.mock('~/server/auth/config', () => ({
    authOptions: {
        providers: [{ id: 'email' }],
        pages: {
            signIn: '/auth/signin',
            verifyRequest: '/auth/verify-request',
        },
        callbacks: {
            session: ({ session, user }: any) => ({
                ...session,
                user: {
                    ...session.user,
                    id: user.id,
                },
            }),
        },
        adapter: {},
    },
}));

// Mock NextAuth
const mockSession = {
    user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

vi.mock('next-auth', () => ({
    default: vi.fn(() => ({
        auth: vi.fn(() => Promise.resolve(mockSession)),
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
    })),
    getServerSession: vi.fn(() => Promise.resolve(mockSession)),
    auth: vi.fn(() => Promise.resolve(mockSession)),
}));

// Reset all mocks before each test
beforeEach(() => {
    vi.clearAllMocks();
});
