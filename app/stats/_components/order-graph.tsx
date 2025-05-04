"use client";

import { LabelList, Pie, PieChart } from "recharts";
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartDataProps } from "./graphpage";

const chartConfig = {
    PENDING: {
        label: "Nieuw",
        color: "var(--chart-1)",
    },
    COMPLETED: {
        label: "Verzonden",
        color: "var(--chart-2)",
    },
} satisfies ChartConfig;

export const OrderGraph = ({ data }: { data: ChartDataProps }) => {

    const pieData = Array.from(Object.entries(data.orderCounts)
        .map(([key, value]) => ({ status: key, value, fill: chartConfig[key as keyof typeof chartConfig]?.color })))
    return (
        <div className="w-full flex flex-col items-center justify-start">
            <span className="w-full text-start text-2xl font-semibold">
                Bestellingen
            </span>
            <div className="w-full">
                <ChartContainer
                    config={chartConfig}
                >
                    <PieChart>
                        <ChartTooltip
                            content={<ChartTooltipContent nameKey="status" hideLabel />}
                        />
                        <Pie
                            data={pieData}
                            dataKey="value"

                        >
                            <LabelList
                                dataKey="status"
                                className="fill-foreground"
                                stroke="none"
                                fontSize={"1rem"}
                                formatter={(value: keyof typeof chartConfig) =>
                                    `${chartConfig[value]?.label} (${pieData.find((d) => d.status === value)?.value})`
                                }
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </div>
        </div>
    )
}