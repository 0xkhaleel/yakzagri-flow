
import { t as translateCopy } from "@/lib/i18n";
import { BentoCard } from "@/components/ui/BentoCard";
import { FileText, Eye } from "lucide-react";
import Image from 'next/image';
import Download from "@/app/assets/ExportIcon.png"

interface Party {
  initials: string;
  name: string;
  color: "teal" | "emerald";
}

interface ContractManifestCardProps {
  contractId: string;
  agreementDate: string;
  settlementType: string;
  originParty: Party;
  recipientParty: Party;
  onExportPdf?: () => void;
  onViewClauses?: () => void;
}

export function ContractManifestCard({
  contractId,
  agreementDate,
  settlementType,
  originParty,
  recipientParty,
  onExportPdf,
  onViewClauses,
}: ContractManifestCardProps) {
  const getPartyBgColor = (color: Party["color"]) => {
    return color === "teal" ? "bg-teal" : "bg-emerald";
  };

  return (
    <BentoCard
      title={translateCopy("ui.contract_manifest_1052b0a")}
      icon={<FileText className="w-5 h-5" />}
      glowVariant="gold"
      className="h-104"
    >
      <div className="flex items-center justify-end -mt-8 mb-6">
        <span className="text-xs font-mono text-gold bg-gold-muted px-3 py-1 rounded-full">
          {contractId}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-2 pl-5 pr-5">
        <div>
          <p className="text-xs font-semibold tracking-widest text-text-secondary uppercase mb-1">
            {translateCopy("ui.agreement_date_423ea5e")}
          </p>
          <p className="text-sm font-medium text-text-primary">{agreementDate}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-widest text-text-secondary uppercase mb-1">
            {translateCopy("ui.settlement_type_6c68618")}
          </p>
          <p className="text-sm font-medium text-text-primary">{settlementType}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6 pl-5 pr-5">
        <div className="mt-15">
          <p className="text-xs font-semibold tracking-widest text-text-secondary uppercase mb-2">
            {translateCopy("ui.origin_party_396fa75")}
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`w-8 h-8 rounded-lg ${getPartyBgColor(originParty.color)} text-text-inverse text-xs font-bold flex items-center justify-center`}
            >
              {originParty.initials}
            </span>
            <span className="text-sm text-text-primary">{originParty.name}</span>
          </div>
        </div>
        <div className="mt-15">
          <p className="text-xs font-semibold tracking-widest text-text-secondary uppercase mb-2">
            {translateCopy("ui.recipient_party_1e39325")}
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`w-8 h-8 rounded-lg ${getPartyBgColor(recipientParty.color)} text-text-inverse text-xs font-bold flex items-center justify-center`}
            >
              {recipientParty.initials}
            </span>
            <span className="text-sm text-text-primary">{recipientParty.name}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-15">
        <button
          onClick={onExportPdf}
          disabled={!onExportPdf}
          title={!onExportPdf ? "A contract PDF is not available for this position." : undefined}
          className="flex-1 flex items-center justify-center gap-2 bg-[#1E2D2666] hover:bg-bg-input text-text-primary font-medium py-2.5 px-4 rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
           <Image
              src={Download}
              alt={translateCopy("ui.export_icon_1c4dcec")}
              width={11.67}
              height={11.67}
             />
          {translateCopy("ui.export_pdf_3dd7d56")}
        </button>
        <button
          onClick={onViewClauses}
          disabled={!onViewClauses}
          title={!onViewClauses ? "Contract clauses are not available for this position." : undefined}
          className="flex-1 flex items-center justify-center gap-2 bg-[#1E2D2666] hover:bg-bg-input text-text-primary font-medium py-2.5 px-4 rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Eye className="w-4 h-4" />
          {translateCopy("ui.view_clauses_55dc206")}
        </button>
      </div>
    </BentoCard>
  );
}
