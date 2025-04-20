import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

const handler = (req: Request) =>
    fetchRequestHandler({
        endpoint: "/api/trpc",
        req,
        router: appRouter,
        createContext: createTRPCContext,
        onError({ error }) {
            if (error.code === 'INTERNAL_SERVER_ERROR') {
                // send to bug reporting
                console.error('Something went wrong', error);
            }
        },
    });

export { handler as GET, handler as POST };