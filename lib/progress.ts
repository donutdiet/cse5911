export type ProgressTask = {
  id: number;
};

export type ProgressSection = {
  id: number;
  agenda_id: number;
  tasks: ProgressTask[] | null;
};

export type ProgressAgenda = {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  sections: ProgressSection[] | null;
};

export type TaskCompletionState = {
  task_id: number;
  completed: boolean;
};

export type GroupTaskCompletionState = TaskCompletionState & {
  user_id: string;
};

export type AgendaProgressSummary = {
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

type ProgressStat = {
  completed: number;
  total: number;
  percent: number;
};

export function buildCompletedTaskSet(rows: TaskCompletionState[]) {
  return new Set(rows.filter((row) => row.completed).map((row) => row.task_id));
}

export function calculateProgressStat(
  completed: number,
  total: number,
): ProgressStat {
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function getAgendaTaskIds(agenda: ProgressAgenda) {
  return (agenda.sections ?? []).flatMap((section) =>
    (section.tasks ?? []).map((task) => task.id),
  );
}

export function getCompletedTaskIdsForAgenda(
  agenda: ProgressAgenda,
  completedTaskIds: Set<number>,
) {
  return getAgendaTaskIds(agenda).filter((taskId) => completedTaskIds.has(taskId));
}

export function buildAgendaSummaries(args: {
  agendas: ProgressAgenda[];
  completedTaskIds: Set<number>;
  groupCompletions: GroupTaskCompletionState[];
  memberCount: number;
}): AgendaProgressSummary[] {
  const { agendas, completedTaskIds, groupCompletions, memberCount } = args;

  const agendaTaskIdsByAgenda = new Map<number, number[]>();
  const taskIdToAgendaId = new Map<number, number>();

  for (const agenda of agendas) {
    const agendaTaskIds = getAgendaTaskIds(agenda);
    agendaTaskIdsByAgenda.set(agenda.id, agendaTaskIds);

    for (const taskId of agendaTaskIds) {
      taskIdToAgendaId.set(taskId, agenda.id);
    }
  }

  const groupCompletedTaskCountByAgenda = new Map<number, number>();

  for (const agenda of agendas) {
    groupCompletedTaskCountByAgenda.set(agenda.id, 0);
  }

  for (const row of groupCompletions) {
    if (!row.completed) continue;

    const agendaId = taskIdToAgendaId.get(row.task_id);
    if (agendaId === undefined) continue;

    groupCompletedTaskCountByAgenda.set(
      agendaId,
      (groupCompletedTaskCountByAgenda.get(agendaId) ?? 0) + 1,
    );
  }

  return agendas.map((agenda) => {
    const agendaTaskIds = agendaTaskIdsByAgenda.get(agenda.id) ?? [];
    const completedTasks = agendaTaskIds.filter((taskId) =>
      completedTaskIds.has(taskId),
    ).length;
    const totalTasks = agendaTaskIds.length;

    const studentProgress = calculateProgressStat(completedTasks, totalTasks);
    const totalPossibleGroupCompletions = memberCount * totalTasks;
    const actualCompletedGroupTasks =
      groupCompletedTaskCountByAgenda.get(agenda.id) ?? 0;
    const groupProgress = calculateProgressStat(
      actualCompletedGroupTasks,
      totalPossibleGroupCompletions,
    );

    return {
      id: agenda.id,
      title: agenda.title,
      description: agenda.description,
      start_date: agenda.start_date,
      end_date: agenda.end_date,
      totalSections: agenda.sections?.length ?? 0,
      totalTasks,
      studentProgressPercent: studentProgress.percent,
      groupProgressPercent: groupProgress.percent,
    };
  });
}
