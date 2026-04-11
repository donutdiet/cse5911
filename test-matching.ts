/*
  test-matching.ts
  Run with: npm run test:matching

  Focused regression coverage for the slot-based 1-hour matcher:
    - group size constraints (2-6 students)
    - 1-hour slot behavior
    - balanced group partitioning
    - preference separation
    - no_preference fill behavior
    - scarcity-first placement
    - no double placements / no lost students
*/

import { runMatchingAlgorithm, type MatchingResult, type MatchingStudent } from "./lib/matching.ts";

type Slot = {
  time_slot_id: number;
  slot_index: number;
};

function slot(day: number, pos: number): Slot {
  const index = day * 16 + pos;
  return { time_slot_id: index + 1, slot_index: index };
}

const MON = {
  s9am: slot(0, 2),
  s10am: slot(0, 3),
  s11am: slot(0, 4),
  s2pm: slot(0, 7),
  s10pm: slot(0, 15),
};

const TUE = {
  s9am: slot(1, 2),
  s10am: slot(1, 3),
  s11am: slot(1, 4),
};

const WED = {
  s9am: slot(2, 2),
  s10am: slot(2, 3),
};

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error: unknown) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function makeStudent(
  id: number,
  name: string,
  preference: MatchingStudent["preference"],
  slots: Slot[],
): MatchingStudent {
  return {
    user_id: String(id),
    full_name: name,
    preference,
    availability: slots,
  };
}

function assertGroupSizes(result: MatchingResult): void {
  for (const group of result.groups) {
    assert(group.members.length >= 2, `Group has only ${group.members.length} members`);
    assert(group.members.length <= 6, `Group has ${group.members.length} members`);
  }
}

function assertNoDoublePlacement(result: MatchingResult): void {
  const seen = new Set<string>();

  for (const group of result.groups) {
    for (const member of group.members) {
      assert(!seen.has(member.user_id), `Student ${member.user_id} placed twice`);
      seen.add(member.user_id);
    }
  }

  for (const student of result.flagged) {
    assert(!seen.has(student.user_id), `Student ${student.user_id} both placed and flagged`);
  }
}

function assertEveryoneAccountedFor(
  result: MatchingResult,
  expectedCount: number,
): void {
  const placed = result.groups.reduce((sum, group) => sum + group.members.length, 0);
  assert(
    placed + result.flagged.length === expectedCount,
    `Expected ${expectedCount} students accounted for, got placed(${placed}) + flagged(${result.flagged.length})`,
  );
}

function assertPreferencesNotMixed(result: MatchingResult): void {
  for (const group of result.groups) {
    for (const member of group.members) {
      if (member.preference === "in_person") {
        assert(
          group.preference === "in_person",
          `In-person student ${member.user_id} placed in online group`,
        );
      }

      if (member.preference === "online") {
        assert(
          group.preference === "online",
          `Online student ${member.user_id} placed in in-person group`,
        );
      }
    }
  }
}

function getGroupSizes(result: MatchingResult): number[] {
  return result.groups
    .map((group) => group.members.length)
    .sort((a, b) => b - a);
}

console.log("\n========================================");
console.log("  Slot-Based Matching Algorithm Tests");
console.log("========================================\n");

console.log("Section 1: Basic 1-hour grouping");

test("forms one group when exactly 2 students share a single slot", () => {
  const students = [
    makeStudent(1, "Alice", "in_person", [MON.s10am]),
    makeStudent(2, "Bob", "in_person", [MON.s10am]),
  ];

  const result = runMatchingAlgorithm(students);

  assert(result.groups.length === 1, `Expected 1 group, got ${result.groups.length}`);
  assert(result.groups[0].members.length === 2, "Expected a 2-person group");
  assert(
    result.groups[0].window.startIndex === MON.s10am.slot_index,
    "Expected Monday 10am slot",
  );
  assert(result.flagged.length === 0, "Expected 0 flagged students");
});

test("forms one full group when exactly 6 students share a slot", () => {
  const students = Array.from({ length: 6 }, (_, index) =>
    makeStudent(index + 1, `Student${index + 1}`, "in_person", [MON.s10am]),
  );

  const result = runMatchingAlgorithm(students);

  assert(result.groups.length === 1, `Expected 1 group, got ${result.groups.length}`);
  assert(result.groups[0].members.length === 6, "Expected a 6-person group");
  assert(result.flagged.length === 0, "Expected 0 flagged students");
});

test("splits 7 students into balanced groups of 4 and 3", () => {
  const students = Array.from({ length: 7 }, (_, index) =>
    makeStudent(index + 1, `Student${index + 1}`, "in_person", [MON.s10am]),
  );

  const result = runMatchingAlgorithm(students);

  assert(result.groups.length === 2, `Expected 2 groups, got ${result.groups.length}`);
  assert(
    JSON.stringify(getGroupSizes(result)) === JSON.stringify([4, 3]),
    "Expected group sizes [4, 3]",
  );
  assert(result.flagged.length === 0, "Expected 0 flagged students");
});

test("splits 8 students into balanced groups of 4 and 4", () => {
  const students = Array.from({ length: 8 }, (_, index) =>
    makeStudent(index + 1, `Student${index + 1}`, "in_person", [MON.s10am]),
  );

  const result = runMatchingAlgorithm(students);

  assert(
    JSON.stringify(getGroupSizes(result)) === JSON.stringify([4, 4]),
    "Expected group sizes [4, 4]",
  );
  assert(result.flagged.length === 0, "Expected 0 flagged students");
});

test("splits 10 students into balanced groups of 5 and 5", () => {
  const students = Array.from({ length: 10 }, (_, index) =>
    makeStudent(index + 1, `Student${index + 1}`, "in_person", [MON.s10am]),
  );

  const result = runMatchingAlgorithm(students);

  assert(
    JSON.stringify(getGroupSizes(result)) === JSON.stringify([5, 5]),
    "Expected group sizes [5, 5]",
  );
});

test("splits 11 students into balanced groups of 6 and 5", () => {
  const students = Array.from({ length: 11 }, (_, index) =>
    makeStudent(index + 1, `Student${index + 1}`, "in_person", [MON.s10am]),
  );

  const result = runMatchingAlgorithm(students);

  assert(
    JSON.stringify(getGroupSizes(result)) === JSON.stringify([6, 5]),
    "Expected group sizes [6, 5]",
  );
  assert(result.flagged.length === 0, "Expected 0 flagged students");
});

test("flags a student with no overlapping partner", () => {
  const students = [
    makeStudent(1, "Solo", "in_person", [MON.s10am]),
    makeStudent(2, "Other", "in_person", [TUE.s10am]),
  ];

  const result = runMatchingAlgorithm(students);

  assert(result.groups.length === 0, "Expected 0 groups");
  assert(result.flagged.length === 2, "Expected both students flagged");
});

test("last slot of the day is valid for a 1-hour meeting", () => {
  const students = [
    makeStudent(1, "Night1", "in_person", [MON.s10pm]),
    makeStudent(2, "Night2", "in_person", [MON.s10pm]),
  ];

  const result = runMatchingAlgorithm(students);

  assert(result.groups.length === 1, "Expected a group at the last slot");
  assert(
    result.groups[0].window.startIndex === MON.s10pm.slot_index,
    "Expected Monday 10pm slot",
  );
  assert(result.flagged.length === 0, "Expected 0 flagged students");
});

console.log("\nSection 2: Preference handling");

test("in_person and online students form separate groups at the same slot", () => {
  const students = [
    ...Array.from({ length: 2 }, (_, index) =>
      makeStudent(index + 1, `IP${index + 1}`, "in_person", [MON.s10am]),
    ),
    ...Array.from({ length: 2 }, (_, index) =>
      makeStudent(index + 10, `ON${index + 1}`, "online", [MON.s10am]),
    ),
  ];

  const result = runMatchingAlgorithm(students);

  assert(result.groups.length === 2, `Expected 2 groups, got ${result.groups.length}`);
  assertPreferencesNotMixed(result);
});

test("no_preference students fill a strict-preference group", () => {
  const students = [
    makeStudent(1, "IP1", "in_person", [MON.s10am]),
    makeStudent(2, "IP2", "in_person", [MON.s10am]),
    makeStudent(3, "NP1", "no_preference", [MON.s10am]),
    makeStudent(4, "NP2", "no_preference", [MON.s10am]),
  ];

  const result = runMatchingAlgorithm(students);

  assert(result.groups.length === 1, "Expected 1 group");
  assert(result.groups[0].preference === "in_person", "Expected in-person group");
  assert(result.flagged.length === 0, "Expected 0 flagged students");
});

test("all no_preference students can form their own group", () => {
  const students = Array.from({ length: 4 }, (_, index) =>
    makeStudent(index + 1, `NP${index + 1}`, "no_preference", [TUE.s10am]),
  );

  const result = runMatchingAlgorithm(students);

  assert(result.groups.length === 1, "Expected 1 group");
  assert(result.groups[0].members.length === 4, "Expected a 4-person group");
  assert(result.flagged.length === 0, "Expected 0 flagged students");
});

console.log("\nSection 3: Scarcity and adaptivity");

test("least available students are preserved when an oversized slot pool is split", () => {
  const scarceStudents = Array.from({ length: 6 }, (_, index) =>
    makeStudent(index + 1, `Scarce${index + 1}`, "in_person", [MON.s10am]),
  );

  const flexibleStudents = Array.from({ length: 2 }, (_, index) =>
    makeStudent(index + 20, `Flexible${index + 1}`, "in_person", [
      MON.s10am,
      TUE.s10am,
      WED.s10am,
    ]),
  );

  const result = runMatchingAlgorithm([...scarceStudents, ...flexibleStudents]);

  const placedIds = new Set(
    result.groups.flatMap((group) => group.members.map((member) => member.user_id)),
  );
  for (let id = 1; id <= 6; id++) {
    assert(placedIds.has(String(id)), `Expected scarce student ${id} to be placed`);
  }

  assert(result.flagged.length === 0, "Expected 0 flagged students");
});

test("adaptive selection does not rely on chronological slot order", () => {
  const students = [
    makeStudent(1, "TueOnly1", "in_person", [TUE.s10am]),
    makeStudent(2, "TueOnly2", "in_person", [TUE.s10am]),
    makeStudent(3, "TueOnly3", "in_person", [TUE.s10am]),
    makeStudent(4, "MonTue1", "in_person", [MON.s9am, TUE.s10am]),
    makeStudent(5, "MonTue2", "in_person", [MON.s9am, TUE.s10am]),
    makeStudent(6, "MonOnly1", "in_person", [MON.s9am]),
    makeStudent(7, "MonOnly2", "in_person", [MON.s9am]),
  ];

  const result = runMatchingAlgorithm(students);

  assert(result.groups.length === 2, `Expected 2 groups, got ${result.groups.length}`);
  assert(result.flagged.length === 0, "Expected 0 flagged students");

  const tuesdayGroup = result.groups.find(
    (group) => group.window.startIndex === TUE.s10am.slot_index,
  );
  assert(tuesdayGroup, "Expected a Tuesday 10am group to form");
  const tuesdayIds = new Set(tuesdayGroup.members.map((member) => member.user_id));

  assert(tuesdayIds.has("1"), "Tuesday-only student 1 should be placed Tuesday");
  assert(tuesdayIds.has("2"), "Tuesday-only student 2 should be placed Tuesday");
  assert(tuesdayIds.has("3"), "Tuesday-only student 3 should be placed Tuesday");
});

console.log("\nSection 4: Invariants");

test("no student is placed twice and every student is accounted for in a mixed dataset", () => {
  const students = [
    ...Array.from({ length: 6 }, (_, index) =>
      makeStudent(index + 1, `IP_Mon${index + 1}`, "in_person", [MON.s10am, TUE.s10am]),
    ),
    ...Array.from({ length: 5 }, (_, index) =>
      makeStudent(index + 10, `ON_Tue${index + 1}`, "online", [TUE.s10am, WED.s10am]),
    ),
    ...Array.from({ length: 4 }, (_, index) =>
      makeStudent(index + 20, `NP${index + 1}`, "no_preference", [MON.s10am, TUE.s10am]),
    ),
    makeStudent(99, "Straggler", "in_person", [WED.s9am]),
  ];

  const result = runMatchingAlgorithm(students);

  assertGroupSizes(result);
  assertNoDoublePlacement(result);
  assertPreferencesNotMixed(result);
  assertEveryoneAccountedFor(result, students.length);
  assert(
    result.flagged.some((student) => student.user_id === "99"),
    "Expected the straggler to be flagged",
  );
});

console.log("\n========================================");
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("  All tests passed!");
} else {
  console.log(`  ${failed} test(s) need attention.`);
}
console.log("========================================\n");
