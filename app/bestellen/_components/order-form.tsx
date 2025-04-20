"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { product_type } from "@prisma/client";
import { trpc } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
    id: z.string(),
    table: z.string().refine((val) => { return val !== "" }, {
        message: "Tafel is verplicht",
    }),
    order: z.record(z.string(), z.string().optional()),
});

interface OrderData {
    id: number;
    name: string;
    drinks: {
        product_id: string;
        product_name: string;
        product_type: product_type;
    }[];
    foods: {
        product_id: string;
        product_name: string;
        product_type: product_type;
    }[];
}

function createEmptyOrder(data: OrderData) {
    const order: Record<string, string> = {};
    console.log({ data });
    data.drinks.forEach((p: OrderData["drinks"][number]) => (order[p.product_id] = ""));
    data.foods.forEach((p: OrderData["foods"][number]) => (order[p.product_id] = ""));

    return order;
}

const OrderForm = () => {
    return (
        <ErrorBoundary fallback={<div>Something went wrong...</div>}>
            <Suspense fallback={<OrderFormSkeleton />}>
                <OrderFormSuspense />
            </Suspense>
        </ErrorBoundary>
    )
}

export default OrderForm

const OrderFormSuspense = () => {
    const [data] = trpc.getOrderProducts.useSuspenseQuery();
    const orderMutation = trpc.makeOrder.useMutation();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: String(data.id),
            table: "",
            order: {}
        }
    });

    const sendOrder = (orderData: z.infer<typeof formSchema>) => {
        orderMutation.mutateAsync({
            ...orderData,
        }, {
            onSuccess: (info) => {
                toast.success("Bestelling geplaatst", {
                    description: `${info.totalPrice} Munten`,
                    duration: 50000,
                });
                form.reset({
                    id: String(data.id),
                    table: "",
                    order: createEmptyOrder(data as OrderData),
                });
            },
            onError: (error) => {
                toast.error(error.message)
            }
        })
    };

    return (
        <div className="flex flex-col w-full max-w-screen-md md:border border-muted-foreground items-center justify-start rounded-2xl p-4">
            <h2 className="text-2xl font-bold mb-4">{data?.name}</h2>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(sendOrder)}>
                    <FormField
                        control={form.control}
                        name="id"
                        render={() => (
                            <FormItem className="w-full grid grid-cols-3 gap-4">
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="Tafel"
                                        defaultValue={data?.id}
                                        className="col-span-2"
                                        hidden
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="table"
                        render={({ field }) => (
                            <FormItem className="w-full grid grid-cols-3 gap-4">
                                <FormLabel>Tafel</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="Tafel"
                                        {...field}
                                        className="col-span-2"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {data?.drinks?.
                        sort((a, b) => a.position - b.position)
                        .map((product, index) => (
                            <FormField
                                key={`drink-${index}`}
                                control={form.control}
                                name={`order.${product.product_id}`}
                                render={({ field }) => (
                                    <FormItem className="w-full grid grid-cols-3 gap-4">
                                        <FormLabel>{product.product_name}</FormLabel>
                                        <FormControl>
                                            <ToggleGroup
                                                type="single"
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                disabled={orderMutation.isPending}
                                                className="w-full col-span-2"
                                                aria-label={product.product_name}
                                            >
                                                <ToggleGroupItem value="1" className="w-full" aria-label="1">1</ToggleGroupItem>
                                                <ToggleGroupItem value="2" className="w-full" aria-label="2">2</ToggleGroupItem>
                                                <ToggleGroupItem value="3" className="w-full" aria-label="3">3</ToggleGroupItem>
                                                <ToggleGroupItem value="4" className="w-full" aria-label="4">4</ToggleGroupItem>
                                                <ToggleGroupItem value="5" className="w-full" aria-label="5">5</ToggleGroupItem>
                                            </ToggleGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ))}
                    {data?.foods?.
                        sort((a, b) => a.position - b.position)
                        .map((product, index) => (
                            <FormField
                                key={`food-${index}`}
                                control={form.control}
                                name={`order.${product.product_id}`}
                                render={({ field }) => (
                                    <FormItem className="w-full grid grid-cols-3 gap-4">
                                        <FormLabel>{product.product_name}</FormLabel>
                                        <FormControl>
                                            <ToggleGroup
                                                type="single"
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                disabled={orderMutation.isPending}
                                                className="w-full col-span-2"
                                                aria-label={product.product_name}
                                            >
                                                <ToggleGroupItem value="1" className="w-full" aria-label="1">1</ToggleGroupItem>
                                                <ToggleGroupItem value="2" className="w-full" aria-label="2">2</ToggleGroupItem>
                                                <ToggleGroupItem value="3" className="w-full" aria-label="3">3</ToggleGroupItem>
                                                <ToggleGroupItem value="4" className="w-full" aria-label="4">4</ToggleGroupItem>
                                                <ToggleGroupItem value="5" className="w-full" aria-label="5">5</ToggleGroupItem>
                                            </ToggleGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ))}
                    <Button
                        type="submit"
                        className="w-full mt-4"
                        disabled={orderMutation.isPending}
                    >
                        Bestellen
                    </Button>
                </form>
            </Form>
        </div>
    )
}

const OrderFormSkeleton = () => {
    return (
        <div className="flex flex-col w-full max-w-screen-md md:border border-muted-foreground items-center justify-start rounded-2xl p-4">
            <Skeleton className="h-8 w-1/3 mb-4" />
            <div className="grid grid-cols-3 gap-2 w-[376px] max-w-screen items-center">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-9 w-full col-span-2" />
                {Array.from({ length: 8 }, (_, index) => (
                    <div key={index} className="col-span-3 grid grid-cols-3 gap-4 w-full items-center">
                        <Skeleton className="h-6 w-16" />
                        <div className="col-span-2 flex items-center justify-start gap-x-2">
                            <Skeleton className="h-9 w-11" />
                            <Skeleton className="h-9 w-11" />
                            <Skeleton className="h-9 w-11" />
                            <Skeleton className="h-9 w-11" />
                            <Skeleton className="h-9 w-11" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}