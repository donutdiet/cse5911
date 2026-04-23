import type { NextRequest } from "next/server";

import {
  getAdminProgressData,
  serializeGroupProgressCsv,
  serializeStudentProgressCsv,
} from "@/lib/admin-progress";

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope");

  if (scope !== "students" && scope !== "groups") {
    return new Response("Invalid export scope.", { status: 400 });
  }

  try {
    const progressData = await getAdminProgressData();
    const csv =
      scope === "students"
        ? serializeStudentProgressCsv(progressData.studentRows)
        : serializeGroupProgressCsv(progressData.groupRows);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="admin-progress-${scope}.csv"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to export progress.";
    const status =
      message === "Not logged in"
        ? 401
        : message === "Admin only"
          ? 403
          : 500;

    return new Response(message, { status });
  }
}
