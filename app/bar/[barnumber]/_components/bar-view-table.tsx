"use client";

import { trpc } from "@/trpc/client";
import { Message } from "@/trpc/routers/messages";
import { toast } from "sonner";

export const BarViewTable = () => {
    trpc.realtime.onMessage.useSubscription(undefined, {
        onData: (data) => {
            toast.info((data as unknown as Message[])[0].message)
        }
    })

    return (
        <div>
            Check this out!
        </div>
    )
}
