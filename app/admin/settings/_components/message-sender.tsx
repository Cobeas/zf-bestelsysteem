"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { trpc } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
    message: z.string(),
})

export const MessageSender = () => {
    const mutation = trpc.realtime.sendMessage.useMutation();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            message: '',
        }
    })

    const sendMessage = (data: { message: string }) => {
        const { message } = data;
        mutation.mutate({
            message,
        }, {
            onSuccess: () => {
                toast.success("Message sent")
            },
            onError: (error) => {
                toast.error(error.message)
            }
        })
    }

    return (
        <div className='border border-neutral-600 rounded-lg p-4 min-h-full shadow-md col-span-2'>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(sendMessage)} className="flex flex-col gap-4">
                    <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-fit">
                        Stuur bericht
                    </Button>
                </form>
            </Form>
        </div>
    )
}
