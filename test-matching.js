/*
  test-matching.js
  Thorough test suite for the matching algorithm.
  Run with: node test-matching.js

  Covers:
    Basic group formation and size constraints (min 4, max 6)
    No student placed in two groups
    Preference pool separation (in_person vs online never mixed)
    No_preference students fill incomplete groups before forming their own
    Least flexible no_preference students get priority during fill
    Least flexible strict-preference students get priority in buildGroups
    Students with no availability get flagged
    Students who cannot find enough overlap get flagged
    Day boundary safety (windows do not bleed between days)
    Edge cases: exactly MIN_GROUP_SIZE students, exactly MAX_GROUP_SIZE, one more than max
    Empty pools
    Large mixed dataset sanity check

  slot_index formula: (day * 16) + hour_position
  day 0 = Monday, day 6 = Sunday
  position 0 = 7am, position 1 = 8am, position 15 = 10pm
*/

import { runMatchingAlgorithm } from './lib/matching.js'


/*
  Helper functions and shared test data
*/

function slot(day, pos) {
  const index = (day * 16) + pos
  return { time_slot_id: index + 1, slot_index: index }
}

// Monday slots
const MON = {
  s8am:  slot(0, 1),
  s9am:  slot(0, 2),
  s10am: slot(0, 3),
  s11am: slot(0, 4),
  s12pm: slot(0, 5),
  s1pm:  slot(0, 6),
  s2pm:  slot(0, 7),
  s3pm:  slot(0, 8),
}

// Tuesday slots
const TUE = {
  s9am:  slot(1, 2),
  s10am: slot(1, 3),
  s11am: slot(1, 4),
  s12pm: slot(1, 5),
  s1pm:  slot(1, 6),
  s2pm:  slot(1, 7),
}

// Wednesday slots
const WED = {
  s9am:  slot(2, 2),
  s10am: slot(2, 3),
  s11am: slot(2, 4),
  s12pm: slot(2, 5),
  s1pm:  slot(2, 6),
  s2pm:  slot(2, 7),
  s3pm:  slot(2, 8),
}

// Thursday slots
const THU = {
  s9am:  slot(3, 2),
  s10am: slot(3, 3),
  s2pm:  slot(3, 7),
  s3pm:  slot(3, 8),
}

// Friday slots
const FRI = {
  s9am:  slot(4, 2),
  s10am: slot(4, 3),
  s11am: slot(4, 4),
  s1pm:  slot(4, 6),
}

// Last slot of Monday (pos 15 = 10pm) and first slot of Tuesday (pos 0 = 7am)
const MON_LAST  = slot(0, 15)
const TUE_FIRST = slot(1, 0)

// Shared Monday 10am-noon block used across many tests
const MON_10_TO_NOON = [MON.s10am, MON.s11am]

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓  ${name}`)
    passed++
  } catch (e) {
    console.log(`  ✗  ${name}`)
    console.log(`     ${e.message}`)
    failed++
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertNoDoublePlacement(result) {
  const seen = new Set()
  for (const group of result.groups) {
    for (const member of group.members) {
      assert(!seen.has(member.user_id), `Student ${member.full_name} (${member.user_id}) was placed in two groups`)
      seen.add(member.user_id)
    }
  }
  // also check flagged students are not also placed
  for (const flagged of result.flagged) {
    assert(!seen.has(flagged.user_id), `Student ${flagged.full_name} is both placed and flagged`)
  }
}

function assertGroupSizes(result) {
  for (const group of result.groups) {
    assert(group.members.length >= 4, `Group has only ${group.members.length} members (min is 4)`)
    assert(group.members.length <= 6, `Group has ${group.members.length} members (max is 6)`)
  }
}

function assertPreferencesNotMixed(result) {
  for (const group of result.groups) {
    for (const member of group.members) {
      if (member.preference === 'in_person') {
        assert(group.preference === 'in_person', `In-person student ${member.full_name} placed in online group`)
      }
      if (member.preference === 'online') {
        assert(group.preference === 'online', `Online student ${member.full_name} placed in in-person group`)
      }
      // no_preference students can go in either pool
    }
  }
}

function makeStudent(id, name, preference, slots) {
  return { user_id: String(id), full_name: name, preference, availability: slots }
}


/*
  Section 1: Basic group formation
*/
console.log('\n========================================')
console.log('  AnatWithMe Matching Algorithm Tests')
console.log('========================================\n')

console.log('Section 1: Basic group formation')

test('forms one group when exactly MIN_GROUP_SIZE students share a window', () => {
  const students = [
    makeStudent(1, 'Alice',   'in_person', MON_10_TO_NOON),
    makeStudent(2, 'Bob',     'in_person', MON_10_TO_NOON),
    makeStudent(3, 'Charlie', 'in_person', MON_10_TO_NOON),
    makeStudent(4, 'Diana',   'in_person', MON_10_TO_NOON),
  ]
  const result = runMatchingAlgorithm(students)
  assert(result.groups.length === 1, `Expected 1 group, got ${result.groups.length}`)
  assert(result.groups[0].members.length === 4, `Expected 4 members, got ${result.groups[0].members.length}`)
  assert(result.flagged.length === 0, `Expected 0 flagged, got ${result.flagged.length}`)
})

test('forms one full group when exactly MAX_GROUP_SIZE students share a window', () => {
  const students = Array.from({ length: 6 }, (_, i) =>
    makeStudent(i + 1, `Student${i + 1}`, 'in_person', MON_10_TO_NOON)
  )
  const result = runMatchingAlgorithm(students)
  assert(result.groups.length === 1, `Expected 1 group, got ${result.groups.length}`)
  assert(result.groups[0].members.length === 6, `Expected 6 members`)
  assert(result.flagged.length === 0, `Expected 0 flagged`)
})

test('forms one full group and flags the leftover when 7 students share a window', () => {
  const students = Array.from({ length: 7 }, (_, i) =>
    makeStudent(i + 1, `Student${i + 1}`, 'in_person', MON_10_TO_NOON)
  )
  const result = runMatchingAlgorithm(students)
  // 7 students: one group of 6, 1 leftover who cannot form another group of 4
  assert(result.groups.length === 1, `Expected 1 group, got ${result.groups.length}`)
  assert(result.groups[0].members.length === 6, `Expected 6 members`)
  assert(result.flagged.length === 1, `Expected 1 flagged, got ${result.flagged.length}`)
})

test('forms one group of 6 and flags the remaining 2 when 8 students share one window', () => {
  // The greedy takes the first 6 students leaving 2. Since 2 is less than
  // MIN_GROUP_SIZE those students cannot form a second group and get flagged.
  // To form two groups you need students spread across two separate windows.
  const students = Array.from({ length: 8 }, (_, i) =>
    makeStudent(i + 1, `Student${i + 1}`, 'in_person', MON_10_TO_NOON)
  )
  const result = runMatchingAlgorithm(students)
  assert(result.groups.length === 1, `Expected 1 group, got ${result.groups.length}`)
  assert(result.groups[0].members.length === 6, `Expected 6 members in the group`)
  assert(result.flagged.length === 2, `Expected 2 flagged, got ${result.flagged.length}`)
})

test('forms two groups when 8 students are split across two windows', () => {
  // 4 students only free Monday 10am, 4 students only free Tuesday 10am.
  // Each window gets its own group of 4.
  const students = [
    ...Array.from({ length: 4 }, (_, i) => makeStudent(i + 1,  `Mon${i + 1}`, 'in_person', MON_10_TO_NOON)),
    ...Array.from({ length: 4 }, (_, i) => makeStudent(i + 10, `Tue${i + 1}`, 'in_person', [TUE.s10am, TUE.s11am])),
  ]
  const result = runMatchingAlgorithm(students)
  assert(result.groups.length === 2, `Expected 2 groups, got ${result.groups.length}`)
  assert(result.flagged.length === 0, `Expected 0 flagged`)
})

test('no student is placed in two groups', () => {
  const students = Array.from({ length: 20 }, (_, i) =>
    makeStudent(i + 1, `Student${i + 1}`, 'in_person', [
      ...MON_10_TO_NOON,
      TUE.s10am, TUE.s11am
    ])
  )
  const result = runMatchingAlgorithm(students)
  assertNoDoublePlacement(result)
})

test('all groups satisfy size constraints', () => {
  const students = Array.from({ length: 30 }, (_, i) =>
    makeStudent(i + 1, `Student${i + 1}`, 'in_person', [
      ...MON_10_TO_NOON,
      TUE.s9am, TUE.s10am
    ])
  )
  const result = runMatchingAlgorithm(students)
  assertGroupSizes(result)
})

test('flags students when there are fewer than MIN_GROUP_SIZE with shared availability', () => {
  const students = [
    makeStudent(1, 'Alice', 'in_person', MON_10_TO_NOON),
    makeStudent(2, 'Bob',   'in_person', MON_10_TO_NOON),
    makeStudent(3, 'Carol', 'in_person', MON_10_TO_NOON),
    // only 3 students share Monday 10am, not enough for a group
  ]
  const result = runMatchingAlgorithm(students)
  assert(result.groups.length === 0, `Expected 0 groups, got ${result.groups.length}`)
  assert(result.flagged.length === 3, `Expected all 3 flagged`)
})

test('flags students with no availability', () => {
  const withAvailability = Array.from({ length: 4 }, (_, i) =>
    makeStudent(i + 1, `Student${i + 1}`, 'in_person', MON_10_TO_NOON)
  )
  const noAvailability = [
    makeStudent(99, 'Ghost', 'in_person', [])
  ]
  const result = runMatchingAlgorithm([...withAvailability, ...noAvailability])
  const flaggedIds = result.flagged.map(s => s.user_id)
  assert(flaggedIds.includes('99'), 'Student with no availability should be flagged')
  assert(result.groups.length === 1, 'Other 4 students should still form a group')
})

test('returns empty groups and empty flagged when given no students', () => {
  const result = runMatchingAlgorithm([])
  assert(result.groups.length === 0, 'Expected 0 groups')
  assert(result.flagged.length === 0, 'Expected 0 flagged')
})


/*
  Section 2: Preference separation
*/
console.log('\nSection 2: Preference separation')

test('in_person and online students never share a group', () => {
  const inPerson = Array.from({ length: 4 }, (_, i) =>
    makeStudent(i + 1, `InPerson${i + 1}`, 'in_person', MON_10_TO_NOON)
  )
  const online = Array.from({ length: 4 }, (_, i) =>
    makeStudent(i + 10, `Online${i + 1}`, 'online', MON_10_TO_NOON)
  )
  const result = runMatchingAlgorithm([...inPerson, ...online])
  assertPreferencesNotMixed(result)
  assert(result.groups.length === 2, `Expected 2 groups (one per preference), got ${result.groups.length}`)
})

test('online students only form online groups', () => {
  const students = Array.from({ length: 4 }, (_, i) =>
    makeStudent(i + 1, `Student${i + 1}`, 'online', MON_10_TO_NOON)
  )
  const result = runMatchingAlgorithm(students)
  assert(result.groups.length === 1, 'Expected 1 group')
  assert(result.groups[0].preference === 'online', 'Group should be online')
})

test('in_person pool flagged correctly when not enough students for a group', () => {
  const students = [
    makeStudent(1, 'A', 'in_person', MON_10_TO_NOON),
    makeStudent(2, 'B', 'in_person', MON_10_TO_NOON),
    // only 2 in_person students, cannot form a group of 4
    makeStudent(3, 'C', 'online', MON_10_TO_NOON),
    makeStudent(4, 'D', 'online', MON_10_TO_NOON),
    makeStudent(5, 'E', 'online', MON_10_TO_NOON),
    makeStudent(6, 'F', 'online', MON_10_TO_NOON),
  ]
  const result = runMatchingAlgorithm(students)
  const flaggedIds = result.flagged.map(s => s.user_id)
  assert(flaggedIds.includes('1'), 'In-person student A should be flagged')
  assert(flaggedIds.includes('2'), 'In-person student B should be flagged')
  assert(result.groups.length === 1, 'Online group should still form')
  assert(result.groups[0].preference === 'online', 'Group should be online')
})


/*
  Section 3: No_preference behavior
*/
console.log('\nSection 3: No_preference behavior')

test('no_preference student does not rescue a strict pool that is below MIN_GROUP_SIZE', () => {
  // 3 in_person students at Monday 10am is below the minimum of 4.
  // buildGroups will not form a group from 3 students so there is nothing
  // for the no_preference student to fill. They then try to form their own
  // group but there is only 1 of them. All 4 should be flagged.
  const students = [
    makeStudent(1, 'IP1', 'in_person',    MON_10_TO_NOON),
    makeStudent(2, 'IP2', 'in_person',    MON_10_TO_NOON),
    makeStudent(3, 'IP3', 'in_person',    MON_10_TO_NOON),
    makeStudent(4, 'NP1', 'no_preference', MON_10_TO_NOON),
  ]
  const result = runMatchingAlgorithm(students)
  assertNoDoublePlacement(result)
  assert(result.groups.length === 0, `Expected 0 groups, got ${result.groups.length}`)
})

test('no_preference student fills the last spot in a group of 5', () => {
  const inPersonStudents = Array.from({ length: 5 }, (_, i) =>
    makeStudent(i + 1, `IP${i + 1}`, 'in_person', MON_10_TO_NOON)
  )
  const npStudent = makeStudent(99, 'NP', 'no_preference', MON_10_TO_NOON)
  const result = runMatchingAlgorithm([...inPersonStudents, npStudent])

  assert(result.groups.length === 1, `Expected 1 group, got ${result.groups.length}`)
  assert(result.groups[0].members.length === 6, `Expected group of 6, got ${result.groups[0].members.length}`)
  assert(result.flagged.length === 0, 'Expected 0 flagged')

  const npInGroup = result.groups[0].members.find(m => m.user_id === '99')
  assert(npInGroup !== undefined, 'NP student should be in the group')
})

test('no_preference student joins the group closest to full when eligible for multiple groups', () => {
  // Group A has 5 in_person members at Monday 10am.
  // Group B has 4 in_person members at Tuesday 10am.
  // NP student is free for both windows and should join Group A since it is closer to full.
  const groupAStudents = Array.from({ length: 5 }, (_, i) =>
    makeStudent(i + 1, `GA${i + 1}`, 'in_person', MON_10_TO_NOON)
  )
  const groupBStudents = Array.from({ length: 4 }, (_, i) =>
    makeStudent(i + 10, `GB${i + 1}`, 'in_person', [TUE.s10am, TUE.s11am])
  )
  const npStudent = makeStudent(99, 'NP', 'no_preference', [
    ...MON_10_TO_NOON,
    TUE.s10am, TUE.s11am
  ])
  const result = runMatchingAlgorithm([...groupAStudents, ...groupBStudents, npStudent])

  assert(result.groups.length === 2, `Expected 2 groups, got ${result.groups.length}`)
  assertNoDoublePlacement(result)

  const groupA = result.groups.find(g => g.members.length === 6)
  assert(groupA !== undefined, 'Group A should have 6 members after NP fills it')
  const npInGroupA = groupA.members.find(m => m.user_id === '99')
  assert(npInGroupA !== undefined, 'NP student should be in Group A since it was closest to full')
})

test('least flexible no_preference student gets first pick over a more flexible one', () => {
  // Group X: 5 in_person members at Monday 10am (needs 1 more)
  // Group Y: 5 in_person members at Tuesday 10am (needs 1 more)
  // NP1 is only free Monday 10am (2 slots total, very inflexible)
  // NP2 is free both Monday and Tuesday (4 slots, more flexible)
  // NP1 should get priority and take the Monday spot. NP2 fills Tuesday.
  const groupX = Array.from({ length: 5 }, (_, i) =>
    makeStudent(i + 1, `GX${i + 1}`, 'in_person', MON_10_TO_NOON)
  )
  const groupY = Array.from({ length: 5 }, (_, i) =>
    makeStudent(i + 10, `GY${i + 1}`, 'in_person', [TUE.s10am, TUE.s11am])
  )
  const np1 = makeStudent(91, 'NP_Inflexible', 'no_preference', MON_10_TO_NOON)
  const np2 = makeStudent(92, 'NP_Flexible',   'no_preference', [...MON_10_TO_NOON, TUE.s10am, TUE.s11am])

  const result = runMatchingAlgorithm([...groupX, ...groupY, np1, np2])

  assertNoDoublePlacement(result)
  assert(result.groups.length === 2, `Expected 2 groups, got ${result.groups.length}`)

  const allPlaced = result.groups.flatMap(g => g.members)
  assert(allPlaced.find(m => m.user_id === '91'), 'NP_Inflexible should be placed')
  assert(allPlaced.find(m => m.user_id === '92'), 'NP_Flexible should be placed')
  assert(result.flagged.length === 0, 'Expected 0 flagged')
})

test('no_preference students form their own group when no incomplete groups exist', () => {
  // 6 in_person students form a full group with no spots left.
  // 4 no_preference students need to form their own group at a different time.
  const ipStudents = Array.from({ length: 6 }, (_, i) =>
    makeStudent(i + 1, `IP${i + 1}`, 'in_person', MON_10_TO_NOON)
  )
  const npStudents = Array.from({ length: 4 }, (_, i) =>
    makeStudent(i + 10, `NP${i + 1}`, 'no_preference', [TUE.s10am, TUE.s11am])
  )
  const result = runMatchingAlgorithm([...ipStudents, ...npStudents])

  assert(result.groups.length === 2, `Expected 2 groups, got ${result.groups.length}`)
  assert(result.flagged.length === 0, 'Expected 0 flagged')
  assertNoDoublePlacement(result)
})

test('no_preference students get flagged when they cannot fill any group or form their own', () => {
  // 4 in_person students form a full group at Monday 10am.
  // 3 no_preference students are only free Tuesday so they cannot fill the Monday group
  // and there are not enough of them to form their own group.
  const ipStudents = Array.from({ length: 4 }, (_, i) =>
    makeStudent(i + 1, `IP${i + 1}`, 'in_person', MON_10_TO_NOON)
  )
  const npStudents = [
    makeStudent(10, 'NP1', 'no_preference', [TUE.s10am, TUE.s11am]),
    makeStudent(11, 'NP2', 'no_preference', [TUE.s10am, TUE.s11am]),
    makeStudent(12, 'NP3', 'no_preference', [TUE.s10am, TUE.s11am]),
  ]
  const result = runMatchingAlgorithm([...ipStudents, ...npStudents])

  assert(result.groups.length === 1, `Expected 1 group, got ${result.groups.length}`)
  assert(result.flagged.length === 3, `Expected 3 flagged NP students, got ${result.flagged.length}`)
})


/*
  Section 4: Flexibility priority
*/
console.log('\nSection 4: Flexibility priority')

test('least flexible in_person students are placed before highly flexible ones', () => {
  const inflexible = makeStudent(1, 'Inflexible', 'in_person', MON_10_TO_NOON)
  const flexible = Array.from({ length: 5 }, (_, i) =>
    makeStudent(i + 2, `Flex${i + 1}`, 'in_person', [
      ...MON_10_TO_NOON,
      TUE.s9am, TUE.s10am, TUE.s11am,
      WED.s10am, WED.s11am,
    ])
  )
  const result = runMatchingAlgorithm([inflexible, ...flexible])

  const inflexiblePlaced = result.groups.some(g =>
    g.members.find(m => m.user_id === '1')
  )
  assert(inflexiblePlaced, 'Inflexible student should be placed in a group')
})

test('student with one available window gets placed over a highly flexible student', () => {
  // 5 students are free Monday 10am and Tuesday 10am.
  // 1 student is only free Monday 10am.
  // The Monday-only student should be placed first.
  const sharedStudents = Array.from({ length: 5 }, (_, i) =>
    makeStudent(i + 1, `Shared${i + 1}`, 'in_person', [...MON_10_TO_NOON, TUE.s10am, TUE.s11am])
  )
  const monOnly = makeStudent(10, 'MonOnly', 'in_person', MON_10_TO_NOON)

  const result = runMatchingAlgorithm([...sharedStudents, monOnly])
  assertNoDoublePlacement(result)

  const monOnlyPlaced = result.groups.some(g => g.members.find(m => m.user_id === '10'))
  assert(monOnlyPlaced, 'Monday-only student should be placed')
})


/*
  Section 5: Day boundary safety
*/
console.log('\nSection 5: Day boundary safety')

test('window does not bleed from end of Monday into start of Tuesday', () => {
  // Student A is only free at the last slot of Monday (10pm).
  // Student B is only free at the first slot of Tuesday (7am).
  // Their slots are consecutive in the slot_index sequence but span a day boundary
  // so they should never be grouped together.
  const students = [
    makeStudent(1, 'A', 'in_person', [MON_LAST]),
    makeStudent(2, 'B', 'in_person', [TUE_FIRST]),
    makeStudent(3, 'C', 'in_person', [MON_LAST]),
    makeStudent(4, 'D', 'in_person', [TUE_FIRST]),
    makeStudent(5, 'E', 'in_person', [MON_LAST]),
    makeStudent(6, 'F', 'in_person', [TUE_FIRST]),
    makeStudent(7, 'G', 'in_person', [MON_LAST]),
    makeStudent(8, 'H', 'in_person', [TUE_FIRST]),
  ]
  const result = runMatchingAlgorithm(students)
  assert(result.groups.length === 0, 'No groups should form across a day boundary')
  assert(result.flagged.length === 8, `All 8 should be flagged, got ${result.flagged.length} flagged`)
})

test('students sharing only the last slot of a day cannot form a group', () => {
  // 4 students all only free at Monday 10pm (slot index 15).
  // A valid 2-hour window requires slot 15 and slot 16, but slot 16 belongs to Tuesday.
  // The algorithm stops windows before the day ends so this cannot form a group.
  const students = Array.from({ length: 4 }, (_, i) =>
    makeStudent(i + 1, `Student${i + 1}`, 'in_person', [MON_LAST])
  )
  const result = runMatchingAlgorithm(students)
  assert(result.groups.length === 0, 'Should not form a group at the day boundary')
  assert(result.flagged.length === 4, 'All 4 should be flagged')
})


/*
  Section 6: Edge cases
*/
console.log('\nSection 6: Edge cases')

test('handles empty in_person pool without crashing', () => {
  const students = Array.from({ length: 4 }, (_, i) =>
    makeStudent(i + 1, `Student${i + 1}`, 'online', MON_10_TO_NOON)
  )
  const result = runMatchingAlgorithm(students)
  assert(result.groups.length === 1, 'Online group should still form')
  assert(result.groups[0].preference === 'online')
})

test('handles empty online pool without crashing', () => {
  const students = Array.from({ length: 4 }, (_, i) =>
    makeStudent(i + 1, `Student${i + 1}`, 'in_person', MON_10_TO_NOON)
  )
  const result = runMatchingAlgorithm(students)
  assert(result.groups.length === 1, 'In-person group should still form')
})

test('handles all no_preference students with shared availability', () => {
  const students = Array.from({ length: 4 }, (_, i) =>
    makeStudent(i + 1, `Student${i + 1}`, 'no_preference', MON_10_TO_NOON)
  )
  const result = runMatchingAlgorithm(students)
  assert(result.groups.length === 1, `Expected 1 group, got ${result.groups.length}`)
  assert(result.flagged.length === 0, 'Expected 0 flagged')
})

test('handles a single student without crashing', () => {
  const result = runMatchingAlgorithm([
    makeStudent(1, 'Lonely', 'in_person', MON_10_TO_NOON)
  ])
  assert(result.groups.length === 0)
  assert(result.flagged.length === 1)
})

test('students with completely different availability all get flagged', () => {
  const students = [
    makeStudent(1, 'A', 'in_person', [MON.s8am,  MON.s9am]),
    makeStudent(2, 'B', 'in_person', [TUE.s1pm,  TUE.s2pm]),
    makeStudent(3, 'C', 'in_person', [WED.s9am,  WED.s10am]),
    makeStudent(4, 'D', 'in_person', [THU.s2pm,  THU.s3pm]),
    makeStudent(5, 'E', 'in_person', [FRI.s9am,  FRI.s10am]),
  ]
  const result = runMatchingAlgorithm(students)
  assert(result.groups.length === 0, 'No students share a window so no groups should form')
  assert(result.flagged.length === 5, `All 5 should be flagged, got ${result.flagged.length}`)
})

test('student with only one slot gets flagged because a 2-hour window requires 2 consecutive slots', () => {
  const students = [
    makeStudent(1, 'OneSlot', 'in_person', [MON.s10am]),
    ...Array.from({ length: 4 }, (_, i) =>
      makeStudent(i + 2, `Good${i + 1}`, 'in_person', MON_10_TO_NOON)
    )
  ]
  const result = runMatchingAlgorithm(students)
  const oneSlotFlagged = result.flagged.find(s => s.user_id === '1')
  assert(oneSlotFlagged !== undefined, 'OneSlot student should be flagged')
})

test('all students placed when pool divides evenly into max-size groups', () => {
  // 12 students at the same window = exactly 2 groups of 6
  const students = Array.from({ length: 12 }, (_, i) =>
    makeStudent(i + 1, `Student${i + 1}`, 'in_person', MON_10_TO_NOON)
  )
  const result = runMatchingAlgorithm(students)
  assert(result.groups.length === 2, `Expected 2 groups, got ${result.groups.length}`)
  assert(result.flagged.length === 0, 'Expected 0 flagged')
  assertGroupSizes(result)
})


/*
  Section 7: Large mixed dataset
*/
console.log('\nSection 7: Large mixed dataset')

test('large mixed dataset with no double placements', () => {
  const students = [
    // in_person cluster at Monday 10am
    ...Array.from({ length: 6 },  (_, i) => makeStudent(i + 1,   `IP_Mon${i+1}`,  'in_person',    [MON.s10am, MON.s11am, MON.s12pm])),
    // in_person cluster at Tuesday 10am
    ...Array.from({ length: 6 },  (_, i) => makeStudent(i + 10,  `IP_Tue${i+1}`,  'in_person',    [TUE.s10am, TUE.s11am, TUE.s12pm])),
    // online cluster at Wednesday 10am
    ...Array.from({ length: 6 },  (_, i) => makeStudent(i + 20,  `ON_Wed${i+1}`,  'online',       [WED.s10am, WED.s11am, WED.s12pm])),
    // online cluster at Thursday 9am (one short of a full group)
    ...Array.from({ length: 5 },  (_, i) => makeStudent(i + 30,  `ON_Thu${i+1}`,  'online',       [THU.s9am,  THU.s10am])),
    // no_preference students free multiple days
    ...Array.from({ length: 8 },  (_, i) => makeStudent(i + 40,  `NP_Multi${i+1}`,'no_preference',[MON.s10am, MON.s11am, WED.s10am, WED.s11am])),
    // no_preference students only free Monday 10am (least flexible)
    ...Array.from({ length: 3 },  (_, i) => makeStudent(i + 50,  `NP_Inf${i+1}`,  'no_preference', MON_10_TO_NOON)),
    // stragglers each only free at a unique time, likely to be flagged
    makeStudent(60, 'Straggler1', 'in_person',    [FRI.s9am,  FRI.s10am]),
    makeStudent(61, 'Straggler2', 'online',       [FRI.s11am, FRI.s1pm]),
    makeStudent(62, 'Straggler3', 'no_preference', [WED.s3pm, WED.s2pm]),
  ]

  const result = runMatchingAlgorithm(students)

  assertNoDoublePlacement(result)
  assertGroupSizes(result)
  assertPreferencesNotMixed(result)

  const totalPlaced = result.groups.reduce((sum, g) => sum + g.members.length, 0)
  const totalAccounted = totalPlaced + result.flagged.length
  assert(totalAccounted === students.length, `All students should be accounted for. placed(${totalPlaced}) + flagged(${result.flagged.length}) = ${totalAccounted}, expected ${students.length}`)

  console.log(`     ${result.groups.length} groups formed, ${result.flagged.length} flagged out of ${students.length} students`)
})

test('every student in a large dataset is either placed or flagged and never lost', () => {
  const students = Array.from({ length: 50 }, (_, i) => {
    const prefs = ['in_person', 'online', 'no_preference']
    const pref = prefs[i % 3]
    const days = [
      [MON.s9am,  MON.s10am, MON.s11am],
      [TUE.s10am, TUE.s11am, TUE.s12pm],
      [WED.s9am,  WED.s10am, WED.s11am],
      [THU.s9am,  THU.s10am],
      [FRI.s9am,  FRI.s10am, FRI.s11am],
    ]
    const availability = days[i % 5]
    return makeStudent(i + 1, `Student${i + 1}`, pref, availability)
  })

  const result = runMatchingAlgorithm(students)

  assertNoDoublePlacement(result)
  assertGroupSizes(result)

  const totalPlaced = result.groups.reduce((sum, g) => sum + g.members.length, 0)
  const totalAccounted = totalPlaced + result.flagged.length
  assert(totalAccounted === students.length,
    `Lost students. placed(${totalPlaced}) + flagged(${result.flagged.length}) = ${totalAccounted}, expected ${students.length}`)

  console.log(`     ${result.groups.length} groups formed, ${result.flagged.length} flagged out of ${students.length} students`)
})


/*
  Results
*/
console.log('\n========================================')
console.log(`  Results: ${passed} passed, ${failed} failed`)
if (failed === 0) {
  console.log('  All tests passed!')
} else {
  console.log(`  ${failed} test(s) need attention.`)
}
console.log('========================================\n')