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
    .select("user_id, full_name, email, phone, in_person, profile_picture_url")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-3">Profile</h1>
        <p className="text-red-600">
          Profile could not load.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      <ProfileForm profile={profile} />
    </div>
  );
}