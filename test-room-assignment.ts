/*
  test-room-assignment.ts
  Run with: npm run test:rooms

  Focused regression coverage for room assignment rules:
    - room day filtering
    - group capacity per slot
    - existing room usage reducing capacity
    - overflow detection
    - override assignment
*/

import {
  assignRoomsToGroups,
  type ExistingRoomUsage,
  type RoomAssignmentCandidate,
  type RoomInventory,
} from "./lib/room-assignment.ts";

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

const rooms: RoomInventory[] = [
  {
    id: 1,
    building: "Scott",
    roomNumber: "101",
    groupCapacity: 2,
    availableDays: [0, 1, 2, 3, 4],
  },
  {
    id: 2,
    building: "Scott",
    roomNumber: "102",
    groupCapacity: 1,
    availableDays: [0, 2, 4],
  },
];

function makeGroup(
  dayOfWeek: number,
  meetStartTime: string,
  preference: "in_person" | "online" = "in_person",
): RoomAssignmentCandidate {
  return {
    dayOfWeek,
    meetStartTime,
    preference,
  };
}

console.log("\n========================================");
console.log("  Room Assignment Tests");
console.log("========================================\n");

test("assigns groups into rooms up to capacity", () => {
  const result = assignRoomsToGroups(
    [makeGroup(0, "09:00:00"), makeGroup(0, "09:00:00"), makeGroup(0, "09:00:00")],
    rooms,
  );

  assert(result.overflow.length === 0, "Expected no overflow");
  assert(
    result.assignments.filter((assignment) => assignment.roomId !== null).length === 3,
    "Expected all groups to receive rooms",
  );
});

test("respects room-day availability", () => {
  const result = assignRoomsToGroups(
    [makeGroup(1, "09:00:00"), makeGroup(1, "09:00:00"), makeGroup(1, "09:00:00")],
    rooms,
  );

  assert(result.overflow.length === 1, "Expected overflow on Tuesday");
  assert(
    result.assignments.filter((assignment) => assignment.roomId === 1).length === 2,
    "Expected only the Tuesday-available room to be used",
  );
  assert(
    result.assignments.some((assignment) => assignment.roomId === null),
    "Expected one unassigned group when capacity runs out",
  );
});

test("subtracts existing room usage from available capacity", () => {
  const existingUsage: ExistingRoomUsage[] = [
    {
      roomId: 1,
      dayOfWeek: 0,
      meetStartTime: "09:00:00",
      groupCount: 1,
    },
  ];

  const result = assignRoomsToGroups(
    [makeGroup(0, "09:00:00"), makeGroup(0, "09:00:00"), makeGroup(0, "09:00:00")],
    rooms,
    existingUsage,
  );

  assert(result.overflow.length === 1, "Expected overflow after existing usage");
  assert(
    result.assignments.filter((assignment) => assignment.roomId !== null).length === 2,
    "Expected only remaining capacity to be assigned",
  );
});

test("ignores online groups for room assignment", () => {
  const result = assignRoomsToGroups(
    [makeGroup(0, "09:00:00", "online"), makeGroup(0, "09:00:00", "online")],
    rooms,
  );

  assert(result.overflow.length === 0, "Expected no overflow for online groups");
  assert(
    result.assignments.every((assignment) => assignment.roomId === null),
    "Expected online groups to skip room assignment",
  );
});

test("override assigns overflow groups to existing rooms and marks them overbooked", () => {
  const result = assignRoomsToGroups(
    [
      makeGroup(0, "09:00:00"),
      makeGroup(0, "09:00:00"),
      makeGroup(0, "09:00:00"),
      makeGroup(0, "09:00:00"),
    ],
    rooms,
    [],
    true,
  );

  assert(result.overflow.length === 1, "Expected overflow details to be preserved");
  assert(
    result.assignments.filter((assignment) => assignment.overbooked).length === 1,
    "Expected one overbooked room assignment",
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
