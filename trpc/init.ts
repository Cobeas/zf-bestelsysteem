import { initTRPC } from "@trpc/server";
import { cache } from "react";
import { EventEmitter } from "node:events";
import superjson from "superjson";

export const createTRPCContext = cache(async () => {
    return {};
});

export const ee = new EventEmitter();

const t = initTRPC.create({
    transformer: superjson,
    sse: {
        ping: {
            enabled: true,
            intervalMs: 2_000,
        },
        client: {
            reconnectAfterInactivityMs: 5_000,
        }
    }
});

export const createTRPCRouter = t.router;
export const createCallerFacotry = t.createCallerFactory;
export const baseProcedure = t.procedure;