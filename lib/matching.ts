/*
  matching.ts
  Slot-based group matching for AnatWithMe.

  Core ideas:
    1. Meetings are 1 hour long, so each time_slot is a candidate group time.
    2. Students are scored by flexibility once up front using total availability.
    3. On each round, evaluate every remaining (slot, preference) candidate.
    4. Pick the best candidate based on scarcity first, then placeable count,
       then partition quality. This lets scarce students win over chronology.
    5. Build as many balanced groups of 2-6 as possible for the chosen slot.
    6. Strict-preference students are taken first; no_preference students fill.

  Expects students shaped like:
  [{ user_id, full_name, preference, availability: [{ time_slot_id, slot_index }] }]
*/

export type Preference = "in_person" | "online" | "no_preference";
export type StrictPreference = Exclude<Preference, "no_preference">;

export type AvailabilitySlot = {
  time_slot_id: number;
  slot_index: number;
};

export type MatchingStudent = {
  user_id: string;
  full_name: string;
  preference: Preference;
  availability: AvailabilitySlot[];
};

export type MatchingWindow = {
  startIndex: number;
  day: number;
};

export type MatchingGroup = {
  members: MatchingStudent[];
  window: MatchingWindow;
  preference: StrictPreference;
};

export type FlaggedStudent = MatchingStudent;

export type MatchingResult = {
  groups: MatchingGroup[];
  flagged: FlaggedStudent[];
};

type AnnotatedStudent = MatchingStudent & {
  availabilityCount: number;
};

type MatchingState = {
  unassigned: Map<string, AnnotatedStudent>;
  slotToStudents: Map<number, AnnotatedStudent[]>;
  placedCounts: Record<StrictPreference, number>;
};

type Candidate = {
  slotIndex: number;
  preference: StrictPreference;
  strictStudents: AnnotatedStudent[];
  noPreferenceStudents: AnnotatedStudent[];
  totalEligible: number;
  strictCount: number;
  scarcityScore: number;
  groupSizes: number[];
  partitionScore: number;
  pureNoPreference: boolean;
};

type PartitionStats = {
  placed: number;
  deviation: number;
  spread: number;
  minSize: number;
  groupCount: number;
};

const MIN_GROUP_SIZE = 2;
const MAX_GROUP_SIZE = 6;
const IDEAL_GROUP_SIZE = 5;
const SLOTS_PER_DAY = 16;
const PREFERENCES: StrictPreference[] = ["in_person", "online"];
const partitionCache = new Map<number, number[]>();

/*
  Main entry point.
  Returns { groups, flagged }.
*/
export function runMatchingAlgorithm(
  students: MatchingStudent[],
): MatchingResult {
  const state = buildMatchingState(students);
  const groups: MatchingGroup[] = [];

  while (state.unassigned.size >= MIN_GROUP_SIZE) {
    const candidate = selectBestCandidate(state);
    if (!candidate) break;

    const nextGroups = buildGroupsFromCandidate(candidate);
    if (nextGroups.length === 0) break;

    for (const group of nextGroups) {
      groups.push(group);
      state.placedCounts[group.preference] += group.members.length;

      for (const member of group.members) {
        state.unassigned.delete(member.user_id);
      }
    }
  }

  return {
    groups,
    flagged: [...state.unassigned.values()].map(stripAnnotatedStudent),
  };
}

function buildMatchingState(students: MatchingStudent[]): MatchingState {
  const annotatedStudents: AnnotatedStudent[] = students.map((student) => ({
    ...student,
    preference: student.preference ?? "no_preference",
    availabilityCount: student.availability.length,
  }));

  const unassigned = new Map<string, AnnotatedStudent>();
  const slotToStudents = new Map<number, AnnotatedStudent[]>();

  for (const student of annotatedStudents) {
    unassigned.set(student.user_id, student);

    for (const slot of student.availability) {
      if (!slotToStudents.has(slot.slot_index)) {
        slotToStudents.set(slot.slot_index, []);
      }

      slotToStudents.get(slot.slot_index)?.push(student);
    }
  }

  return {
    unassigned,
    slotToStudents,
    placedCounts: {
      in_person: 0,
      online: 0,
    },
  };
}

function stripAnnotatedStudent(student: AnnotatedStudent): MatchingStudent {
  return {
    user_id: student.user_id,
    full_name: student.full_name,
    preference: student.preference,
    availability: student.availability,
  };
}

function selectBestCandidate(state: MatchingState): Candidate | null {
  let bestCandidate: Candidate | null = null;

  for (const [slotIndex, studentsAtSlot] of state.slotToStudents.entries()) {
    for (const preference of PREFERENCES) {
      const candidate = buildCandidate(
        slotIndex,
        preference,
        studentsAtSlot,
        state,
      );
      if (!candidate) continue;

      if (
        !bestCandidate ||
        isBetterCandidate(candidate, bestCandidate, state.placedCounts)
      ) {
        bestCandidate = candidate;
      }
    }
  }

  return bestCandidate;
}

function buildCandidate(
  slotIndex: number,
  preference: StrictPreference,
  studentsAtSlot: AnnotatedStudent[],
  state: MatchingState,
): Candidate | null {
  const strictStudents: AnnotatedStudent[] = [];
  const noPreferenceStudents: AnnotatedStudent[] = [];

  for (const student of studentsAtSlot) {
    if (!state.unassigned.has(student.user_id)) continue;

    if (student.preference === preference) {
      strictStudents.push(student);
      continue;
    }

    if (student.preference === "no_preference") {
      noPreferenceStudents.push(student);
    }
  }

  const totalEligible = strictStudents.length + noPreferenceStudents.length;
  if (totalEligible < MIN_GROUP_SIZE) {
    return null;
  }

  strictStudents.sort(compareStudents);
  noPreferenceStudents.sort(compareStudents);

  const groupSizes = getBestGroupSizes(totalEligible);
  if (groupSizes.length === 0) {
    return null;
  }

  return {
    slotIndex,
    preference,
    strictStudents,
    noPreferenceStudents,
    totalEligible,
    strictCount: strictStudents.length,
    scarcityScore: getScarcityScore(strictStudents, noPreferenceStudents),
    groupSizes,
    partitionScore: getPartitionScore(groupSizes),
    pureNoPreference: strictStudents.length === 0,
  };
}

function isBetterCandidate(
  candidate: Candidate,
  currentBest: Candidate,
  placedCounts: Record<StrictPreference, number>,
): boolean {
  if (candidate.scarcityScore !== currentBest.scarcityScore) {
    return candidate.scarcityScore > currentBest.scarcityScore;
  }

  if (candidate.totalEligible !== currentBest.totalEligible) {
    return candidate.totalEligible > currentBest.totalEligible;
  }

  if (candidate.strictCount !== currentBest.strictCount) {
    return candidate.strictCount > currentBest.strictCount;
  }

  if (candidate.partitionScore !== currentBest.partitionScore) {
    return candidate.partitionScore > currentBest.partitionScore;
  }

  if (candidate.pureNoPreference && currentBest.pureNoPreference) {
    const candidatePlaced = placedCounts[candidate.preference];
    const bestPlaced = placedCounts[currentBest.preference];

    if (candidatePlaced !== bestPlaced) {
      return candidatePlaced < bestPlaced;
    }
  }

  if (candidate.slotIndex !== currentBest.slotIndex) {
    return candidate.slotIndex < currentBest.slotIndex;
  }

  return candidate.preference < currentBest.preference;
}

function buildGroupsFromCandidate(candidate: Candidate): MatchingGroup[] {
  const strictStudents = [...candidate.strictStudents];
  const noPreferenceStudents = [...candidate.noPreferenceStudents];
  const groups: MatchingGroup[] = [];

  for (const groupSize of candidate.groupSizes) {
    const members: MatchingStudent[] = [];

    while (members.length < groupSize && strictStudents.length > 0) {
      const student = strictStudents.shift();
      if (student) members.push(stripAnnotatedStudent(student));
    }

    while (members.length < groupSize && noPreferenceStudents.length > 0) {
      const student = noPreferenceStudents.shift();
      if (student) members.push(stripAnnotatedStudent(student));
    }

    if (members.length >= MIN_GROUP_SIZE) {
      groups.push({
        members,
        window: slotIndexToWindow(candidate.slotIndex),
        preference: candidate.preference,
      });
    }
  }

  return groups;
}

function getScarcityScore(
  strictStudents: AnnotatedStudent[],
  noPreferenceStudents: AnnotatedStudent[],
): number {
  const allStudents = [...strictStudents, ...noPreferenceStudents];

  return allStudents.reduce((score, student) => {
    const availabilityCount = Math.max(student.availabilityCount, 1);
    return score + 1000 / availabilityCount;
  }, 0);
}

function compareStudents(a: AnnotatedStudent, b: AnnotatedStudent): number {
  if (a.availabilityCount !== b.availabilityCount) {
    return a.availabilityCount - b.availabilityCount;
  }

  if (a.full_name !== b.full_name) {
    return a.full_name.localeCompare(b.full_name);
  }

  return a.user_id.localeCompare(b.user_id);
}

function slotIndexToWindow(slotIndex: number): MatchingWindow {
  return {
    startIndex: slotIndex,
    day: Math.floor(slotIndex / SLOTS_PER_DAY),
  };
}

function getBestGroupSizes(studentCount: number): number[] {
  if (partitionCache.has(studentCount)) {
    return partitionCache.get(studentCount) ?? [];
  }

  let bestPartition: number[] = [];

  for (let size = MIN_GROUP_SIZE; size <= MAX_GROUP_SIZE; size++) {
    const remaining = studentCount - size;
    if (remaining < 0) break;
    if (remaining !== 0 && remaining < MIN_GROUP_SIZE) continue;

    const rest = remaining === 0 ? [] : getBestGroupSizes(remaining);
    if (remaining !== 0 && rest.length === 0) continue;

    const candidate = [size, ...rest].sort((a, b) => b - a);
    if (isBetterPartition(candidate, bestPartition)) {
      bestPartition = candidate;
    }
  }

  partitionCache.set(studentCount, bestPartition);
  return bestPartition;
}

function isBetterPartition(candidate: number[], currentBest: number[]): boolean {
  if (currentBest.length === 0) return true;

  const candidateStats = getPartitionStats(candidate);
  const currentStats = getPartitionStats(currentBest);

  if (candidateStats.placed !== currentStats.placed) {
    return candidateStats.placed > currentStats.placed;
  }

  if (candidateStats.deviation !== currentStats.deviation) {
    return candidateStats.deviation < currentStats.deviation;
  }

  if (candidateStats.spread !== currentStats.spread) {
    return candidateStats.spread < currentStats.spread;
  }

  if (candidateStats.minSize !== currentStats.minSize) {
    return candidateStats.minSize > currentStats.minSize;
  }

  if (candidateStats.groupCount !== currentStats.groupCount) {
    return candidateStats.groupCount < currentStats.groupCount;
  }

  return candidate.join(",") > currentBest.join(",");
}

function getPartitionStats(groupSizes: number[]): PartitionStats {
  const placed = groupSizes.reduce((sum, size) => sum + size, 0);
  const minSize = Math.min(...groupSizes);
  const maxSize = Math.max(...groupSizes);
  const deviation = groupSizes.reduce(
    (sum, size) => sum + Math.abs(size - IDEAL_GROUP_SIZE),
    0,
  );

  return {
    placed,
    deviation,
    spread: maxSize - minSize,
    minSize,
    groupCount: groupSizes.length,
  };
}

function getPartitionScore(groupSizes: number[]): number {
  const stats = getPartitionStats(groupSizes);
  return (
    stats.minSize * 100 -
    stats.spread * 10 -
    stats.deviation -
    stats.groupCount
  );
}
