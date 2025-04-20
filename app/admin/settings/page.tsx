import { HydrateClient, trpc } from "@/trpc/server"
import SystemPasswordForm from "./_components/password-form"
import SystemForm from "./_components/system-form";
import TafelIndeling from "./_components/tafel-indeling";
import ProductenForm from "./_components/producten-form";
import { MessageSender } from "./_components/message-sender";

export const dynamic = "force-dynamic";

const SettingsPage = () => {
    void trpc.getSystemSettings.prefetch();

    return (
        <HydrateClient>
            <div className="w-full max-w-screen-2xl grid grid-cols-1 md:grid-cols-2 gap-4 items-start justify-center p-4 md:p-8">
                <SystemForm />
                <SystemPasswordForm />
                <TafelIndeling />
                <ProductenForm />
                <MessageSender />
            </div>
        </HydrateClient>
    )
}

export default SettingsPage
