import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/student/profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    redirect("/login");
  }

  const user = authData.user;

  const { data: profile, error } = await supabase
    .from("profile")
    .select(
      "user_id, full_name, email, phone, preference, study_mode, profile_picture_url, bio, member_of(group_id)",
    )
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <h1 className="mb-3 text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-destructive">Profile could not load.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your student details and study preferences.
        </p>
      </header>
      <ProfileForm
        profile={{
          ...profile,
          hasAssignedGroup: (profile.member_of?.length ?? 0) > 0,
        }}
      />
    </div>
  );
}
