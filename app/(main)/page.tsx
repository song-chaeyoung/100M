import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader />
      <div className="text-lg font-semibold">
        {session.user.name}님, 환영합니다
      </div>
    </div>
  );
}
