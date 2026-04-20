"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { toggleTaskCompletion } from "@/app/student/agenda/actions";

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

type Props = {
  agenda: Agenda;
  agendaSummaries: AgendaSummary[];
  selectedAgendaId: number;
  hasExplicitSelection: boolean;
  completedTaskIds: number[];
  studentProgressPercent: number;
  groupProgressPercent: number;
};

const LAST_AGENDA_STORAGE_KEY = "student_last_agenda_id";

function sortByOrder<T extends { order: number | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aOrder = a.order ?? Number.POSITIVE_INFINITY;
    const bOrder = b.order ?? Number.POSITIVE_INFINITY;
    return aOrder - bOrder;
  });
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function ProgressBar({
  label,
  percent,
}: {
  label: string;
  percent: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-sm text-gray-500">{percent}%</p>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-[#BB0000] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function StudentAgendaBoard({
  agenda,
  agendaSummaries,
  selectedAgendaId,
  hasExplicitSelection,
  completedTaskIds,
  studentProgressPercent,
  groupProgressPercent,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<number>>(
    new Set(sortByOrder(agenda.sections).map((section) => section.id)),
  );
  const [isPending, startTransition] = useTransition();

  const completedSet = useMemo(
    () => new Set(completedTaskIds),
    [completedTaskIds],
  );

  const sections = useMemo(
    () =>
      sortByOrder(agenda.sections ?? []).map((section) => ({
        ...section,
        tasks: sortByOrder(section.tasks ?? []),
      })),
    [agenda.sections],
  );

  const selectedIndex = agendaSummaries.findIndex(
    (item) => item.id === selectedAgendaId,
  );

  const previousAgenda =
    selectedIndex > 0 ? agendaSummaries[selectedIndex - 1] : null;
  const nextAgenda =
    selectedIndex >= 0 && selectedIndex < agendaSummaries.length - 1
      ? agendaSummaries[selectedIndex + 1]
      : null;

  useEffect(() => {
    setExpandedSectionIds(
      new Set(sortByOrder(agenda.sections ?? []).map((section) => section.id)),
    );
  }, [agenda.id, agenda.sections]);

  useEffect(() => {
    localStorage.setItem(LAST_AGENDA_STORAGE_KEY, String(selectedAgendaId));
  }, [selectedAgendaId]);

  useEffect(() => {
    if (hasExplicitSelection) return;

    const savedAgendaId = localStorage.getItem(LAST_AGENDA_STORAGE_KEY);
    if (!savedAgendaId) return;

    const parsedId = Number(savedAgendaId);
    if (!Number.isInteger(parsedId) || parsedId === selectedAgendaId) return;

    const exists = agendaSummaries.some((item) => item.id === parsedId);
    if (!exists) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("agenda", String(parsedId));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [
    agendaSummaries,
    hasExplicitSelection,
    pathname,
    router,
    searchParams,
    selectedAgendaId,
  ]);

  const changeAgenda = (agendaId: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("agenda", String(agendaId));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const onToggleTask = (taskId: number, nextCompleted: boolean) => {
    startTransition(async () => {
      await toggleTaskCompletion(taskId, nextCompleted);
    });
  };

  const collapseAll = () => {
    setExpandedSectionIds(new Set());
  };

  const expandAll = () => {
    setExpandedSectionIds(new Set(sections.map((section) => section.id)));
  };

  const allSectionsExpanded =
    sections.length > 0 && expandedSectionIds.size === sections.length;

  const totalTasks = sections.reduce(
    (sum, section) => sum + section.tasks.length,
    0,
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <label
              htmlFor="agenda-selector"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Week
            </label>
            <select
              id="agenda-selector"
              value={selectedAgendaId}
              onChange={(e) => changeAgenda(Number(e.target.value))}
              className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#BB0000] focus:ring-2 focus:ring-[#BB0000]/10"
            >
              {agendaSummaries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => previousAgenda && changeAgenda(previousAgenda.id)}
              disabled={!previousAgenda}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <button
              type="button"
              onClick={() => nextAgenda && changeAgenda(nextAgenda.id)}
              disabled={!nextAgenda}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          {formatDate(agenda.start_date)} - {formatDate(agenda.end_date)}
        </div>
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Sections</h2>
              <p className="mt-1 text-sm text-gray-500">
                Scroll sideways to move through the week’s sections and tasks.
              </p>
            </div>

            {sections.length > 0 && (
              <button
                type="button"
                onClick={allSectionsExpanded ? collapseAll : expandAll}
                className="shrink-0 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {allSectionsExpanded ? "Collapse all" : "Expand all"}
              </button>
            )}
          </div>

          {sections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              No sections have been added to this agenda yet.
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-max gap-5">
                {sections.map((section) => {
                  const isExpanded = expandedSectionIds.has(section.id);
                  const completedCount = section.tasks.filter((task) =>
                    completedSet.has(task.id),
                  ).length;

                  return (
                    <div
                      key={section.id}
                      className="w-[460px] shrink-0 rounded-2xl border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="border-b border-gray-100 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-xl font-semibold text-gray-900">
                                {section.title}
                              </h3>
                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                                {section.type === "solo" ? "Solo" : "Group"}
                              </span>
                            </div>

                            <p className="mt-2 text-base text-gray-500">
                              {section.description || "No description"}
                            </p>

                            <p className="mt-3 text-sm text-gray-400">
                              {completedCount}/{section.tasks.length} done
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSectionIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(section.id)) {
                                  next.delete(section.id);
                                } else {
                                  next.add(section.id);
                                }
                                return next;
                              })
                            }
                            className="rounded p-1 text-gray-500 transition hover:bg-gray-100"
                            aria-label={
                              isExpanded
                                ? `Collapse ${section.title}`
                                : `Expand ${section.title}`
                            }
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="max-h-[620px] space-y-4 overflow-y-auto p-5">
                          {section.tasks.length === 0 ? (
                            <p className="text-sm text-gray-400">No tasks yet.</p>
                          ) : (
                            section.tasks.map((task) => {
                              const isChecked = completedSet.has(task.id);

                              return (
                                <div
                                  key={task.id}
                                  className="rounded-2xl border border-gray-100 p-4"
                                >
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={isPending}
                                      onChange={(e) =>
                                        onToggleTask(task.id, e.target.checked)
                                      }
                                      className="mt-1 h-5 w-5 rounded border-gray-300"
                                    />

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <p
                                          className={`text-lg font-medium ${
                                            isChecked
                                              ? "text-gray-400 line-through"
                                              : "text-gray-900"
                                          }`}
                                        >
                                          {task.title}
                                        </p>

                                        {task.link && (
                                          <a
                                            href={task.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#BB0000] hover:underline"
                                            aria-label={`Open link for ${task.title}`}
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                          </a>
                                        )}
                                      </div>

                                      <p className="mt-2 text-base text-gray-500">
                                        {task.description || "No description"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="h-full">
          <div className="flex h-full min-h-[420px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Progress</h3>
              <p className="mt-1 text-sm text-gray-500">
                Track how you and your group are doing for this week.
              </p>
            </div>

            <div className="mt-8 space-y-6">
              <ProgressBar label="Your Progress" percent={studentProgressPercent} />
              <ProgressBar label="Group Progress" percent={groupProgressPercent} />
            </div>

            <div className="mt-auto pt-8">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Sections
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {sections.length}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Tasks
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {totalTasks}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}