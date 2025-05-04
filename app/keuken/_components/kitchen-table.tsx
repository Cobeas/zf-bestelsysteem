"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { product_type } from "@prisma/client";
import { trpc } from "@/trpc/client";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@/trpc/routers/messages";

interface OrderItem {
    name: string;
    type: product_type;
    price: number;
    quantity: number;
    product_id: string;
}

const StatusMap = {
    PENDING: "Nieuw",
    IN_PROGRESS: "In behandeling",
    COMPLETED: "Verzonden",
    CANCELLED: "Geannuleerd",
} as const;

const KitchenTable = () => {
    return (
        <ErrorBoundary fallback={<div>Something went wrong...</div>}>
            <Suspense fallback={<KitchenTableSkeleton />}>
                <KitchenTableSuspense />
            </Suspense>
        </ErrorBoundary>
    )
}

export default KitchenTable

const KitchenTableSuspense = () => {
    const utils = trpc.useUtils();
    const [sort, setSort] = useState<'asc' | 'desc'>('asc');
    const [data, { refetch }] = trpc.getKitchenOrders.useSuspenseQuery({});
    const sendMutation = trpc.sendOrder.useMutation();
    const { foodOrders } = data;

    trpc.realtime.onMessage.useSubscription(undefined, {
        onData: (data) => {
            toast.info((data as unknown as Message[])[0].message, {
                duration: 10000,
                position: "top-center",
                style: { fontSize: "1.25rem" },
            })
        }
    })
    trpc.realtime.onOrderChange.useSubscription(undefined, {
        onData: () => {
            refetch();
        }
    })

    const sendOrder = (orderId: number) => {
        sendMutation.mutateAsync({
            orderId,
        }, {
            onSuccess: () => {
                utils.getKitchenOrders.invalidate({});
                toast.success("Bestelling verzonden!");
            },
            onError: (error) => {
                toast.error(error.message);
            }
        })
    }

    return (
        <>
            <div className="w-full px-8 flex flex-col gap-4 items-center justify-start">
                <div className="flex items-center justify-between w-full mb-4">
                    <div className="w-full flex items-center justify-start gap-2">
                        <span>Sorteren:</span>
                        <Select
                            onValueChange={(value) => setSort(value as 'asc' | 'desc')}
                            defaultValue={sort}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Sorteren" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="asc">Oplopend</SelectItem>
                                <SelectItem value="desc">Aflopend</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <ScrollArea className="w-full min-h-[200px] h-[calc(100dvh-12rem)]">
                    <table className="w-full border-collapse relative text-2xl">
                        <thead className="w-full sticky top-0 z-10">
                            <tr className="flex flex-row w-full justify-between items-center bg-accent text-accent-foreground p-2 rounded-lg shadow-md">
                                <th className="w-1/6 text-start">Bestelling</th>
                                <th className="w-1/6 text-start">Tafel</th>
                                <th className="w-2/6 text-start">Producten</th>
                                <th className="w-1/6 text-start">Status</th>
                                <th className="w-1/6 text-start">Acties</th>
                            </tr>
                        </thead>
                        <tbody className="w-full">
                            {foodOrders
                                .sort((a, b) => {
                                    if (sort === 'asc') {
                                        return a.created_at.getTime() - b.created_at.getTime();
                                    } else {
                                        return b.created_at.getTime() - a.created_at.getTime();
                                    }
                                })
                                .map((order) => (
                                    <tr key={order.id} className="flex flex-row w-full justify-between items-center p-2 border-b border-muted-foreground hover:bg-muted-foreground/10">
                                        <td className="w-1/6">{order.id}</td>
                                        <td className="w-1/6">{order.table.table_number}</td>
                                        <td className="w-2/6">
                                            {(order.foods as unknown as OrderItem[])?.map((o) => (
                                                <div key={o.product_id}>{o.quantity} {o.name}</div>
                                            ))}
                                        </td>
                                        <td className="w-1/6">{StatusMap[order.status]}</td>
                                        <td className="w-1/6">
                                            <Button
                                                variant="secondary"
                                                className="w-full hover:bg-primary hover:text-primary-foreground"
                                                onClick={() => sendOrder(order.id)}
                                            >
                                                Verstuur
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </ScrollArea>
            </div>
        </>
    )
}

const KitchenTableSkeleton = () => {
    return (
        <div>
            Loading...
        </div>
    )
}