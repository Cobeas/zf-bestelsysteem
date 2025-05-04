"use client";

import { ChartDataProps } from "./graphpage";

export const AllData = ({ data }: { data: ChartDataProps }) => {

    return (
        <div className="w-full grid-cols-1 md:grid-cols-2">
            <pre className="w-full text-wrap">
                {JSON.stringify(data.mostSnacksTable, null, 2)}
            </pre>
            <pre className="w-full text-wrap">
                {JSON.stringify(data.topFoodByTable, null, 2)}
            </pre>
        </div>
    )
}