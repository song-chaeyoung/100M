import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "서비스 약관",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader backHref="/login" />

      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-muted-foreground">시행일: 2026년 2월 1일</p>

        {/* 1. 목적 */}
        <section>
          <h2 className="text-base font-bold mb-3">1. 목적</h2>
          <div className="rounded-lg bg-muted/50 p-4">
            <p>
              본 약관은 <strong>일억모으기</strong>(이하 &quot;서비스&quot;)의
              이용 조건 및 절차, 이용자와 서비스 제공자의 권리·의무 및 책임사항을
              규정함을 목적으로 합니다.
            </p>
          </div>
        </section>

        {/* 2. 용어의 정의 */}
        <section>
          <h2 className="text-base font-bold mb-3">2. 용어의 정의</h2>
          <div className="rounded-lg bg-muted/50 p-4">
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                &quot;서비스&quot;란 일억모으기가 제공하는 자산 관리 관련 제반
                서비스를 말합니다.
              </li>
              <li>
                &quot;이용자&quot;란 본 약관에 동의하고 서비스를 이용하는 자를
                말합니다.
              </li>
              <li>
                &quot;계정&quot;이란 소셜 로그인을 통해 생성된 이용자의 고유
                식별 정보를 말합니다.
              </li>
            </ul>
          </div>
        </section>

        {/* 3. 약관의 효력 */}
        <section>
          <h2 className="text-base font-bold mb-3">3. 약관의 효력 및 변경</h2>
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p>
              본 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.
            </p>
            <p className="text-muted-foreground">
              약관이 변경될 경우 앱 내 공지를 통해 안내하며, 변경된 약관에
              동의하지 않는 경우 서비스 이용을 중단할 수 있습니다.
            </p>
          </div>
        </section>

        {/* 4. 서비스 제공 */}
        <section>
          <h2 className="text-base font-bold mb-3">4. 서비스의 제공</h2>
          <div className="rounded-lg bg-muted/50 p-4">
            <p>서비스는 다음과 같은 기능을 제공합니다.</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
              <li>목표 금액 설정 및 달성률 추적</li>
              <li>수입/지출 내역 관리</li>
              <li>고정 지출 및 저축 자동화</li>
              <li>저축 및 투자 자산 관리</li>
            </ul>
          </div>
        </section>

        {/* 5. 이용자의 의무 */}
        <section>
          <h2 className="text-base font-bold mb-3">5. 이용자의 의무</h2>
          <div className="rounded-lg bg-muted/50 p-4">
            <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
              <li>타인의 정보를 도용하여 서비스에 가입하는 행위</li>
              <li>서비스의 정상적인 운영을 방해하는 행위</li>
              <li>서비스를 통해 얻은 정보를 무단으로 복제·배포하는 행위</li>
              <li>기타 관련 법령에 위반되는 행위</li>
            </ul>
          </div>
        </section>

        {/* 6. 서비스 제공자의 의무 */}
        <section>
          <h2 className="text-base font-bold mb-3">6. 서비스 제공자의 의무</h2>
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p>
              서비스 제공자는 안정적인 서비스 제공을 위해 최선을 다합니다.
            </p>
            <p className="text-muted-foreground">
              다만, 천재지변, 시스템 장애 등 불가항력적인 사유로 인한 서비스
              중단에 대해서는 책임을 지지 않습니다.
            </p>
          </div>
        </section>

        {/* 7. 서비스 이용 제한 */}
        <section>
          <h2 className="text-base font-bold mb-3">
            7. 서비스 이용의 제한 및 중지
          </h2>
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p>
              다음의 경우 서비스 이용이 제한되거나 중지될 수 있습니다.
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
              <li>본 약관을 위반한 경우</li>
              <li>서비스 운영을 고의로 방해한 경우</li>
              <li>기타 서비스 제공자가 합리적으로 판단한 경우</li>
            </ul>
          </div>
        </section>

        {/* 8. 면책 */}
        <section>
          <h2 className="text-base font-bold mb-3">8. 면책 조항</h2>
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p>
              서비스는 이용자의 자산 관리를 보조하는 도구이며, 재무적 조언을
              제공하지 않습니다.
            </p>
            <p className="text-muted-foreground">
              이용자가 입력한 데이터의 정확성에 대한 책임은 이용자에게 있으며,
              서비스 이용으로 인한 재무적 손실에 대해 서비스 제공자는 책임을 지지
              않습니다.
            </p>
          </div>
        </section>

        {/* 9. 회원 탈퇴 */}
        <section>
          <h2 className="text-base font-bold mb-3">9. 회원 탈퇴 및 데이터</h2>
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p>
              이용자는 언제든지 서비스 내에서 회원 탈퇴를 요청할 수 있습니다.
            </p>
            <p className="text-muted-foreground">
              탈퇴 시 이용자의 개인정보 및 서비스 이용 데이터는 관련 법령에 따라
              처리됩니다.
            </p>
          </div>
        </section>

        {/* 10. 분쟁 해결 */}
        <section>
          <h2 className="text-base font-bold mb-3">10. 분쟁 해결</h2>
          <div className="rounded-lg bg-muted/50 p-4">
            <p>
              서비스 이용과 관련하여 분쟁이 발생한 경우, 대한민국 법률에 따라
              해결합니다.
            </p>
          </div>
        </section>

        {/* 저작권 */}
        <section className="text-center text-xs text-muted-foreground pt-4 pb-8">
          <p>&copy;2026 일억모으기. All rights reserved.</p>
        </section>
      </div>
    </div>
  );
}
