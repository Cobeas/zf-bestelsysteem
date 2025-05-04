import Header from "@/components/header";
import { HydrateClient, trpc } from "@/trpc/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GraphPage } from "./_components/graphpage";

export const dynamic = "force-dynamic";

const StatsPage = async () => {
    const cookieStore = await cookies();
    const userSession = cookieStore.get("zfsession");
    const adminSession = cookieStore.get("zfadminsession");

    const session = adminSession || userSession;
    if (!session || session?.value !== "true") {
        return redirect("/");
    }

    void trpc.getStatistics.prefetch();

    return (
        <>
            <Header session={adminSession ? "admin" : userSession ? "user" : null} />
            <HydrateClient>
                <GraphPage />
            </HydrateClient>
        </>
    )
}

export default StatsPage
