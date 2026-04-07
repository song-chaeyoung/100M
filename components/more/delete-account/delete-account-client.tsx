"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { deleteAccount } from "@/app/actions/account";
import { DeleteConfirmDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function DeleteAccountClient() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenDialog = () => {
    if (!agreed) {
      toast.error("안내 내용을 확인하고 동의해 주세요.");
      return;
    }

    setDialogOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await deleteAccount();

      if (!result.success) {
        toast.error(result.error || "회원 탈퇴에 실패했습니다.");
        return;
      }

      toast.success("회원 탈퇴가 완료되었습니다.");
      await signOut({ callbackUrl: "/login" });
    } finally {
      setIsSubmitting(false);
      setDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-destructive/40">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            탈퇴 전 확인 사항
          </CardTitle>
          <CardDescription>
            회원 탈퇴 시 아래 내용이 즉시 적용되며, 복구할 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
          <p>삭제 대상: 목표, 거래, 자산, 자동화 설정 등 계정 데이터</p>
          <p>복구 불가: 탈퇴 후 데이터 복원이 불가능합니다.</p>
          <p>
            재가입: 같은 소셜 계정으로 재가입은 가능하지만 데이터는 새로
            시작됩니다.
          </p>
          <p>처리 시점: 탈퇴 즉시 계정 상태가 반영됩니다.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex items-start gap-3">
            <input
              id="delete-account-consent"
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.currentTarget.checked)}
              className="mt-0.75 w-4 h-4 shrink-0 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Label
              htmlFor="delete-account-consent"
              className="items-start text-sm leading-5"
            >
              안내 내용을 확인했으며 회원 탈퇴에 동의합니다.
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/more")}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleOpenDialog}
          disabled={!agreed || isSubmitting}
        >
          {isSubmitting ? "처리 중..." : "회원 탈퇴"}
        </Button>
      </div>

      <DeleteConfirmDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) {
            setDialogOpen(open);
          }
        }}
        onConfirm={handleDeleteAccount}
        title="정말 탈퇴하시겠습니까?"
        description="탈퇴 시 모든 계정 데이터가 영구 삭제되며 복구할 수 없습니다."
      />
    </div>
  );
}
