import Link from "next/link";
import { t as translateCopy } from "@/lib/i18n";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-mono text-sm text-gold">404</p>
      <h1 className="mt-3 text-2xl font-semibold text-text-primary">{translateCopy("ui.not_found_title")}</h1>
      <p className="mt-2 max-w-md text-sm text-text-secondary">
        {translateCopy("ui.not_found_description")}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link href="/dashboard" className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-text-inverse hover:bg-gold-hover">
          {translateCopy("ui.dashboard_d87f47b")}
        </Link>
        <Link href="/trades" className="rounded-md border border-border-default px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated">
          {translateCopy("ui.trades_597b109")}
        </Link>
      </div>
    </section>
  );
}