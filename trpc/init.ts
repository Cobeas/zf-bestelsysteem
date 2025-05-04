import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import { EventEmitter } from "node:events";
import superjson from "superjson";
import { cookies } from "next/headers";

export const createTRPCContext = cache(async () => {
    const cookieStore = await cookies();
    const userSession = cookieStore.get("zfsession");
    const adminSession = cookieStore.get("zfadminsession");

    const session = adminSession || userSession;

    return {
        session,
    };
});
export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
export const ee = new EventEmitter();

const t = initTRPC.context<Context>().create({
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
export const openProcedure = t.procedure;
export const baseProcedure = t.procedure.use(async function isAuthenticated(opts) {
    const { ctx } = opts;

    if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in to access this resource." });

    return opts.next({
        ctx: {
            ...ctx,
            session: ctx.session,
        }
    })
});