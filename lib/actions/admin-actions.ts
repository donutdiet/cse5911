"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function removeStudent(studentId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profile")
    .delete()
    .eq("user_id", studentId);

  if (error) {
    console.error("Failed to remove student:", error.message);
    throw new Error(error.message);
  }

  revalidatePath("/admin/roster");
}
