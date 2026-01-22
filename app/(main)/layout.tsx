import { BottomNavigation } from "@/components/bottom-navigation";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="relative min-h-screen pb-16">{children}</div>
      <BottomNavigation />
    </>
  );
}
