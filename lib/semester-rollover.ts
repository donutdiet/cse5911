export type SemesterRolloverSelection = {
  clearUsersAndProfiles: boolean;
  clearRooms: boolean;
  clearAgendas: boolean;
};

export type SemesterRolloverStep = "usersAndProfiles" | "agendas" | "rooms";

export const ROLLOVER_CONFIRMATION_PHRASE = "ROLL OVER";

export function hasSemesterRolloverSelection(
  selection: SemesterRolloverSelection,
) {
  return (
    selection.clearUsersAndProfiles ||
    selection.clearRooms ||
    selection.clearAgendas
  );
}

export function getSemesterRolloverSteps(
  selection: SemesterRolloverSelection,
): SemesterRolloverStep[] {
  const steps: SemesterRolloverStep[] = [];

  if (selection.clearUsersAndProfiles) {
    steps.push("usersAndProfiles");
  }

  if (selection.clearAgendas) {
    steps.push("agendas");
  }

  if (selection.clearRooms) {
    steps.push("rooms");
  }

  return steps;
}

export function describeSemesterRolloverSelection(
  selection: SemesterRolloverSelection,
) {
  const descriptions: string[] = [];

  if (selection.clearUsersAndProfiles) {
    descriptions.push(
      "Student auth users, profiles, availability, memberships, groups, and task completion records",
    );
  }

  if (selection.clearAgendas) {
    descriptions.push(
      "All agendas, sections, tasks, and any task completion rows tied to those tasks",
    );
  }

  if (selection.clearRooms) {
    descriptions.push(
      "All rooms and room-day availability after room assignments are cleared from groups",
    );
  }

  return descriptions;
}

export function validateSemesterRolloverRequest(args: {
  selection: SemesterRolloverSelection;
  confirmationText: string;
}) {
  if (!hasSemesterRolloverSelection(args.selection)) {
    return "Select at least one data set to clear.";
  }

  if (args.confirmationText.trim() !== ROLLOVER_CONFIRMATION_PHRASE) {
    return `Type ${ROLLOVER_CONFIRMATION_PHRASE} to confirm this rollover.`;
  }

  return null;
}
