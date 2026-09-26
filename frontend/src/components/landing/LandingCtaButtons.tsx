"use client";
import { t as translateCopy } from "@/lib/i18n";


import Link from "next/link";
import { useAnalytics } from "@/components/AnalyticsProvider";

export function LandingCtaButtons() {
  const { trackEvent } = useAnalytics();

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
      <Link
        href="/vault"
        onClick={() => trackEvent("landing_cta_clicked", { target: "vault" })}
        className="px-8 py-3 bg-gold text-text-inverse font-semibold rounded-lg hover:bg-gold-hover transition-colors"
      >
        {translateCopy("ui.go_to_vault_c5e6e39")}
      </Link>
      <Link
        href="/trades"
        onClick={() => trackEvent("landing_cta_clicked", { target: "trades" })}
        className="px-8 py-3 border border-border-default text-text-primary font-semibold rounded-lg hover:bg-bg-card transition-colors"
      >
        {translateCopy("ui.view_trades_07da04d")}
      </Link>
    </div>
  );
}
