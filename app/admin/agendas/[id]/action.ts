"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type SectionType = "solo" | "group";

async function getAuthenticatedSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || user === null) {
    throw new Error(`Error fetching current user: ${userError?.message}`);
  }

  return supabase;
}

function revalidateAgendaPaths(agendaId: number) {
  revalidatePath("/admin/agendas");
  revalidatePath(`/admin/agendas/${agendaId}`);
}

export async function createSection(
  agendaId: number,
  title: string,
  description: string | null,
  type: SectionType,
  order: number | null,
) {
  const supabase = await getAuthenticatedSupabase();

  const { error } = await supabase.from("section").insert({
    agenda_id: agendaId,
    title,
    description,
    type,
    order,
  });

  if (error) {
    throw new Error(`Error creating section: ${error.message}`);
  }

  revalidateAgendaPaths(agendaId);
}

export async function updateSection(
  sectionId: number,
  agendaId: number,
  title: string,
  description: string | null,
  type: SectionType,
  order: number | null,
) {
  const supabase = await getAuthenticatedSupabase();

  const { error } = await supabase
    .from("section")
    .update({ title, description, type, order })
    .eq("id", sectionId);

  if (error) {
    throw new Error(`Error updating section: ${error.message}`);
  }

  revalidateAgendaPaths(agendaId);
}

export async function deleteSection(sectionId: number, agendaId: number) {
  const supabase = await getAuthenticatedSupabase();

  const { error } = await supabase.from("section").delete().eq("id", sectionId);

  if (error) {
    throw new Error(`Error deleting section: ${error.message}`);
  }

  revalidateAgendaPaths(agendaId);
}

export async function createTask(
  sectionId: number,
  agendaId: number,
  title: string,
  description: string | null,
  link: string | null,
  order: number | null,
) {
  const supabase = await getAuthenticatedSupabase();

  const { error } = await supabase.from("task").insert({
    section_id: sectionId,
    title,
    description,
    link,
    order,
  });

  if (error) {
    throw new Error(`Error creating task: ${error.message}`);
  }

  revalidateAgendaPaths(agendaId);
}

export async function updateTask(
  taskId: number,
  agendaId: number,
  sectionId: number,
  title: string,
  description: string | null,
  link: string | null,
  order: number | null,
) {
  const supabase = await getAuthenticatedSupabase();

  const { error } = await supabase
    .from("task")
    .update({ section_id: sectionId, title, description, link, order })
    .eq("id", taskId);

  if (error) {
    throw new Error(`Error updating task: ${error.message}`);
  }

  revalidateAgendaPaths(agendaId);
}

export async function deleteTask(taskId: number, agendaId: number) {
  const supabase = await getAuthenticatedSupabase();

  const { error } = await supabase.from("task").delete().eq("id", taskId);

  if (error) {
    throw new Error(`Error deleting task: ${error.message}`);
  }

  revalidateAgendaPaths(agendaId);
}
