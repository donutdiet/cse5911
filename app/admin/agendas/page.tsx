import { AgendaManager } from "@/components/admin/agenda-manager";
import { createClient } from "@/lib/supabase/server";

export default async function AgendasPage() {
  const supabase = await createClient();

  const { data: agendaData, error: agendaError } = await supabase
    .from("agenda")
    .select(
      `
      *,
      tasks:task(*)
    `,
    )
    .order("week", { ascending: true });

  if (agendaError) {
    console.error("Failed to fetch agendas:", agendaError.message);
  }

  const agendas = agendaData ?? [];

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
