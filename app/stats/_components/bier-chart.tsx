"use client";

import { Bar, BarChart, XAxis, YAxis, LabelList } from "recharts"
import {
    ChartConfig,
    ChartContainer,
} from "@/components/ui/chart"
import { ChartDataProps } from "./graphpage";

const chartConfig = {
    bier: {
        label: "Rosé Bier",
        color: "var(--chart-1)",
    },
    rosé_bier: {
        label: "Rosé Bier",
        color: "var(--chart-2)",
    },
    ...Array.from({ length: 10 }, (_, i) => {
        const index = i + 1;
        return {
            [index]: {
                label: `Tafel ${index}`,
                color: `var(--chart-1)`,
            },
        };
    }).map((item) => item).reduce((acc, item) => ({ ...acc, ...item }), {}),
} satisfies ChartConfig;

export const BierChart = ({ bier, data }: { bier: "bier" | "rosé bier", data: ChartDataProps | undefined }) => {
    if (!data) {
        return null;
    };

    const bierData = data.orderedBeers
        .map((item) => ({ tafel: item[0], value: item[1], fill: chartConfig["bier"].color }))
    const roseBierData = data.orderedRoseBeers
        .map((item) => ({ tafel: item[0], value: item[1], fill: chartConfig["rosé_bier"].color }))

    if (bier === "bier") {
        return (
            <div className="w-full flex flex-col items-center justify-start">
                <span className="w-full text-start text-2xl font-semibold capitalize">
                    Meeste {bier} <span className="text-sm">(vertaald naar enkele porties)</span>
                </span>
                <div className="w-full">
                    <ChartContainer config={chartConfig}>
                        <BarChart
                            accessibilityLayer
                            data={bierData}
                            layout="vertical"
                            margin={{ left: -20 }}
                        >
                            <XAxis type="number" dataKey="value" hide />
                            <YAxis
                                type="category"
                                dataKey={"tafel"}
                                hide
                            />
                            <Bar
                                dataKey="value"
                                fill={chartConfig[bier]?.color}
                                radius={5}
                            >
                                <LabelList
                                    dataKey="tafel"
                                    position="insideLeft"
                                    offset={30}
                                    className="fill-white"
                                    fontSize={"1rem"}
                                    width={100}
                                    formatter={(value: keyof typeof chartConfig) =>
                                        `${chartConfig[value]?.label} (${bierData.find((d) => d.tafel === Number(value))?.value})`
                                    }
                                />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full flex flex-col items-center justify-start">
            <span className="w-full text-start text-2xl font-semibold capitalize">
                Meeste {bier} <span className="text-sm">(vertaald naar enkele porties)</span>
            </span>
            <div className="w-full">
                <ChartContainer config={chartConfig}>
                    <BarChart
                        accessibilityLayer
                        data={roseBierData}
                        layout="vertical"
                        margin={{ left: -20 }}
                    >
                        <XAxis type="number" dataKey="value" hide />
                        <YAxis
                            type="category"
                            dataKey={"tafel"}
                            hide
                        />
                        <Bar
                            dataKey="value"
                            fill={chartConfig["rosé_bier"]?.color}
                            radius={5}
                        >
                            <LabelList
                                dataKey="tafel"
                                position="insideLeft"
                                offset={30}
                                className="fill-foreground"
                                fontSize={"1rem"}
                                width={100}
                                formatter={(value: keyof typeof chartConfig) =>
                                    `${chartConfig[value]?.label} (${roseBierData.find((d) => d.tafel === Number(value))?.value})`
                                }
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </div>
        </div>
    )
}