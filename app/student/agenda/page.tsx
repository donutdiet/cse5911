import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentAgendaBoard from "@/components/student/student-agenda-board";

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
  tasks: Task[];
};

type Agenda = {
  id: number;
  title: string;
  description: string | null;
  week: number;
  start_date: string;
  end_date: string;
  sections: Section[];
};

type AgendaSummary = {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  totalSections: number;
  totalTasks: number;
  studentProgressPercent: number;
  groupProgressPercent: number;
};

type StudentAgendaPageProps = {
  searchParams?: Promise<{
    agenda?: string;
  }>;
};

export default async function StudentAgendaPage({
  searchParams,
}: StudentAgendaPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("member_of")
    .select("group_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Agenda</h1>
          <p className="mt-2 text-sm text-gray-500">
            You have not been assigned to a group yet, so there is no agenda to
            show. Check back after groups are created.
          </p>
        </div>
      </div>
    );
  }

  const { data: members } = await supabase
    .from("member_of")
    .select("user_id")
    .eq("group_id", membership.group_id);

  const memberIds = (members ?? []).map((member) => member.user_id);

  const { data: agendasData, error: agendasError } = await supabase
    .from("agenda")
    .select(`
      *,
      sections:section(
        *,
        tasks:task(*)
      )
    `)
    .order("start_date", { ascending: true })
    .order("week", { ascending: true });

  if (agendasError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Agenda</h1>
          <p className="mt-2 text-sm text-red-700">
            There was a problem loading agendas. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const agendas = (agendasData ?? []) as Agenda[];

  if (agendas.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Agenda</h1>
          <p className="mt-2 text-sm text-gray-500">
            No agendas have been published yet.
          </p>
        </div>
      </div>
    );
  }

  const allTaskIds = agendas.flatMap((agenda) =>
    (agenda.sections ?? []).flatMap((section) =>
      (section.tasks ?? []).map((task) => task.id),
    ),
  );

  const myCompletionsResult =
    allTaskIds.length > 0
      ? await supabase
          .from("task_completion")
          .select("task_id, completed")
          .eq("user_id", user.id)
          .in("task_id", allTaskIds)
      : { data: [] as { task_id: number; completed: boolean }[] };

  const groupCompletionsResult =
    allTaskIds.length > 0 && memberIds.length > 0
      ? await supabase
          .from("task_completion")
          .select("user_id, task_id, completed")
          .in("user_id", memberIds)
          .in("task_id", allTaskIds)
      : {
          data: [] as { user_id: string; task_id: number; completed: boolean }[],
        };

  const myCompletions = myCompletionsResult.data ?? [];
  const groupCompletions = groupCompletionsResult.data ?? [];

  const myCompletedTaskSet = new Set(
    myCompletions.filter((row) => row.completed).map((row) => row.task_id),
  );

  const groupCompletedTaskCountByAgenda = new Map<number, number>();

  for (const agenda of agendas) {
    const agendaTaskIds = new Set(
      (agenda.sections ?? []).flatMap((section) =>
        (section.tasks ?? []).map((task) => task.id),
      ),
    );

    const completedCount = groupCompletions.filter(
      (row) => row.completed && agendaTaskIds.has(row.task_id),
    ).length;

    groupCompletedTaskCountByAgenda.set(agenda.id, completedCount);
  }

  const agendaSummaries: AgendaSummary[] = agendas.map((agenda) => {
    const agendaTaskIds = (agenda.sections ?? []).flatMap((section) =>
      (section.tasks ?? []).map((task) => task.id),
    );

    const completedTaskIds = agendaTaskIds.filter((taskId) =>
      myCompletedTaskSet.has(taskId),
    );

    const totalTasks = agendaTaskIds.length;
    const completedTasks = completedTaskIds.length;

    const studentProgressPercent =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const totalPossibleGroupCompletions = memberIds.length * totalTasks;
    const actualCompletedGroupTasks =
      groupCompletedTaskCountByAgenda.get(agenda.id) ?? 0;

    const groupProgressPercent =
      totalPossibleGroupCompletions === 0
        ? 0
        : Math.round(
            (actualCompletedGroupTasks / totalPossibleGroupCompletions) * 100,
          );

    return {
      id: agenda.id,
      title: agenda.title,
      description: agenda.description,
      start_date: agenda.start_date,
      end_date: agenda.end_date,
      totalSections: agenda.sections?.length ?? 0,
      totalTasks,
      studentProgressPercent,
      groupProgressPercent,
    };
  });

  const requestedAgendaId = Number(resolvedSearchParams?.agenda);
  const hasExplicitSelection =
    Number.isInteger(requestedAgendaId) &&
    agendaSummaries.some((agenda) => agenda.id === requestedAgendaId);

  const earliestIncompleteAgenda = agendaSummaries.find(
    (agenda) => agenda.totalTasks > 0 && agenda.studentProgressPercent < 100,
  );

  const defaultAgendaId =
    earliestIncompleteAgenda?.id ??
    agendaSummaries[agendaSummaries.length - 1]?.id ??
    agendaSummaries[0].id;

  const selectedAgendaId = hasExplicitSelection
    ? requestedAgendaId
    : defaultAgendaId;

  const selectedAgenda =
    agendas.find((agenda) => agenda.id === selectedAgendaId) ?? agendas[0];

  const selectedSummary =
    agendaSummaries.find((agenda) => agenda.id === selectedAgenda.id) ??
    agendaSummaries[0];

  const completedTaskIdsForSelectedAgenda = (
    selectedAgenda.sections ?? []
  ).flatMap((section) =>
    (section.tasks ?? [])
      .map((task) => task.id)
      .filter((taskId) => myCompletedTaskSet.has(taskId)),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Agenda</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse agendas, move between them, and track your progress alongside
          your group.
        </p>
      </div>

      <StudentAgendaBoard
        agenda={selectedAgenda}
        agendaSummaries={agendaSummaries}
        selectedAgendaId={selectedAgenda.id}
        hasExplicitSelection={hasExplicitSelection}
        completedTaskIds={completedTaskIdsForSelectedAgenda}
        studentProgressPercent={selectedSummary.studentProgressPercent}
        groupProgressPercent={selectedSummary.groupProgressPercent}
      />
    </div>
  );
}