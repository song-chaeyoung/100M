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
      <div className="relative h-svh pb-16 overflow-hidden">
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
      <BottomNavigation />
    </>
  );
}
