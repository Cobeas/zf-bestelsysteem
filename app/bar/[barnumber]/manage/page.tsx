import { HydrateClient, trpc } from "@/trpc/server";
import BarTable from "./_components/bar-table";
import Header from "@/components/header";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface BarPageProps {
    params: Promise<{ barnumber: string }>
}

export const dynamic = 'force-dynamic';

const BarPage = async ({ params }: BarPageProps) => {
    const cookieStore = await cookies();
    const userSession = cookieStore.get("zfsession");
    const adminSession = cookieStore.get("zfadminsession");
    const { barnumber } = await params;

    const session = adminSession || userSession;
    if (!session || session?.value !== "true") {
        return redirect("/");
    }

    void trpc.getBarOrders.prefetch({
        barnumber,
    });

    return (
        <>
            <Header session={adminSession ? "admin" : userSession ? "user" : null} />
            <div className="w-full flex flex-col p-4 items-center justify-start">
                <HydrateClient>
                    <BarTable barnumber={barnumber} />
                </HydrateClient>
            </div>
        </>
    )
}

export default BarPage
