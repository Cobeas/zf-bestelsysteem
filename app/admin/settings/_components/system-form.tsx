"use client";

import { trpc } from "@/trpc/client"
import { setSystemSettingsSchema } from "@/trpc/schemas/system-schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useSettingsStore } from "@/stores/settings-store";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SystemForm = () => {
    return (
        <ErrorBoundary fallback={<div>Something went wrong</div>}>
            <Suspense fallback={<SystemFormSkeleton />}>
                <SystemFormSuspense />
            </Suspense>
        </ErrorBoundary>
    )
}

export default SystemForm;

const SystemFormSuspense = () => {
    const { id, name, live } = useSettingsStore((state) => (state));
    const [settings] = trpc.getSystemSettings.useSuspenseQuery();
    const mutation = trpc.setSystemSettings.useMutation();
    const deleteMutation = trpc.deleteSystemSettings.useMutation();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (settings.length && id === 0) {
            const liveSettings = settings.find((item) => item.live);
            if (liveSettings) {
                useSettingsStore.setState({
                    id: liveSettings.id,
                    name: liveSettings.name || "",
                    live: liveSettings.live,
                });
            }
        }
    }, [settings, id]);

    const menuItems = [
        ...settings.map((item) => ({
            value: item.id,
            label: item.name,
        })),
        { value: Math.max(...settings.map((item) => item.id), 0) + 1, label: "Maak een nieuw systeem" },
    ];

    const form = useForm<z.infer<typeof setSystemSettingsSchema>>({
        resolver: zodResolver(setSystemSettingsSchema),
        defaultValues: {
            system_name: "",
            user_password: "",
            live: false,
            id: undefined,
        },
    });

    const deleteSettings = useCallback(() => {
        deleteMutation.mutateAsync({ id }, {
            onSuccess: () => {
                toast.success("Instellingen zijn succesvol verwijderd.");
                window.location.reload();
            },
            onError: (error) => {
                toast.error(error.message);
            },
        });
    }, [deleteMutation, id]);

    function onSubmit(data: z.infer<typeof setSystemSettingsSchema>) {
        mutation.mutateAsync({
            ...data,
        }, {
            onSuccess: (data) => {
                toast.success("Systeem instellingen zijn succesvol opgeslagen.");
                useSettingsStore.setState({
                    id: data.id,
                    name: data.name || "",
                    live: data.live,
                });
            },
            onError: (error) => {
                toast.error(error.message);
            }
        })
    };

    useEffect(() => {
        if (id) {
            form.setValue("id", id.toString());
            form.setValue("system_name", name || "");
            form.setValue("user_password", "");
            form.setValue("live", live || false);
        } else {
            form.reset();
        }
    }, [id, name, live, form]);

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Weet je het zeker</DialogTitle>
                        <DialogDescription>
                            Hiermeer verwijder je alle instellingen. Dit kan niet ongedaan gemaakt worden.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-between">
                        <DialogClose asChild>
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Annuleren
                            </Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={deleteSettings}
                        >
                            Verwijder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className='border border-neutral-600 rounded-lg p-4 min-h-full shadow-md'>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold mb-4">Systeem Instellingen</h2>
                    <Button variant="destructive" onClick={() => setOpen(true)} disabled={settings.length === 0}>
                        Verwijder
                    </Button>
                </div>
                <p>
                    {settings.length ? "Pas hier de instellingen aan" : "Maak hier een systeem aan"}
                </p>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="id"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-3 gap-4">
                                    <FormLabel>Systeem</FormLabel>
                                    <FormControl>
                                        <Select
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                console.log(value);
                                                const selectedItem = settings.find((item) => item.id === parseInt(value));
                                                useSettingsStore.setState({
                                                    id: selectedItem?.id || settings.length + 1,
                                                    name: selectedItem?.name || undefined,
                                                    live: selectedItem?.live || false,
                                                });
                                            }}
                                            defaultValue={settings.length ? String(settings.find((s) => s.live)?.id) : undefined}
                                        >
                                            <SelectTrigger className="col-span-2 w-full">
                                                <SelectValue placeholder="Selecteer een systeem" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {menuItems.map((item) => (
                                                    <SelectItem key={item.value} value={String(item.value)}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="system_name"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-3 gap-4">
                                    <FormLabel>Systeem Naam</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="col-span-2" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="user_password"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-3 gap-4">
                                    <FormLabel>User Wachtwoord</FormLabel>
                                    <FormControl>
                                        <Input {...field} type="password" className="col-span-2" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="live"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-3 gap-4">
                                    <FormLabel>Maak Live</FormLabel>
                                    <FormControl>
                                        <Switch
                                            {...field}
                                            checked={field.value || false}
                                            value={field.value ? "true" : "false"}
                                            onCheckedChange={field.onChange}
                                            className="col-span-2"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="col-span-3">Opslaan</Button>
                    </form>
                </Form>
            </div>
        </>
    )
}

const SystemFormSkeleton = () => {
    return (
        <div className='border border-neutral-600 rounded-lg p-4'>
            <h2 className="text-lg font-semibold mb-4">Systeem Instellingen</h2>
            <Skeleton className="h-4 w-1/2 mb-4" />
            <div className="grid grid-cols-3 gap-4 items-center justify-start">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="col-span-2 h-8 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="col-span-2 h-8 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="col-span-2 h-8 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="col-span-2 h-6 rounded-xl w-12" />
                <Skeleton className="h-8 w-1/2" />
            </div>
        </div>
    )
}
