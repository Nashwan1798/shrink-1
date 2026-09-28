import { pixelButtonClass } from "@/app/components/PixelButton";
import { requireUser } from "@/lib/server/auth/current";

import Steps from "./Steps";

export const dynamic = "force-dynamic";

export default async function WelcomeLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/welcome");
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background text-foreground">
      <div className="hazard-thin" aria-hidden />
      <header className="flex items-center justify-between gap-4 px-[var(--gutter)] py-3">
        <span className="wordmark text-[1.6rem] leading-none tracking-tight">SHRINK</span>
        <form action="/api/auth/signout" method="post">
          <button type="submit" className={`${pixelButtonClass} text-[0.75rem]`}>
            sign out
          </button>
        </form>
      </header>
      <hr className="rule" />
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col px-[var(--gutter)] py-[clamp(1.5rem,4vw,64px)] sm:px-0">
        <Steps />
        {children}
      </main>
    </div>
  );
}
