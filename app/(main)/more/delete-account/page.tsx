import type { Metadata } from "next";
import { DeleteAccountClient } from "@/components/more/delete-account/delete-account-client";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "회원 탈퇴",
};

export default function DeleteAccountPage() {
  return (
    <div className="container mx-auto space-y-6 p-4">
      <PageHeader
        backHref="/more"
        title="회원 탈퇴"
        description="탈퇴 전 안내 내용을 확인해 주세요."
      />
      <DeleteAccountClient />
    </div>
  );
}
