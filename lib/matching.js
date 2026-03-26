/*
  matching.js
  This is the main matching algorithm for AnatWithMe.
  It takes a list of students and groups them based on
  their meeting preference and shared availability.

  Steps:
    1. Split students into strict pools (in_person only, online only, no_preference only)
    2. Pre-cache each student's free slot Set so we do not rebuild it on every check
    3. Run matching on in_person and online pools separately
    4. Use no_preference students to fill incomplete groups first.
       Student-first loop: least flexible no_preference students pick first.
       Each student joins the incomplete group closest to full that they fit.
    5. Any no_preference students still unplaced run their own matching pass.
       Assigned to whichever pool has fewer total placed students (counted after filling).
    6. Anyone still unplaced gets flagged for the admin.

  Known tradeoffs:
    Window popularity sort in buildGroups is computed once before placement starts.
    As students get placed the popularity of remaining windows changes, but resorting
    after every placement would be too expensive. Good enough for pilot scale.

  Schema notes:
    availability is a join table: one row per (user_id, time_slot_id) means the student is free
    time_slot has slot_index = (day * 16) + position, where day 0 = Monday
    slots are 1-hour blocks from 7am-11pm, so a 2-hour window = 2 consecutive slot_indexes
    profile.preference is 'in_person' | 'online' | 'no_preference'
*/

const MIN_CONSECUTIVE_SLOTS = 2
const MIN_GROUP_SIZE = 2
const MAX_GROUP_SIZE = 6
const SLOTS_PER_DAY = 16


/*
  Main entry point. Expects students with their availability already joined:
  [{ user_id, full_name, preference, availability: [{ time_slot_id, slot_index }] }]

  Returns { groups, flagged }
*/
export function runMatchingAlgorithm(students) {

  // pre-cache each student's free slot Set once so isStudentFreeForWindow
  const studentsWithScores = students.map(s => ({
    ...s,
    flexibilityScore: s.availability.length,
    freeSlotSet: new Set(s.availability.map(a => a.slot_index))
  }))

  const inPersonPool     = studentsWithScores.filter(s => s.preference === 'in_person')
  const onlinePool       = studentsWithScores.filter(s => s.preference === 'online')
  const noPreferencePool = studentsWithScores.filter(s => s.preference === 'no_preference')

  const inPersonResult = buildGroups(inPersonPool, 'in_person')
  const onlineResult   = buildGroups(onlinePool, 'online')

  const allGroups = [...inPersonResult.groups, ...onlineResult.groups]

  const unplacedNoPreference = fillIncompleteGroups(allGroups, noPreferencePool)

  // any no_preference students still unplaced run their own matching pass
  if (unplacedNoPreference.length >= MIN_GROUP_SIZE) {

    // count all placed students now including those added via fillIncompleteGroups
    // so pickPreference has accurate counts
    const preference = pickPreference(allGroups)
    const noPreferenceResult = buildGroups(unplacedNoPreference, preference)
    allGroups.push(...noPreferenceResult.groups)
    unplacedNoPreference.splice(0, unplacedNoPreference.length, ...noPreferenceResult.flagged)
  }

  const allFlagged = [
    ...inPersonResult.flagged,
    ...onlineResult.flagged,
    ...unplacedNoPreference
  ]

  return { groups: allGroups, flagged: allFlagged }
}


/*
  Tries to fill incomplete groups using no_preference students.

  Iterates students by flexibility ascending (least flexible first) so
  hard-to-place students get priority. For each student, finds the best
  group they can join which is defined as the incomplete group with the most
  members that they are free for. This favors completing nearly-full groups
  without ever deprioritizing students with limited availability.

  Returns the no_preference students who could not be placed anywhere.
*/
function fillIncompleteGroups(groups, noPreferenceStudents) {
  const unplaced = new Map(noPreferenceStudents.map(s => [s.user_id, s]))

  const sortedStudents = [...unplaced.values()]
    .sort((a, b) => a.flexibilityScore - b.flexibilityScore)

  for (const student of sortedStudents) {
    const eligibleGroups = groups.filter(g =>
      g.members.length < MAX_GROUP_SIZE &&
      isStudentFreeForWindow(student.freeSlotSet, g.window)
    )

    if (eligibleGroups.length === 0) continue

    const bestGroup = eligibleGroups.reduce((best, g) =>
      g.members.length > best.members.length ? g : best
    )

    bestGroup.members.push(student)
    unplaced.delete(student.user_id)
  }

  return [...unplaced.values()]
}


/*
  Counts placed students across all current groups including those filled
  by no_preference students and returns the preference label for whichever
  pool has fewer. This keeps in_person and online group counts balanced.
*/
function pickPreference(allGroups) {
  let inPersonCount = 0
  let onlineCount   = 0

  for (const group of allGroups) {
    if (group.preference === 'in_person') inPersonCount += group.members.length
    else onlineCount += group.members.length
  }

  return inPersonCount <= onlineCount ? 'in_person' : 'online'
}


/*
  Handles group building for one preference pool.
  Sorts windows by popularity then greedily fills groups
  starting with the least flexible students.
*/
function buildGroups(students, preference) {
  const groups     = []
  const unassigned = new Map(students.map(s => [s.user_id, s]))

  const windows = generateValidWindows()

  // sort by popularity once upfront (see tradeoffs note at top of file)
  windows.sort((a, b) =>
    countAvailableStudents(b, unassigned) - countAvailableStudents(a, unassigned)
  )

  for (const window of windows) {
    if (unassigned.size < MIN_GROUP_SIZE) break

    const availableHere = [...unassigned.values()]
      .filter(s => isStudentFreeForWindow(s.freeSlotSet, window))
      .sort((a, b) => a.flexibilityScore - b.flexibilityScore)

    if (availableHere.length < MIN_GROUP_SIZE) continue

    while (availableHere.length >= MIN_GROUP_SIZE) {
      const groupMembers = availableHere.splice(0, MAX_GROUP_SIZE)
      groups.push({ members: groupMembers, window, preference })
      groupMembers.forEach(s => unassigned.delete(s.user_id))
    }
  }

  return { groups, flagged: [...unassigned.values()] }
}


/*
  Generates all valid 2-hour windows across the week.
  Stops MIN_CONSECUTIVE_SLOTS before the end of each day so windows
  never bleed into the next day.
*/
function generateValidWindows() {
  const windows = []

  for (let day = 0; day < 7; day++) {
    const dayStart = day * SLOTS_PER_DAY
    const dayEnd   = dayStart + SLOTS_PER_DAY - MIN_CONSECUTIVE_SLOTS

    for (let startIndex = dayStart; startIndex <= dayEnd; startIndex++) {
      windows.push({ startIndex, day })
    }
  }

  return windows
}


/*
  Returns true if the student has all consecutive slots in the window.
  Takes a pre-cached Set instead of rebuilding it on every call.
*/
function isStudentFreeForWindow(freeSlotSet, window) {
  for (let i = 0; i < MIN_CONSECUTIVE_SLOTS; i++) {
    if (!freeSlotSet.has(window.startIndex + i)) return false
  }
  return true
}


/*
  Counts how many unassigned students are free for a given window.
  Used to sort windows by popularity before processing.
*/
function countAvailableStudents(window, unassigned) {
  let count = 0
  for (const student of unassigned.values()) {
    if (isStudentFreeForWindow(student.freeSlotSet, window)) count++
  }
  return count
}