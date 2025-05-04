"use client";

import { trpc } from "@/trpc/client";
import { OrderGraph } from "./order-graph";
import { DrinkChart } from "./drink-chart";
import { BierChart } from "./bier-chart";
// import { AllData } from "./all-data";
import { CachedProduct } from "@/trpc/routers/_app";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { FoodChart } from "./food-chart";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { TopFoodChart } from "./top-food-chart";

export interface ChartDataProps {
    orderCounts: { [k: string]: number; };
    topTables: { [k: string]: number; };
    orderedFoods: {
        product_id: string;
        name: string;
        quantity: number;
    }[];
    orderedDrinks: {
        product_id: string;
        name: string;
        quantity: number;
    }[];
    allProducts: CachedProduct[] | undefined;
    orderedBeers: [number, number][];
    orderedRoseBeers: [number, number][];
    mostSnacksTable: {
        table: number;
        quantity: number;
    };
    topFoodByTable: {
        food: string;
        table_number: number;
        quantity: number;
    }[];
}

export const GraphPage = () => {
    return (
        <ErrorBoundary fallback={<div>Er is iets fout gegaan...</div>}>
            <Suspense fallback={<GraphPageSkeleton />}>
                <GraphPageSuspense />
            </Suspense>
        </ErrorBoundary>
    )
}

const GraphPageSuspense = () => {
    const { data: initialData, refetch } = trpc.getStatistics.useQuery(undefined, {
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5,
    });
    trpc.realtime.onNewData.useSubscription(undefined, {
        onData: () => {
            refetch();
        }
    })

    if (!initialData) {
        return <GraphPageSkeleton />
    }

    return (
        <div className="w-full max-w-screen-2xl h-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:px-8">
            <Card>
                <CardContent>
                    <OrderGraph data={initialData} />
                </CardContent>
            </Card>
            <Card>
                <CardContent>
                    <TopFoodChart data={initialData} />
                </CardContent>
            </Card>
            <Card>
                <CardContent>
                    <FoodChart data={initialData} />
                </CardContent>
            </Card>
            <Card>
                <CardContent>
                    <DrinkChart data={initialData} />
                </CardContent>
            </Card>
            <Card>
                <CardContent>
                    <BierChart bier="bier" data={initialData} />
                </CardContent>
            </Card>
            <Card>
                <CardContent>
                    <BierChart bier="rosé bier" data={initialData} />
                </CardContent>
            </Card>
            {/* <AllData data={initialData} /> */}
        </div>
    )
}

const GraphPageSkeleton = () => {
    return (
        <div>Loading...</div>
    )
}