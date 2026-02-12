export function PrivacyContent() {
  return (
    <div className="space-y-6 text-sm leading-relaxed">
      <p className="text-muted-foreground">시행일: 2026년 2월 1일</p>

      {/* 1. 개인정보 수집 항목 */}
      <section>
        <h2 className="text-base font-bold mb-3">
          1. 수집하는 개인정보 항목
        </h2>
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <p>
            <strong>일억모으기</strong>는 서비스 제공을 위해 다음의 개인정보를
            수집합니다.
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>소셜 로그인 정보 (이메일, 이름, 프로필 이미지)</li>
            <li>서비스 이용 기록 (수입/지출 내역, 자산 정보, 목표 설정)</li>
          </ul>
        </div>
      </section>

      {/* 2. 개인정보 수집 목적 */}
      <section>
        <h2 className="text-base font-bold mb-3">
          2. 개인정보 수집 및 이용 목적
        </h2>
        <div className="rounded-lg bg-muted/50 p-4">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>회원 식별 및 본인 확인</li>
            <li>개인화된 자산 관리 서비스 제공</li>
            <li>서비스 개선 및 신규 기능 개발</li>
          </ul>
        </div>
      </section>

      {/* 3. 개인정보 보유 기간 */}
      <section>
        <h2 className="text-base font-bold mb-3">
          3. 개인정보 보유 및 이용 기간
        </h2>
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <p>
            회원 탈퇴 시 또는 개인정보 수집·이용 목적이 달성된 후에는 해당
            정보를 지체 없이 파기합니다.
          </p>
          <p className="text-muted-foreground">
            단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
          </p>
        </div>
      </section>

      {/* 4. 개인정보 제3자 제공 */}
      <section>
        <h2 className="text-base font-bold mb-3">4. 개인정보의 제3자 제공</h2>
        <div className="rounded-lg bg-muted/50 p-4">
          <p>
            <strong>일억모으기</strong>는 원칙적으로 이용자의 개인정보를
            제3자에게 제공하지 않습니다.
          </p>
          <p className="text-muted-foreground mt-2">
            다만, 법령에 의해 요구되는 경우에는 예외로 합니다.
          </p>
        </div>
      </section>

      {/* 5. 개인정보 처리 위탁 */}
      <section>
        <h2 className="text-base font-bold mb-3">5. 개인정보 처리 위탁</h2>
        <div className="rounded-lg bg-muted/50 p-4">
          <p>서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁합니다.</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
            <li>클라우드 서비스: 데이터 저장 및 처리</li>
            <li>소셜 로그인 서비스: 회원 인증</li>
          </ul>
        </div>
      </section>

      {/* 6. 이용자 권리 */}
      <section>
        <h2 className="text-base font-bold mb-3">
          6. 이용자의 권리와 행사 방법
        </h2>
        <div className="rounded-lg bg-muted/50 p-4">
          <p>이용자는 다음과 같은 권리를 행사할 수 있습니다.</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
            <li>개인정보 열람, 정정, 삭제 요청</li>
            <li>개인정보 처리 정지 요청</li>
            <li>회원 탈퇴</li>
          </ul>
        </div>
      </section>

      {/* 7. 개인정보 보호 */}
      <section>
        <h2 className="text-base font-bold mb-3">
          7. 개인정보의 안전성 확보 조치
        </h2>
        <div className="rounded-lg bg-muted/50 p-4">
          <p>개인정보 보호를 위해 다음과 같은 조치를 취하고 있습니다.</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
            <li>개인정보의 암호화</li>
            <li>보안 프로그램 설치 및 주기적 점검</li>
            <li>접근 권한 관리</li>
          </ul>
        </div>
      </section>

      {/* 8. 쿠키 사용 */}
      <section>
        <h2 className="text-base font-bold mb-3">8. 쿠키의 사용</h2>
        <div className="rounded-lg bg-muted/50 p-4">
          <p>
            서비스 이용 과정에서 로그인 유지 및 사용자 환경 설정을 위해 쿠키를
            사용합니다.
          </p>
          <p className="text-muted-foreground mt-2">
            브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 서비스
            이용에 제한이 있을 수 있습니다.
          </p>
        </div>
      </section>

      {/* 9. 방침 변경 */}
      <section>
        <h2 className="text-base font-bold mb-3">
          9. 개인정보 처리방침 변경
        </h2>
        <div className="rounded-lg bg-muted/50 p-4">
          <p>
            본 개인정보 처리방침은 법령, 정책 또는 서비스 변경에 따라 내용이
            변경될 수 있습니다.
          </p>
          <p className="text-muted-foreground mt-2">
            변경 시 앱 내 공지를 통해 안내드립니다.
          </p>
        </div>
      </section>

      {/* 10. 문의처 */}
      <section>
        <h2 className="text-base font-bold mb-3">10. 개인정보 관련 문의</h2>
        <div className="rounded-lg bg-muted/50 p-4">
          <p>
            개인정보 처리와 관련한 문의사항이 있으시면 아래로 연락해 주세요.
          </p>
          <p className="text-muted-foreground mt-2">이메일: -</p>
        </div>
      </section>

      {/* 저작권 */}
      <section className="text-center text-xs text-muted-foreground pt-4 pb-8">
        <p>&copy;2026 일억모으기. All rights reserved.</p>
      </section>
    </div>
  );
}
