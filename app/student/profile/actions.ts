"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type StudentPreference = "in_person" | "online" | "no_preference";
type StudyMode = "group" | "independent";

type UpdatedProfile = {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  preference: StudentPreference;
  study_mode: StudyMode;
  profile_picture_url: string | null;
  bio: string | null;
};

function isStudentPreference(value: string): value is StudentPreference {
  return ["in_person", "online", "no_preference"].includes(value);
}

function isStudyMode(value: string): value is StudyMode {
  return ["group", "independent"].includes(value);
}

type ActionResult =
  | { ok: true; updated: UpdatedProfile }
  | { ok: false; error: string };

const BUCKET = "profile-pictures";

export async function updateStudentProfile(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  const user = userRes?.user ?? null;

  if (userErr || !user) return { ok: false, error: "Not authenticated." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const preference = String(formData.get("preference") ?? "no_preference");
  const studyMode = String(formData.get("study_mode") ?? "group");

  if (!isStudentPreference(preference)) {
    return { ok: false, error: "Invalid preference value." };
  }

  if (!isStudyMode(studyMode)) {
    return { ok: false, error: "Invalid study mode value." };
  }

  const phone = phoneRaw.replace(/\D/g, "");

  if (phone.length > 0 && phone.length !== 10) {
    return { ok: false, error: "Phone number must be exactly 10 digits." };
  }

  if (bio.length > 500) {
    return { ok: false, error: "Bio must be 500 characters or less." };
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profile")
    .select("member_of(group_id)")
    .eq("user_id", user.id)
    .single();

  if (existingProfileError) {
    return { ok: false, error: "Failed to load your current profile state." };
  }

  if (
    studyMode === "independent" &&
    (existingProfile?.member_of?.length ?? 0) > 0
  ) {
    return {
      ok: false,
      error:
        "You cannot switch to Independent Study while assigned to a group. Reach out to your instructor to be removed first.",
    };
  }

  const avatar = formData.get("avatar");
  let newProfilePictureUrl: string | null | undefined = undefined;

  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) {
      return { ok: false, error: "Profile picture must be an image file." };
    }

    const MAX_BYTES = 3 * 1024 * 1024;
    if (avatar.size > MAX_BYTES) {
      return { ok: false, error: "Image too large (max 3MB)." };
    }

    const ext = avatar.name.split(".").pop()?.toLowerCase();
    const safeExt =
      ext && ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "png";

    const filePath = `${user.id}/avatar.${safeExt}`;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, avatar, {
        upsert: true,
        contentType: avatar.type,
      });

    if (uploadErr) {
      return { ok: false, error: `Upload failed: ${uploadErr.message}` };
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    newProfilePictureUrl = pub.publicUrl;
  }

  const payload: {
    full_name: string | null;
    phone: string | null;
    preference: StudentPreference;
    study_mode: StudyMode;
    bio: string | null;
    profile_picture_url?: string | null;
  } = {
    full_name: full_name.length ? full_name : null,
    phone: phone.length ? phone : null,
    preference,
    study_mode: studyMode,
    bio: bio.length ? bio : null,
  };

  if (newProfilePictureUrl !== undefined) {
    payload.profile_picture_url = newProfilePictureUrl;
  }

  const { data, error } = await supabase
    .from("profile")
    .update(payload)
    .eq("user_id", user.id)
    .select(
      "user_id, email, full_name, phone, preference, study_mode, profile_picture_url, bio"
    )
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/student/profile");
  return { ok: true, updated: data };
}