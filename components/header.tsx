import Image from "next/image";
import { ModeToggle } from "./ui/mode-toggle";
import Link from "next/link";

export default function Header() {
    return (
        <div className="w-full h-16 shadow-md flex items-center justify-between px-4">
            <Image
                src="/logo.png"
                alt="Logo"
                width={106}
                height={38}
            />
            <div className="hidden md:flex items-center justify-end w-fit gap-4">
                <Link href={"/bestellen"} className="px-2 py-1 border rounded-lg border-muted-foreground">Bestelformulier</Link>
                <Link href={"/admin/settings"} className="px-2 py-1 border rounded-lg border-muted-foreground">Admin</Link>
                <ModeToggle />
            </div>
        </div>
    )
}
