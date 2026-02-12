import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PrivacyContent } from "@/components/privacy-content";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader backHref="/login" />
      <PrivacyContent />
    </div>
  );
}
