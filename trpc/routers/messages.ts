import EventEmitter, { on } from "node:events";
import { baseProcedure, createTRPCRouter } from "../init";
import { z } from "zod";

export interface Message { message: string };
export const messageEmitter = new EventEmitter<{ message: [Message] }>();
export function listenToMessages(signal: AbortSignal): AsyncIterable<Message> {
    return on(messageEmitter, 'message', { signal }) as AsyncIterable<Message>;
}

export const orderEmitter = new EventEmitter();
export function listenToOrderChange(signal: AbortSignal): AsyncIterable<void> {
    return on(orderEmitter, 'order', { signal }) as AsyncIterable<void>;
}

export const dataEmitter = new EventEmitter();
export function listenToDataChange(signal: AbortSignal): AsyncIterable<void> {
    return on(dataEmitter, 'refreshdata', { signal }) as AsyncIterable<void>;
}

let orderEmitScheduled = false;
let dataEmitScheduled = false;
const ORDER_THROTTLE = 5000;
const DATA_THROTTLE = 10000;

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
    onNewData: baseProcedure
        .subscription(async function* (opts) {
            for await (const msg of listenToDataChange(opts.signal!)) {
                yield msg;
            }
        }),
    sendDataChange: baseProcedure
        .mutation(async () => {
            if (dataEmitScheduled) return;

            dataEmitScheduled = true;
            dataEmitter.emit('refreshdata');

            setTimeout(() => {
                dataEmitScheduled = false;
            }, DATA_THROTTLE);
            return;
        }),
    onOrderChange: baseProcedure
        .subscription(async function* (opts) {
            for await (const msg of listenToOrderChange(opts.signal!)) {
                yield msg;
            }
        }),
    sendOrderChange: baseProcedure
        .mutation(async () => {
            if (orderEmitScheduled) return;

            orderEmitScheduled = true;
            orderEmitter.emit('order');

            setTimeout(() => {
                orderEmitScheduled = false;
            }, ORDER_THROTTLE);
            return;
        })
});