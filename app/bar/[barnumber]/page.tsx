import { trpc } from "@/trpc/server";
import { BarViewTable } from "./_components/bar-view-table"
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Header from "@/components/header";

interface BarPageProps {
    params: Promise<{ barnumber: string }>
}

const BarViewPage = async ({ params }: BarPageProps) => {
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
                <BarViewTable barnumber={barnumber} />
            </div>
        </>
    )
}

export default BarViewPage
