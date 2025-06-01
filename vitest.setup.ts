import '@testing-library/jest-dom';
import { vi } from 'vitest';

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

// Mock getServerSession
vi.mock('next-auth', () => ({
    getServerSession: vi.fn(() => Promise.resolve({
        user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User'
        }
    }))
}));
