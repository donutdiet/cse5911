export const DEFAULT_ROOM_GROUP_CAPACITY = 4;

export type RoomInventory = {
  id: number;
  building: string;
  roomNumber: string;
  groupCapacity: number | null;
  availableDays: number[];
};

export type ExistingRoomUsage = {
  roomId: number | null;
  dayOfWeek: number;
  meetStartTime: string;
  groupCount?: number;
};

export type RoomAssignmentCandidate = {
  preference: "in_person" | "online";
  dayOfWeek: number;
  meetStartTime: string;
};

export type RoomOverflow = {
  dayOfWeek: number;
  meetStartTime: string;
  requestedGroups: number;
  totalCapacity: number;
  availableRooms: number;
  overflowGroups: number;
};

export type RoomAssignment = {
  roomId: number | null;
  overbooked: boolean;
};

export type RoomAssignmentPlan = {
  assignments: RoomAssignment[];
  overflow: RoomOverflow[];
};

function getEffectiveCapacity(groupCapacity: number | null) {
  if (!Number.isInteger(groupCapacity) || (groupCapacity ?? 0) <= 0) {
    return DEFAULT_ROOM_GROUP_CAPACITY;
  }

  return groupCapacity as number;
}

function getBucketKey(dayOfWeek: number, meetStartTime: string) {
  return `${dayOfWeek}|${meetStartTime}`;
}

export function assignRoomsToGroups(
  groups: RoomAssignmentCandidate[],
  rooms: RoomInventory[],
  existingUsage: ExistingRoomUsage[] = [],
  allowOverflow = false,
): RoomAssignmentPlan {
  const assignments: RoomAssignment[] = groups.map(() => ({
    roomId: null,
    overbooked: false,
  }));
  const overflow: RoomOverflow[] = [];
  const existingUsageByBucket = new Map<string, Map<number, number>>();

  for (const usage of existingUsage) {
    if (usage.roomId === null) {
      continue;
    }

    const bucketKey = getBucketKey(usage.dayOfWeek, usage.meetStartTime);
    const bucket = existingUsageByBucket.get(bucketKey) ?? new Map<number, number>();
    bucket.set(usage.roomId, (bucket.get(usage.roomId) ?? 0) + (usage.groupCount ?? 1));
    existingUsageByBucket.set(bucketKey, bucket);
  }

  const groupsByBucket = new Map<string, number[]>();
  for (const [index, group] of groups.entries()) {
    if (group.preference !== "in_person") {
      continue;
    }

    const bucketKey = getBucketKey(group.dayOfWeek, group.meetStartTime);
    const indexes = groupsByBucket.get(bucketKey) ?? [];
    indexes.push(index);
    groupsByBucket.set(bucketKey, indexes);
  }

  for (const [bucketKey, groupIndexes] of groupsByBucket.entries()) {
    const [dayString, meetStartTime] = bucketKey.split("|");
    const dayOfWeek = Number(dayString);
    const eligibleRooms = rooms
      .filter((room) => room.availableDays.includes(dayOfWeek))
      .map((room) => ({
        roomId: room.id,
        remainingCapacity: Math.max(
          0,
          getEffectiveCapacity(room.groupCapacity) -
            (existingUsageByBucket.get(bucketKey)?.get(room.id) ?? 0),
        ),
      }));

    const capacitySlots: number[] = [];
    for (const room of eligibleRooms) {
      for (let count = 0; count < room.remainingCapacity; count += 1) {
        capacitySlots.push(room.roomId);
      }
    }

    groupIndexes.forEach((groupIndex, slotIndex) => {
      const roomId = capacitySlots[slotIndex];
      if (roomId) {
        assignments[groupIndex] = {
          roomId,
          overbooked: false,
        };
      }
    });

    if (groupIndexes.length <= capacitySlots.length) {
      continue;
    }

    const overflowGroups = groupIndexes.length - capacitySlots.length;
    overflow.push({
      dayOfWeek,
      meetStartTime,
      requestedGroups: groupIndexes.length,
      totalCapacity: capacitySlots.length,
      availableRooms: eligibleRooms.length,
      overflowGroups,
    });

    if (!allowOverflow || eligibleRooms.length === 0) {
      continue;
    }

    const overflowIndexes = groupIndexes.slice(capacitySlots.length);
    overflowIndexes.forEach((groupIndex, overflowIndex) => {
      const targetRoom = eligibleRooms[overflowIndex % eligibleRooms.length];
      assignments[groupIndex] = {
        roomId: targetRoom?.roomId ?? null,
        overbooked: targetRoom !== undefined,
      };
    });
  }

  return {
    assignments,
    overflow,
  };
}
