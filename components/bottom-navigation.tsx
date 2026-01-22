"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Pin, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  {
    name: "홈",
    href: "/",
    icon: Home,
  },
  {
    name: "고정지출",
    href: "/fixed-expenses",
    icon: Pin,
  },
  {
    name: "리포트",
    href: "/reports",
    icon: BarChart3,
  },
  {
    name: "설정",
    href: "/settings",
    icon: Settings,
  },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md safe-area-bottom">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all duration-200",
                "min-w-[60px] py-2 touch-feedback",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon
                className={cn(
                  "transition-all duration-200",
                  isActive ? "h-6 w-6" : "h-5 w-5",
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive ? "scale-100 opacity-100" : "scale-95 opacity-70",
                )}
              >
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
