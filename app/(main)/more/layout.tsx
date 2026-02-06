import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "더보기",
};

export default function MoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
