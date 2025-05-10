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

export const DrinkChart = ({ data }: { data: ChartDataProps | undefined }) => {
    if (!data) {
        return null;
    };

    const drinks = data.orderedDrinks
        .map((item, index) => ({
            name: item.name,
            value: item.quantity,
            fill: colorPalette[index % colorPalette.length],
        }));

    const chartConfig: ChartConfig = Object.fromEntries(
        drinks.map((item) => [
            item.name,
            {
                label: item.name,
                color: item.fill,
            },
        ])
    );

    return (
        <div className="w-full flex md:col-span-2 flex-col items-center justify-start">
            <span className="w-full text-start text-2xl font-semibold capitalize">
                Totaal Drank
            </span>
            <div className="w-full">
                <ChartContainer config={chartConfig}>
                    <BarChart
                        accessibilityLayer
                        data={drinks}
                        margin={{ top: 20, bottom: 20, }}
                    >
                        <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            angle={-45}
                            textAnchor="center"
                            style={{ visibility: "hidden" }}
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