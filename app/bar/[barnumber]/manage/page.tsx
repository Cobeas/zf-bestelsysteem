import { HydrateClient, trpc } from "@/trpc/server";
import BarTable from "./_components/bar-table";

interface BarPageProps {
    params: Promise<{ barnumber: string }>
}

export const dynamic = 'force-dynamic';

const BarPage = async ({ params }: BarPageProps) => {
    const { barnumber } = await params;
    void trpc.getBarOrders.prefetch({
        barnumber,
    });

    return (
        <div className="w-full flex flex-col p-4 items-center justify-start">
            <HydrateClient>
                <BarTable barnumber={barnumber} />
            </HydrateClient>
        </div>
    )
}

export default BarPage
