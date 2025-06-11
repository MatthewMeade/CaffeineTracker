'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { loggerLink, unstable_httpBatchStreamLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import superjson from 'superjson';

import type { AppRouter } from '~/server/trpc/router';

export const api = createTRPCReact<AppRouter>();

function getBaseUrl() {
    if (typeof window !== 'undefined') return ''; // browser should use relative url
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
    return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
}

export function TRPCReactProvider(props: {
    children: React.ReactNode;
    headers?: Headers;
}) {
    const [queryClient] = useState(() => new QueryClient());
    const [trpcClient] = useState(() =>
        api.createClient({
            links: [
                loggerLink({
                    enabled: (opts) =>
                        process.env.NODE_ENV === 'development' ||
                        (opts.direction === 'down' && opts.result instanceof Error),
                }),
                unstable_httpBatchStreamLink({
                    transformer: superjson,
                    url: `${getBaseUrl()}/api/trpc`,
                    headers() {
                        const heads = new Map(props.headers);
                        heads.set('x-trpc-source', 'react');
                        return Object.fromEntries(heads);
                    },
                }),
            ],
        }),
    );

    return (
        <api.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                {props.children}
            </QueryClientProvider>
        </api.Provider>
    );
} 