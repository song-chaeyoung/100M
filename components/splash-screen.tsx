"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SPLASH_DURATION = 2500;
const FADE_DURATION = 500;

export function SplashScreen() {
  // 서버/클라이언트 모두 "pending"으로 시작 → 하이드레이션 일치
  const [phase, setPhase] = useState<"pending" | "show" | "exit" | "done">(
    "pending",
  );

  useEffect(() => {
    // 재방문: 즉시 제거 (setTimeout으로 비동기 처리)
    if (sessionStorage.getItem("splash-shown")) {
      const t = setTimeout(() => setPhase("done"), 0);
      return () => clearTimeout(t);
    }

    // 첫 방문: 타이머 체인
    const timers = [
      setTimeout(() => setPhase("show"), 50),
      setTimeout(() => setPhase("exit"), SPLASH_DURATION),
      setTimeout(() => {
        setPhase("done");
        sessionStorage.setItem("splash-shown", "true");
      }, SPLASH_DURATION + FADE_DURATION),
    ];

    document.body.style.overflow = "hidden";
    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = "unset";
    };
  }, []);

  if (phase === "done") return null;

  const showContent = phase === "show";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 select-none ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className={`mb-6 transform transition-all duration-1000 ease-out ${
          showContent ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
      >
        <Image
          src="/logo.PNG"
          alt="일억모으기"
          width={120}
          height={120}
          priority
          className="drop-shadow-2xl"
        />
      </div>

      <h1
        className={`text-3xl font-bold tracking-tight transition-all duration-1000 delay-200 ease-out ${
          showContent ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        일억모으기
      </h1>

      <p
        className={`mt-2 text-sm text-muted-foreground transition-all duration-1000 delay-500 ease-out ${
          showContent ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        열심히 기록하고 일억모으자!
      </p>

      <div
        className={`mt-12 transition-all duration-1000 delay-700 ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex gap-2">
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
