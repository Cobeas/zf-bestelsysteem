"use client";

import { cn } from "@/lib/utils";
import { MenuIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { LogoutButton } from "./logout-button";
import Link from "next/link";
import { ModeToggle } from "./ui/mode-toggle";


export default function MobileMenu({ session }: { session: "admin" | "user" | null; }) {
    const [open, setOpen] = useState<boolean>(false);

    return (
        <div
            className={cn(
                "absolute z-50 block md:hidden w-8 h-8 rounded-sm shadow-sm bg-background transition-all duration-500 ease-in-out",
                open ? "top-0 right-0 w-full h-full" : "top-4 right-4"
            )}
            onClick={() => setOpen(!open)}
        >
            {open ? (
                <XIcon
                    className={"size-8 ml-auto mt-4 mr-4"}
                    onClick={() => setOpen(!open)}
                />
            ) : (
                <MenuIcon
                    className={"size-8"}
                    onClick={() => setOpen(!open)}
                />
            )}
            <div className={cn(
                "flex flex-col gap-4 w-full p-4 items-center justify-center transition-all duration-500 delay-1000 ease-in-out",
                open ? "flex opacity-100" : "hidden opacity-0",
            )}>
                {session && ["admin", "user"].includes(session) ? <Link href={"/bestellen"} className="px-2 py-1 border rounded-lg border-muted-foreground w-full">Bestelformulier</Link> : null}
                {session && ["admin", "user"].includes(session) ? <Link href={"/bar/1"} className="px-2 py-1 border rounded-lg border-muted-foreground w-full">Bar</Link> : null}
                {session && ["admin", "user"].includes(session) ? <Link href={"/keuken"} className="px-2 py-1 border rounded-lg border-muted-foreground w-full">Keuken</Link> : null}
                {session === "admin" ? <Link href={"/admin/settings"} className="px-2 py-1 border rounded-lg border-muted-foreground w-full">Admin</Link> : null}
                <div className="w-full flex items-center justify-between gap-4">
                    <ModeToggle />
                    {session && <LogoutButton />}
                </div>
            </div>
        </div>
    )
}
