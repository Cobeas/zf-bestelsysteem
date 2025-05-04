"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { product_type } from "@prisma/client";
import { trpc } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

interface BarTableProps {
    barnumber: string
}

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

const BarTable = ({ barnumber }: BarTableProps) => {
    return (
        <ErrorBoundary fallback={<div>Something went wrong...</div>}>
            <Suspense fallback={<BarTableSkeleton />}>
                <BarTableSuspense barnumber={barnumber} />
            </Suspense>
        </ErrorBoundary>
    )
}

export default BarTable

const BarTableSuspense = ({ barnumber }: BarTableProps) => {
    const router = useRouter();
    const utils = trpc.useUtils();
    const [sort, setSort] = useState<'asc' | 'desc'>('asc');
    const [data] = trpc.getBarOrders.useSuspenseQuery({ barnumber });
    const sendMutation = trpc.sendOrder.useMutation();
    const { orders, activeSystem } = data;

    const navigateBar = (route: string) => {
        if (route === barnumber) return;
        router.push(`/bar/${route}/manage`);
    }

    const sendOrder = (orderId: number) => {
        sendMutation.mutateAsync({
            orderId,
        }, {
            onSuccess: () => {
                utils.getBarOrders.invalidate({ barnumber });
                toast.success("Bestelling verzonden!");
            },
            onError: (error) => {
                toast.error(error.message);
            }
        })
    }

    return (
        <div className="w-full px-8 flex flex-col gap-4 items-center justify-start">
            <div className="flex items-center justify-between w-full mb-4">
                <div className="w-full flex items-center justify-start gap-4">
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

                    <Select
                        onValueChange={(value) => navigateBar(value)}
                        defaultValue={barnumber}
                        disabled={!activeSystem?.bar.length}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Bar" />
                        </SelectTrigger>
                        <SelectContent>
                            {activeSystem?.bar
                                .filter((bar) => bar.bar_type === "BAR")
                                .map((bar) => (
                                    <SelectItem key={bar.id} value={String(bar.bar_number)}>
                                        {bar.bar_name}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline">
                    <Link
                        href={`/bar/${barnumber}`}
                    >
                        Bekijk modus
                    </Link>
                </Button>
            </div>
            <ScrollArea className="w-full min-h-[200px] h-[calc(100dvh-12rem)]">
                <table className="w-full border-collapse relative">
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
                        {orders
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
                                        {(order.drinks as unknown as OrderItem[])?.map((o) => (
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
    )
}

const BarTableSkeleton = () => {
    return (
        <div>
            Loading...
        </div>
    )
}
