import { cookies } from "next/headers";
import LoginForm from "./_components/login-form";
import Header from "@/components/header";
import Link from "next/link";

export default async function Home() {
  const cookieStore = await cookies();
  const userSession = cookieStore.get("zfsession");
  const adminSession = cookieStore.get("zfadminsession");

  const session = adminSession || userSession;

  if (!session || session?.value !== "true") {
    return (
      <>
        <Header session={adminSession ? "admin" : userSession ? "user" : null} />
        <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] p-24">
          <h1 className="text-2xl font-bold">Inloggen</h1>
          <LoginForm />
        </div>
      </>
    );
  }

  return (
    <>
      <Header session={adminSession ? "admin" : userSession ? "user" : null} />
      <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] p-24">
        <span>Welkom. Je bent ingelogd. Kies hier onder wat je wilt doen</span>
        <div className="flex items-center justify-center gap-4 mt-4">
          <Link href="/bestellen" className="px-2 py-1 border rounded-lg border-muted-foreground">
            Bestelformulier
          </Link>
          <Link href="/bar/1" className="px-2 py-1 border rounded-lg border-muted-foreground">
            Bekijk een bar
          </Link>
          {adminSession?.value === "true" ? (
            <Link href="/admin/settings" className="px-2 py-1 border rounded-lg border-muted-foreground">
              Admin instellingen
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}
