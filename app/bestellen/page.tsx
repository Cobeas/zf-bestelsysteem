import { HydrateClient, trpc } from "@/trpc/server"
import OrderForm from "./_components/order-form"
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Header from "@/components/header";

const OrderFormPage = async () => {
    const cookieStore = await cookies();
    const userSession = cookieStore.get("zfsession");
    const adminSession = cookieStore.get("zfadminsession");

    const session = adminSession || userSession;
    if (!session || session?.value !== "true") {
        return redirect("/");
    }
    void trpc.getOrderProducts.prefetch();

    return (
        <>
            <Header session={adminSession ? "admin" : userSession ? "user" : null} />
            <div className="flex flex-col items-center justify-start p-4 w-full h-full">
                <HydrateClient>
                    <OrderForm />
                </HydrateClient>
            </div>
        </>
    )
}

export default OrderFormPage
