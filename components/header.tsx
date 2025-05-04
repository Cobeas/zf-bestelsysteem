import Image from "next/image";
import { ModeToggle } from "./ui/mode-toggle";
import Link from "next/link";
import { LogoutButton } from "./logout-button";
import MobileMenu from "./mobile-menu";

export default async function Header({
    session = null,
}: {
    session: "admin" | "user" | null;
}) {
    return (
        <div className="w-full h-16 shadow-md flex items-center justify-between px-4">
            <Link href="/">
                <Image
                    src="/logo.png"
                    alt="Logo"
                    width={106}
                    height={38}
                />
            </Link>
            <div className="hidden md:flex items-center justify-end w-fit gap-4">
                {session && <LogoutButton />}
                {session && ["admin", "user"].includes(session) ? <Link href={"/bestellen"} className="px-2 py-1 border rounded-lg border-muted-foreground">Bestelformulier</Link> : null}
                {session && ["admin", "user"].includes(session) ? <Link href={"/bar/1"} className="px-2 py-1 border rounded-lg border-muted-foreground">Bar</Link> : null}
                {session && ["admin", "user"].includes(session) ? <Link href={"/keuken"} className="px-2 py-1 border rounded-lg border-muted-foreground">Keuken</Link> : null}
                {session === "admin" ? <Link href={"/admin/settings"} className="px-2 py-1 border rounded-lg border-muted-foreground">Admin</Link> : null}
                <ModeToggle />
            </div>
            <MobileMenu session={session} />
        </div>
    )
}
