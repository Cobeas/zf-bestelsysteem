"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/trpc/client";
import { Message } from "@/trpc/routers/messages";
import { product_type } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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

export const BarViewTable = ({ barnumber }: BarTableProps) => {
    const router = useRouter();
    const { data, refetch } = trpc.getBarOrders.useQuery({ barnumber });
    const [sort, setSort] = useState<'asc' | 'desc'>('asc');

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

    const navigateBar = (route: string) => {
        if (route === barnumber) return;
        router.push(`/bar/${route}`);
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
                        disabled={!data?.activeSystem?.bar.length}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Bar" />
                        </SelectTrigger>
                        <SelectContent>
                            {data?.activeSystem?.bar
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
                        href={`/bar/${barnumber}/manage`}
                    >
                        Verwerk bestellingen
                    </Link>
                </Button>
            </div>
            <ScrollArea className="w-full min-h-[200px] h-[calc(100dvh-12rem)]">
                <table className="w-full border-collapse relative text-2xl">
                    <thead className="w-full sticky top-0 z-10">
                        <tr className="flex flex-row w-full justify-between items-center bg-accent text-accent-foreground p-2 rounded-lg shadow-md">
                            <th className="w-1/6 text-start">Bestelling</th>
                            <th className="w-1/6 text-start">Tafel</th>
                            <th className="w-4/6 text-start">Producten</th>
                        </tr>
                    </thead>
                    <tbody className="w-full">
                        {data?.orders
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
                                    <td className="w-4/6">
                                        {(order.drinks as unknown as OrderItem[])?.map((o) => (
                                            <div key={o.product_id}>{o.quantity} {o.name}</div>
                                        ))}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </ScrollArea>
        </div>
    )
}
