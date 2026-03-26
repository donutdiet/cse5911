import { AgendaManager } from "@/components/admin/agenda-manager";
import { createClient } from "@/lib/supabase/server";

type Task = {
  id: number;
  section_id: number;
  title: string;
  description: string | null;
  link: string | null;
  order: number | null;
};

type SectionType = "solo" | "group";

type Section = {
  id: number;
  agenda_id: number;
  title: string;
  description: string | null;
  type: SectionType;
  order: number | null;
  tasks?: Task[];
};

type Agenda = {
  id: number;
  title: string;
  description: string | null;
  week: number;
  start_date: string;
  end_date: string;
  sections?: Section[];
};

export default async function AgendasPage() {
  const supabase = await createClient();

  const { data: agendaData, error: agendaError } = await supabase
    .from("agenda")
    .select(
      `
      *,
      sections:section(
        *,
        tasks:task(*)
      )
    `,
    )
    .order("week", { ascending: true });

  if (agendaError) {
    console.error("Failed to fetch agendas:", agendaError.message);
  }

  const agendas = (agendaData ?? []) as Agenda[];

  return (
    <div className="w-full max-w-7xl space-y-2">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">Agendas</h1>
        <p className="text-muted-foreground text-sm">
          {agendas.length} {agendas.length === 1 ? "agenda" : "agendas"}
        </p>
      </div>
      <AgendaManager agendas={agendas} />
    </div>
  );
}
