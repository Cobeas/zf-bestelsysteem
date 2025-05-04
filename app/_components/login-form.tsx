"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const LoginForm = () => {
    const router = useRouter();
    const mutation = trpc.login.useMutation();

    async function handleSubmit(data: FormData) {
        const password = data.get("password") as string;
        if (!password) return;

        mutation.mutateAsync({
            password
        }, {
            onSuccess: (data) => {
                if (data.success) {
                    router.push("/bestellen");
                    return;
                }
                if (data.isValidPassword === false) {
                    toast.error("Wachtwoord is onjuist.")
                    return;
                }
                toast.error("Er is iets mis gegaan met inloggen. Probeer het opnieuw.")
            },
            onError: (error) => {
                toast.error(error.message)
            }
        })
    }

    return (
        <div className="w-full max-w-xs mx-auto mt-10">
            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleSubmit(formData);
            }}>
                <Input
                    type="password"
                    name="password"
                    placeholder="Wachtwoord"
                />
                <Button
                    type="submit"
                    className="w-full mt-4"
                >
                    🍺 Inloggen 🍺
                </Button>
            </form>
        </div>
    )
}

export default LoginForm
