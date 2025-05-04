"use client";

import { trpc } from "@/trpc/client";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const LogoutButton = () => {
    const router = useRouter();
    const mutation = trpc.logout.useMutation();

    async function logout() {
        mutation.mutateAsync(undefined, {
            onSuccess: () => {
                toast.success("Je bent uitgelogd.");
                router.push("/");
            },
            onError: (error) => {
                toast.error(error.message)
            }
        })
    }
    return (
        <Button onClick={logout}>
            Uitloggen
        </Button>
    )
}