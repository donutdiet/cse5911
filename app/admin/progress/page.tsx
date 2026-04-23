import { redirect } from "next/navigation";

import AdminProgressClient from "@/components/admin/admin-progress-client";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminProgressData } from "@/lib/admin-progress";

export default async function AdminProgressPage() {
  const result = await loadAdminProgressPageData();

  if ("errorMessage" in result) {
    return (
      <div className="w-full max-w-7xl">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">{result.errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressData = result.progressData;

  return (
    <div className="w-full max-w-7xl space-y-2">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">Progress</h1>
        <p className="text-sm text-muted-foreground">
          {progressData.totalStudents} students, {progressData.totalGroups}{" "}
          groups, {progressData.totalTasks} tasks
        </p>
      </div>
      <AdminProgressClient {...progressData} />
    </div>
  );
}

async function loadAdminProgressPageData() {
  try {
    return { progressData: await getAdminProgressData() };
  } catch (error) {
    if (error instanceof Error && error.message === "Not logged in") {
      redirect("/login");
    }

    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Failed to load admin progress.",
    };
  }
}
