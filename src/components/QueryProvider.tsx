'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5,      // 5 minutes - data considered fresh (Context7 best practice)
                gcTime: 1000 * 60 * 10,        // 10 minutes - garbage collection time
                refetchInterval: 1000 * 120,   // 2 minutes - SSE handles real-time, this is backup
                refetchOnWindowFocus: false,   // Prevent refetch spam on tab switch
                retry: 1,                      // Single retry on failure
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
