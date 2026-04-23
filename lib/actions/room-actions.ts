"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_ROOM_GROUP_CAPACITY } from "@/lib/room-assignment";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type RoomActionResult =
  | { error: string }
  | {
      success: true;
    };

type RoomInput = {
  building: string;
  roomNumber: string;
  groupCapacity: number;
  days: number[];
};

async function requireAdmin(supabase: SupabaseClient) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not logged in" } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profileError) {
    console.error("Error loading caller profile:", profileError);
    return { error: "Failed to verify admin access" } as const;
  }

  if (profile?.role !== "admin") {
    return { error: "Admin only" } as const;
  }

  return { userId: user.id } as const;
}

function normalizeRoomInput(input: RoomInput) {
  const building = input.building.trim();
  const roomNumber = input.roomNumber.trim();

  if (!building) {
    return { error: "Building is required." } as const;
  }

  if (!roomNumber) {
    return { error: "Room number is required." } as const;
  }

  const groupCapacity = Number.parseInt(String(input.groupCapacity), 10);
  if (!Number.isInteger(groupCapacity) || groupCapacity <= 0) {
    return { error: "Group capacity must be a positive whole number." } as const;
  }

  const days = [...new Set(input.days)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 4)
    .sort((left, right) => left - right);

  return {
    value: {
      building,
      roomNumber,
      groupCapacity,
      days,
    },
  } as const;
}

async function replaceRoomDays(
  supabase: SupabaseClient,
  roomId: number,
  days: number[],
) {
  const { error: deleteError } = await supabase
    .from("room_day")
    .delete()
    .eq("room_id", roomId);

  if (deleteError) {
    console.error("Failed to clear room days:", deleteError);
    return { error: "Failed to update room availability." } as const;
  }

  if (days.length === 0) {
    return { success: true } as const;
  }

  const { error: insertError } = await supabase.from("room_day").insert(
    days.map((day) => ({
      room_id: roomId,
      day,
    })),
  );

  if (insertError) {
    console.error("Failed to save room days:", insertError);
    return { error: "Failed to save room availability." } as const;
  }

  return { success: true } as const;
}

export async function createRoom(input: RoomInput): Promise<RoomActionResult> {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);
  if ("error" in adminCheck) {
    return { error: adminCheck.error ?? "Admin only" };
  }

  const normalized = normalizeRoomInput(input);
  if ("error" in normalized) {
    return normalized;
  }

  const { data: room, error: roomError } = await supabase
    .from("room")
    .insert({
      building: normalized.value.building,
      room_number: normalized.value.roomNumber,
      group_capacity:
        normalized.value.groupCapacity || DEFAULT_ROOM_GROUP_CAPACITY,
    })
    .select("id")
    .single();

  if (roomError || !room) {
    console.error("Failed to create room:", roomError);
    return { error: "Failed to create room." };
  }

  const dayResult = await replaceRoomDays(supabase, room.id, normalized.value.days);
  if ("error" in dayResult) {
    await supabase.from("room").delete().eq("id", room.id);
    return dayResult;
  }

  revalidatePath("/admin/rooms");
  return { success: true };
}

export async function updateRoom(
  roomId: number,
  input: RoomInput,
): Promise<RoomActionResult> {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);
  if ("error" in adminCheck) {
    return { error: adminCheck.error ?? "Admin only" };
  }

  const normalized = normalizeRoomInput(input);
  if ("error" in normalized) {
    return normalized;
  }

  const { error: updateError } = await supabase
    .from("room")
    .update({
      building: normalized.value.building,
      room_number: normalized.value.roomNumber,
      group_capacity: normalized.value.groupCapacity,
    })
    .eq("id", roomId);

  if (updateError) {
    console.error("Failed to update room:", updateError);
    return { error: "Failed to update room." };
  }

  const dayResult = await replaceRoomDays(supabase, roomId, normalized.value.days);
  if ("error" in dayResult) {
    return dayResult;
  }

  revalidatePath("/admin/rooms");
  revalidatePath("/admin/groups");
  return { success: true };
}

export async function deleteRoom(roomId: number): Promise<RoomActionResult> {
  const supabase = await createClient();

  const adminCheck = await requireAdmin(supabase);
  if ("error" in adminCheck) {
    return { error: adminCheck.error ?? "Admin only" };
  }

  const { error } = await supabase.from("room").delete().eq("id", roomId);
  if (error) {
    console.error("Failed to delete room:", error);
    return {
      error:
        "Failed to delete room. If the room is linked to groups, update the foreign key action first.",
    };
  }

  revalidatePath("/admin/rooms");
  revalidatePath("/admin/groups");
  return { success: true };
}
