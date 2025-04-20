"use client";

import { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
    httpBatchLink,
    httpSubscriptionLink,
    loggerLink,
    splitLink,
} from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { ReactNode, useState } from "react";
import { makeQueryClient } from "./query-client";
import { Approuter } from "./routers/_app";
import superjson from "superjson";

export const trpc = createTRPCReact<Approuter>();

let clientQueryClientSingleton: QueryClient;
function getQueryClient() {
    if (typeof window === 'undefined') {
        return makeQueryClient();
    }

    return (clientQueryClientSingleton ??= makeQueryClient());
}

// Commented out as this did not go well with requests on the local network
// function getUrl() {
//     const base = (() => {
//         if (typeof window === 'undefined') return '';
//         if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
//         return 'http://localhost:3000';
//     })();
//     return `${base}/api/trpc`;
// }

export function TRPCProvider(
    props: Readonly<{
        children: ReactNode;
    }>,
) {
    const queryClient = getQueryClient();

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                loggerLink(),
                splitLink({
                    condition: (op) => op.type === 'subscription',
                    true: httpSubscriptionLink({
                        transformer: superjson,
                        url: '/api/trpc',
                    }),
                    false: httpBatchLink({
                        transformer: superjson,
                        url: '/api/trpc',
                    }),
                })
            ],
        })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                {props.children}
            </trpc.Provider>
        </QueryClientProvider>
    )
}