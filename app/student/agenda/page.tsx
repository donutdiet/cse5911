import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";

import StudentAgendaBoard from "@/components/student/student-agenda-board";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildAgendaSummaries,
  buildCompletedTaskSet,
  getCompletedTaskIdsForAgenda,
} from "@/lib/progress";
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

type GroupMember = {
  user_id: string;
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
      <AgendaEmptyShell>
        <EmptyState
          title="No agenda yet"
          description="You haven't been assigned to a group, so there's no agenda to show. Check back after groups are created."
        />
      </AgendaEmptyShell>
    );
  }

  const { data: membersData, error: membersError } = await supabase.rpc(
    "get_my_group_members",
  );

  if (membersError) {
    return (
      <AgendaEmptyShell>
        <ErrorState message="There was a problem loading your group members. Please try again." />
      </AgendaEmptyShell>
    );
  }

  const memberIds = (membersData ?? []).map(
    (member: GroupMember) => member.user_id,
  );

  const { data: agendasData, error: agendasError } = await supabase
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
    .order("start_date", { ascending: true })
    .order("week", { ascending: true });

  if (agendasError) {
    return (
      <AgendaEmptyShell>
        <ErrorState message="There was a problem loading agendas. Please try again." />
      </AgendaEmptyShell>
    );
  }

  const agendas = (agendasData ?? []) as Agenda[];

  if (agendas.length === 0) {
    return (
      <AgendaEmptyShell>
        <EmptyState
          title="No agendas published yet"
          description="Your instructor hasn't published any agendas. Check back soon."
        />
      </AgendaEmptyShell>
    );
  }

  const allTaskIds = agendas.flatMap((agenda) =>
    (agenda.sections ?? []).flatMap((section) =>
      (section.tasks ?? []).map((task) => task.id),
    ),
  );

  const { data: myCompletions, error: myCompletionsError } =
    allTaskIds.length > 0
      ? await supabase
          .from("task_completion")
          .select("task_id, completed")
          .eq("user_id", user.id)
          .in("task_id", allTaskIds)
      : {
          data: [] as { task_id: number; completed: boolean }[],
          error: null,
        };

  const { data: groupCompletions, error: groupCompletionsError } =
    allTaskIds.length > 0 && memberIds.length > 0
      ? await supabase
          .from("task_completion")
          .select("user_id, task_id, completed")
          .in("user_id", memberIds)
          .in("task_id", allTaskIds)
      : {
          data: [] as {
            user_id: string;
            task_id: number;
            completed: boolean;
          }[],
          error: null,
        };

  if (myCompletionsError || groupCompletionsError) {
    return (
      <AgendaEmptyShell>
        <ErrorState message="There was a problem loading task progress. Please try again." />
      </AgendaEmptyShell>
    );
  }

  const myCompletedTaskSet = buildCompletedTaskSet(myCompletions ?? []);

  const agendaSummaries = buildAgendaSummaries({
    agendas,
    completedTaskIds: myCompletedTaskSet,
    groupCompletions: groupCompletions ?? [],
    memberCount: memberIds.length,
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

  const completedTaskIdsForSelectedAgenda = getCompletedTaskIdsForAgenda(
    selectedAgenda,
    myCompletedTaskSet,
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
      <AgendaHeader />
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

function AgendaHeader() {
  return (
    <header className="mb-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Browse agendas, move between them, and track your progress alongside
        your group.
      </p>
    </header>
  );
}

function AgendaEmptyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
      <AgendaHeader />
      {children}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="py-8 text-center">
        <p className="text-sm text-destructive">{message}</p>
      </CardContent>
    </Card>
  );
}
