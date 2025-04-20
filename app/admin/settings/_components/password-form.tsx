"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { useSettingsStore } from "@/stores/settings-store";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const passwordFormSchema = z.object({
    user_password: z.string(),
    admin_password: z.string(),
});

const SystemPasswordForm = () => {
    return (
        <ErrorBoundary fallback={<div>Something went wrong</div>}>
            <Suspense fallback={<SystemPasswordFormSkeleton />}>
                <SystemPasswordFormSuspense />
            </Suspense>
        </ErrorBoundary>
    )
}

export default SystemPasswordForm;

const SystemPasswordFormSuspense = () => {
    const { id, name } = useSettingsStore((state) => (state));
    const mutation = trpc.setSystemSettings.useMutation();

    const form = useForm<z.infer<typeof passwordFormSchema>>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: {
            user_password: "",
            admin_password: "",
        },
    });

    function onSubmit(data: z.infer<typeof passwordFormSchema>) {
        mutation.mutateAsync({
            user_password: data.user_password,
            admin_password: data.admin_password,
            id: id.toString(),
        }, {
            onSuccess: () => {
                toast.success("Wachtwoorden zijn succesvol ingesteld.");
            },
            onError: (error) => {
                toast.error(error.message);
            }
        })
    };

    return (
        <div className='border border-red-500 rounded-lg p-4 min-h-full shadow-md'>
            <h2 className="text-lg font-semibold mb-4">Systeem Wachtwoorden {name ? `voor ${name}` : ''}</h2>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="user_password"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-3 gap-4 items-center jutify-start">
                                <FormLabel>User Wachtwoord</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="password"
                                        placeholder="Voer een nieuw gebruikers wachtwoord in"
                                        className="col-span-2 w-full"
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="admin_password"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-3 gap-4 items-center jutify-start">
                                <FormLabel>Admin Wachtwoord</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="password"
                                        placeholder="Voer een nieuw admin wachtwoord in"
                                        className="col-span-2 w-full"
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <Button
                        type="submit"
                        className="w-fit"
                        disabled={mutation.isPending}
                    >
                        Opslaan
                    </Button>
                </form>
            </Form>
        </div>
    )
}

const SystemPasswordFormSkeleton = () => {
    return (
        <div className='border border-red-500 rounded-lg p-4 min-h-full shadow-md'>
            <h2 className="text-lg font-semibold mb-4">Systeem Wachtwoorden</h2>
            <div className="grid grid-cols-3 gap-4 items-center justify-start">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="col-span-2 h-8 w-full" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="col-span-2 h-8 w-full" />
                <Skeleton className="h-8 w-1/2" />
            </div>
        </div>
    )
}