import { HydrateClient, trpc } from "@/trpc/server"
import OrderForm from "./_components/order-form"

const OrderFormPage = () => {
    void trpc.getOrderProducts.prefetch();

    return (
        <div className="flex flex-col items-center justify-start p-4 w-full h-full">
            <HydrateClient>
                <OrderForm />
            </HydrateClient>
        </div>
    )
}

export default OrderFormPage
