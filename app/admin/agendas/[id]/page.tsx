import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TaskManager } from "@/components/admin/task-manager";

type Task = {
  id: number;
  agenda_id: number;
  title: string;
  description: string | null;
  link: string | null;
  order: number | null;
};

type Agenda = {
  id: number;
  title: string;
  description: string | null;
  week: number;
  tasks: Task[];
};

export default async function AgendaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agendaId = Number.parseInt(id, 10);

  if (!Number.isInteger(agendaId) || agendaId <= 0) {
    notFound();
  }

  const supabase = await createClient();
  const { data: agenda, error } = await supabase
    .from("agenda")
    .select(
      `
      *,
      tasks:task(*)
    `,
    )
    .eq("id", agendaId)
    .single();

  if (error || agenda === null) {
    notFound();
  }

  return (
    <div className="w-full max-w-7xl space-y-2">
      <TaskManager agenda={agenda as Agenda} />
    </div>
  );
}
