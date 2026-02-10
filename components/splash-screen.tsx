"use client";

import { useLayoutEffect, useState } from "react";
import Image from "next/image";

/** 브라우저가 초기 opacity:0 을 인식할 최소 지연(ms) */
const ANIMATION_START_DELAY = 50;
/** 스플래시 콘텐츠 표시 시간(ms) */
const SPLASH_DISPLAY_DURATION = 2500;
/** 페이드아웃 트랜지션 시간(ms) — CSS duration-500 과 동기화 */
const FADE_OUT_DURATION = 500;
/** 컴포넌트 완전 제거 시점(ms) */
const SPLASH_REMOVE_DELAY = SPLASH_DISPLAY_DURATION + FADE_OUT_DURATION;

export function SplashScreen() {
  // 1. 전체 컨테이너 가시성: true로 시작해서 홈 화면을 가림 (나중에 false로 변하며 퇴장)
  const [isVisible, setIsVisible] = useState(true);
  // 2. 내부 콘텐츠 등장 애니메이션 트리거: false로 시작 (잠시 후 true로 변하며 등장)
  const [animateIn, setAnimateIn] = useState(false);
  // 3. 컴포넌트 마운트 여부
  const [shouldRender, setShouldRender] = useState(true);

  useLayoutEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("splash-shown");

    if (hasSeenSplash) {
      setShouldRender(false);
      return;
    }

    // 단계 1: 아주 짧은 딜레이 후 내부 콘텐츠 페이드 인 시작
    const startAnimationTimer = setTimeout(() => {
      setAnimateIn(true);
    }, ANIMATION_START_DELAY);

    // 단계 2: 표시 시간 후 전체 페이드 아웃 시작 (퇴장)
    const fadeOutTimer = setTimeout(() => {
      setIsVisible(false);
      setAnimateIn(false);
    }, SPLASH_DISPLAY_DURATION);

    // 단계 3: 페이드 아웃 완료 후 컴포넌트 제거
    const removeTimer = setTimeout(() => {
      setShouldRender(false);
      sessionStorage.setItem("splash-shown", "true");
    }, SPLASH_REMOVE_DELAY);

    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(startAnimationTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(removeTimer);
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!shouldRender) return null;

  // 내부 콘텐츠가 보여야 할 조건: 등장 애니메이션이 시작되었고(animateIn) && 아직 퇴장하지 않았을 때(isVisible)
  const showContent = animateIn && isVisible;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 select-none ${
        isVisible ? "opacity-100" : "opacity-0"
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
