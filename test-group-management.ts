/*
  test-group-management.ts
  Run with: npm run test:group-management

  Focused regression coverage for manual group management rules:
    - manual group time validation
    - slot-index conversion for manual meetings
    - compatibility warnings for preference mismatch
    - compatibility warnings for availability mismatch
    - clean pass when a student fits the group
*/

import {
  buildCompatibilityWarnings,
  getSlotIndexForMeeting,
  validateManualGroupInput,
} from "./lib/group-management.ts";

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
  if (!condition) {
    throw new Error(message);
  }
}

console.log("\n========================================");
console.log("  Manual Group Management Tests");
console.log("========================================\n");

test("accepts valid 1-hour manual group input", () => {
  const result = validateManualGroupInput({
    dayOfWeek: 2,
    meetStartTime: "10:00:00",
    meetEndTime: "11:00:00",
    preference: "online",
  });

  assert(result.ok, "Expected valid manual group input to pass validation");
});

test("rejects manual groups that are not exactly 1 hour", () => {
  const result = validateManualGroupInput({
    dayOfWeek: 2,
    meetStartTime: "10:00:00",
    meetEndTime: "12:00:00",
    preference: "online",
  });

  assert(!result.ok, "Expected a 2-hour meeting to be rejected");
});

test("rejects manual groups outside the supported meeting window", () => {
  const result = validateManualGroupInput({
    dayOfWeek: 4,
    meetStartTime: "06:00:00",
    meetEndTime: "07:00:00",
    preference: "in_person",
  });

  assert(!result.ok, "Expected a 6 AM meeting to be rejected");
});

test("converts a meeting day and start time into the matching slot index", () => {
  const slotIndex = getSlotIndexForMeeting(1, "09:00:00");
  assert(slotIndex === 18, `Expected Tuesday 9 AM to map to slot 18, got ${slotIndex}`);
});

test("warns when a student's strict preference conflicts with the group", () => {
  const warning = buildCompatibilityWarnings({
    group: {
      dayOfWeek: 0,
      meetStartTime: "09:00:00",
      meetEndTime: "10:00:00",
      preference: "online",
    },
    userId: "student-1",
    studentName: "Alice",
    studentPreference: "in_person",
    availabilitySlotIndexes: [2],
  });

  assert(warning, "Expected a warning for preference mismatch");
  assert(
    warning.messages.some((message) => message.includes("Preference mismatch")),
    "Expected a preference mismatch warning",
  );
});

test("warns when a student is unavailable for the manual meeting", () => {
  const warning = buildCompatibilityWarnings({
    group: {
      dayOfWeek: 3,
      meetStartTime: "13:00:00",
      meetEndTime: "14:00:00",
      preference: "in_person",
    },
    userId: "student-2",
    studentName: "Bob",
    studentPreference: "in_person",
    availabilitySlotIndexes: [],
  });

  assert(warning, "Expected a warning for missing availability");
  assert(
    warning.messages.some((message) => message.includes("Availability mismatch")),
    "Expected an availability mismatch warning",
  );
});

test("returns no warning when the student matches the group", () => {
  const warning = buildCompatibilityWarnings({
    group: {
      dayOfWeek: 0,
      meetStartTime: "09:00:00",
      meetEndTime: "10:00:00",
      preference: "in_person",
    },
    userId: "student-3",
    studentName: "Cara",
    studentPreference: "in_person",
    availabilitySlotIndexes: [2],
  });

  assert(warning === null, "Expected no warning for a compatible student");
});

console.log("\n========================================");
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("  All tests passed!");
} else {
  console.log(`  ${failed} test(s) need attention.`);
}
console.log("========================================\n");
