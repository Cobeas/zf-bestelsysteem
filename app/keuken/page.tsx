import Header from '@/components/header';
import { trpc } from '@/trpc/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react'
import KitchenTable from './_components/kitchen-table';

const KeukenPage = async () => {
    const cookieStore = await cookies();
    const userSession = cookieStore.get("zfsession");
    const adminSession = cookieStore.get("zfadminsession");

    const session = adminSession || userSession;
    if (!session || session?.value !== "true") {
        return redirect("/");
    }

    void trpc.getKitchenOrders.prefetch({});

    return (
        <>
            <Header session={adminSession ? "admin" : userSession ? "user" : null} />
            <div className='flex flex-col items-center justify-start p-4 w-full h-full'>
                <KitchenTable />
            </div>
        </>
    )
}

export default KeukenPage
