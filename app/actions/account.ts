"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { withAuth } from "@/lib/with-auth";

interface DeleteAccountResult {
  success: boolean;
  error?: string;
}

export async function deleteAccount(): Promise<DeleteAccountResult> {
  const result = await withAuth(async (userId) => {
    try {
      const [deletedUser] = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning({ id: users.id });

      if (!deletedUser) {
        return { success: false, error: "Account not found." };
      }

      revalidatePath("/");

      return { success: true };
    } catch (error) {
      console.error("Error deleting account:", error);
      return { success: false, error: "Failed to delete account." };
    }
  });

  return result;
}
