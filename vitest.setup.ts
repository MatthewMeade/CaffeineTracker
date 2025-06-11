import { vi, beforeEach } from 'vitest';



// Mock NextResponse
declare global {
    // eslint-disable-next-line no-var
    var NextResponse: {
        json: (data: unknown) => { data: unknown };
        error: (message: string) => { error: string };
    };
}

global.NextResponse = {
    json: vi.fn((data: unknown) => ({ data })),
    error: vi.fn((message: string) => ({ error: message })),
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
            session: ({ session, user }: { session: { user?: { id?: string } }; user: { id: string } }) => ({
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

vi.mock('~/env.js', () => ({
    env: {
        NODE_ENV: 'test',
    },
}));

// Reset all mocks before each test
beforeEach(() => {
    vi.clearAllMocks();
});
