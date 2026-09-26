"use client";
import { t as translateCopy } from "@/lib/i18n";


import { ForbiddenState } from "@/components/ui/ForbiddenState";

export default function AccessDeniedPage() {
  return (
    <div className="px-6 py-8 max-w-6xl mx-auto" data-testid="access-denied-page">
      <ForbiddenState
        title={translateCopy("ui.access_denied_1647b9d")}
        message="You need an authenticated admin wallet to view this page."
      />
    </div>
  );
}
