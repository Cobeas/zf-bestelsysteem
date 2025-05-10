"use client";

import { ChartDataProps } from "./graphpage";
import { Bar, BarChart, LabelList, XAxis } from "recharts";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

const colorPalette = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

export const TopFoodChart = ({ data }: { data: ChartDataProps | undefined }) => {
    if (!data) {
        return null;
    };

    const foods = data.topFoodByTable
        .map((item, index) => ({
            name: item.food,
            value: item.quantity,
            table: item.table_number,
            fill: colorPalette[index % colorPalette.length],
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const chartConfig: ChartConfig = Object.fromEntries(
        foods.map((item) => [
            item.name,
            {
                label: item.name,
                color: item.fill,
            },
        ])
    );

    return (
        <div className="w-full flex flex-col items-center justify-start">
            <span className="w-full text-start text-2xl font-semibold capitalize">
                Meeste Snacks
                <br />
                <span className="text-sm">
                    Tafel met de meeste snacks: tafel {data.mostSnacksTable.table} ({data.mostSnacksTable.quantity} porties)
                </span>
            </span>
            <div className="w-full">
                <ChartContainer config={chartConfig}>
                    <BarChart
                        accessibilityLayer
                        data={foods}
                        margin={{ top: 40, bottom: 20, }}
                    >
                        <XAxis
                            dataKey="table"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            tickFormatter={(value) => `Tafel ${value}`}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent nameKey="value" hideLabel />}
                        />
                        <Bar dataKey={"value"} fill="var(--chart-1)" radius={5}>
                            <LabelList
                                position="top"
                                offset={12}
                                className="fill-foreground"
                                fontSize={"1rem"}
                                dataKey={"value"}
                            />
                            <LabelList
                                position="center"
                                offset={0}
                                className="fill-white"
                                fontSize={"1rem"}
                                dataKey={"name"}
                                angle={-45}
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </div>
        </div>
    )
}