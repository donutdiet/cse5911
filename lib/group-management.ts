export type GroupPreference = "in_person" | "online";
export type StudentPreference = GroupPreference | "no_preference" | null;

export type ManualGroupFormInput = {
  dayOfWeek: number;
  meetStartTime: string;
  meetEndTime: string;
  preference: GroupPreference;
};

export type ManualGroupInput = ManualGroupFormInput & {
  studentIds: string[];
  overrideWarnings?: boolean;
};

export type AssignStudentInput = {
  userId: string;
  groupId: string;
  overrideWarnings?: boolean;
};

export type CompatibilityWarning = {
  userId: string;
  studentName: string;
  messages: string[];
};

export type WarningActionResult = {
  requiresConfirmation: true;
  warnings: CompatibilityWarning[];
};

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const GROUP_TIME_OPTIONS = Array.from({ length: 16 }, (_, index) => {
  const hour = 7 + index;
  return `${String(hour).padStart(2, "0")}:00`;
});

function normalizeTimeString(value: string) {
  const trimmed = value.trim();
  const parts = trimmed.split(":");

  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const [hourStr, minuteStr, secondStr = "00"] = parts;
  const hour = Number.parseInt(hourStr, 10);
  const minute = Number.parseInt(minuteStr, 10);
  const second = Number.parseInt(secondStr, 10);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    Number.isNaN(second) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function getHour(timeString: string) {
  return Number.parseInt(timeString.slice(0, 2), 10);
}

export function formatMeetingTime(timeString: string) {
  const normalized = normalizeTimeString(timeString);
  if (!normalized) return timeString;

  const hour = getHour(normalized);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:00 ${ampm}`;
}

export function getMeetingLabel(group: ManualGroupFormInput) {
  const dayName = DAY_NAMES[group.dayOfWeek] ?? "Unknown day";
  return `${dayName} ${formatMeetingTime(group.meetStartTime)} to ${formatMeetingTime(group.meetEndTime)}`;
}

export function validateManualGroupInput(input: ManualGroupFormInput) {
  if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    return { ok: false as const, error: "Select a valid day of the week." };
  }

  if (input.preference !== "in_person" && input.preference !== "online") {
    return { ok: false as const, error: "Select a valid group preference." };
  }

  const meetStartTime = normalizeTimeString(input.meetStartTime);
  const meetEndTime = normalizeTimeString(input.meetEndTime);

  if (!meetStartTime || !meetEndTime) {
    return { ok: false as const, error: "Enter a valid start and end time." };
  }

  const startHour = getHour(meetStartTime);
  const endHour = getHour(meetEndTime);
  const startMinutes = meetStartTime.slice(3);
  const endMinutes = meetEndTime.slice(3);

  if (startMinutes !== "00:00" || endMinutes !== "00:00") {
    return {
      ok: false as const,
      error: "Manual groups must start and end on the hour.",
    };
  }

  if (startHour < 7 || startHour > 22 || endHour < 8 || endHour > 23) {
    return {
      ok: false as const,
      error: "Manual groups must use the supported 7:00 AM to 11:00 PM schedule.",
    };
  }

  if (endHour - startHour !== 1) {
    return {
      ok: false as const,
      error: "Manual groups must be exactly 1 hour long.",
    };
  }

  return {
    ok: true as const,
    value: {
      dayOfWeek: input.dayOfWeek,
      meetStartTime,
      meetEndTime,
      preference: input.preference,
    },
  };
}

export function getSlotIndexForMeeting(dayOfWeek: number, meetStartTime: string) {
  const normalizedTime = normalizeTimeString(meetStartTime);
  if (!normalizedTime) {
    return null;
  }

  const hour = getHour(normalizedTime);
  if (hour < 7 || hour > 22) {
    return null;
  }

  return dayOfWeek * 16 + (hour - 7);
}

export function buildCompatibilityWarnings({
  group,
  userId,
  studentName,
  studentPreference,
  availabilitySlotIndexes,
}: {
  group: ManualGroupFormInput;
  userId: string;
  studentName: string;
  studentPreference: StudentPreference;
  availabilitySlotIndexes: number[];
}) {
  const messages: string[] = [];

  if (
    studentPreference &&
    studentPreference !== "no_preference" &&
    studentPreference !== group.preference
  ) {
    messages.push(
      `Preference mismatch: student prefers ${studentPreference.replaceAll("_", " ")}, but the group is ${group.preference.replaceAll("_", " ")}.`,
    );
  }

  const slotIndex = getSlotIndexForMeeting(group.dayOfWeek, group.meetStartTime);
  if (slotIndex === null || !availabilitySlotIndexes.includes(slotIndex)) {
    messages.push(
      `Availability mismatch: student is not marked available for ${getMeetingLabel(group)}.`,
    );
  }

  if (messages.length === 0) {
    return null;
  }

  return {
    userId,
    studentName,
    messages,
  } satisfies CompatibilityWarning;
}
