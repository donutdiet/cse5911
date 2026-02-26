"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTask(
  agendaId: number,
  title: string,
  description: string | null,
  link: string | null,
  order: number | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || user === null) {
    throw new Error(`Error fetching current user: ${userError?.message}`);
  }

  const { error } = await supabase.from("task").insert({
    agenda_id: agendaId,
    title,
    description,
    link,
    order,
  });

  if (error) {
    throw new Error(`Error creating task: ${error.message}`);
  }

  revalidatePath("/admin/agendas");
  revalidatePath(`/admin/agendas/${agendaId}`);
}

export async function updateTask(
  taskId: number,
  agendaId: number,
  title: string,
  description: string | null,
  link: string | null,
  order: number | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || user === null) {
    throw new Error(`Error fetching current user: ${userError?.message}`);
  }

  const { error } = await supabase
    .from("task")
    .update({ title, description, link, order })
    .eq("id", taskId);

  if (error) {
    throw new Error(`Error updating task: ${error.message}`);
  }

  revalidatePath("/admin/agendas");
  revalidatePath(`/admin/agendas/${agendaId}`);
}

export async function deleteTask(taskId: number, agendaId: number) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || user === null) {
    throw new Error(`Error fetching current user: ${userError?.message}`);
  }

  const { error } = await supabase.from("task").delete().eq("id", taskId);

  if (error) {
    throw new Error(`Error deleting task: ${error.message}`);
  }

  revalidatePath("/admin/agendas");
  revalidatePath(`/admin/agendas/${agendaId}`);
}
