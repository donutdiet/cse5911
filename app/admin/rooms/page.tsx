import { RoomManager } from "@/components/admin/room-manager";
import { createClient } from "@/lib/supabase/server";

export default async function RoomsPage() {
  const supabase = await createClient();

  const { data: rooms, error } = await supabase
    .from("room")
    .select(
      `
      id,
      building,
      room_number,
      group_capacity,
      room_day (
        id,
        day
      )
    `,
    )
    .order("building", { ascending: true })
    .order("room_number", { ascending: true });

  if (error) {
    console.error("Failed to fetch rooms:", error.message);
  }

  return (
    <div className="w-full max-w-7xl space-y-2">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">Rooms</h1>
        <p className="text-muted-foreground text-sm">
          {(rooms ?? []).length} {(rooms ?? []).length === 1 ? "room" : "rooms"}
        </p>
      </div>
      <RoomManager rooms={rooms ?? []} />
    </div>
  );
}
