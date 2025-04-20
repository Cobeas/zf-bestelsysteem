import EventEmitter, { on } from "node:events";
import type { TRPCRouterRecord } from "@trpc/server";
import db from "@/lib/db";
import { baseProcedure, createTRPCRouter } from "../init";
import { z } from "zod";

export interface Message { message: string };
export const messageEmitter = new EventEmitter<{ message: [Message] }>();

export function listenToMessages(signal: AbortSignal): AsyncIterable<Message> {
    return on(messageEmitter, 'message', { signal }) as AsyncIterable<Message>;
}

export const realTimeRouter = createTRPCRouter({
    onMessage: baseProcedure
        .subscription(async function* (opts) {
            for await (const msg of listenToMessages(opts.signal!)) {
                yield msg;
            }
        }),
    sendMessage: baseProcedure
        .input(z.object({ message: z.string() }))
        .mutation(async ({ input }) => {
            messageEmitter.emit('message', { message: input.message });
            return { success: true };
        }),
});