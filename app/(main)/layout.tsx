export const dynamic = "force-dynamic";

import { BottomNavigation } from "@/components/bottom-navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <>
      <div className="relative min-h-screen pb-16">{children}</div>
      <BottomNavigation />
    </>
  );
}
