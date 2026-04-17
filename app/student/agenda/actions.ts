"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleTaskCompletion(
  taskId: number,
  completed: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  const user = userRes?.user ?? null;

  if (userErr || !user) {
    return { ok: false, error: "Not authenticated." };
  }

  if (!Number.isInteger(taskId) || taskId <= 0) {
    return { ok: false, error: "Invalid task id." };
  }

  const { error } = await supabase.from("task_completion").upsert(
    {
      user_id: user.id,
      task_id: taskId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,task_id" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/student/agenda");
  return { ok: true };
}