import { auth } from "@/auth";

export async function withAuth<T>(
  action: (userId: string) => Promise<T>,
): Promise<T | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "인증이 필요합니다." };
  }
  return action(session.user.id);
}
