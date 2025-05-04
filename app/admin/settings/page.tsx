import { HydrateClient, trpc } from "@/trpc/server"
import SystemPasswordForm from "./_components/password-form"
import SystemForm from "./_components/system-form";
import TafelIndeling from "./_components/tafel-indeling";
import ProductenForm from "./_components/producten-form";
import { MessageSender } from "./_components/message-sender";
import { cookies } from "next/headers";
import AdminLoginForm from "./_components/admin-loginform";
import Header from "@/components/header";

export const dynamic = "force-dynamic";

const SettingsPage = async () => {
    const cookieStore = await cookies();
    const session = cookieStore.get("zfadminsession");

    if (!session || session?.value !== "true") {
        return (
            <>
                <Header session={null} />
                <AdminLoginForm />
            </>
        )
    }

    void trpc.getSystemSettings.prefetch();

    return (
        <>
            <Header session={"admin"} />
            <HydrateClient>
                <div className="w-full max-w-screen-2xl grid grid-cols-1 md:grid-cols-2 gap-4 items-start justify-center p-4 md:p-8">
                    <div className="col-span-1 w-full">
                        <SystemForm />
                    </div>
                    <div className="col-span-1 w-full">
                        <SystemPasswordForm />
                    </div>
                    <div className="col-span-1 w-full">
                        <TafelIndeling />
                    </div>
                    <div className="col-span-1 w-full">
                        <ProductenForm />
                    </div>
                    <div className="col-span-1 w-full">
                        <MessageSender />
                    </div>
                </div>
            </HydrateClient>
        </>
    )
}

export default SettingsPage
