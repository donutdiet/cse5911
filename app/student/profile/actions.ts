"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult =
  | { ok: true; updated: any }
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
  const phone = String(formData.get("phone") ?? "").trim();
  const mode = String(formData.get("mode") ?? "in_person");
  const in_person = mode === "in_person";

  const avatar = formData.get("avatar");
  let newProfilePictureUrl: string | null | undefined = undefined;

  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) {
      return { ok: false, error: "Profile picture must be an image file." };
    }

    const MAX_BYTES = 3 * 1024 * 1024; // 3MB
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

  const payload: Record<string, any> = {
    full_name: full_name.length ? full_name : null,
    phone: phone.length ? phone : null,
    in_person,
  };

  if (newProfilePictureUrl !== undefined) {
    payload.profile_picture_url = newProfilePictureUrl;
  }

  const { data, error } = await supabase
    .from("profile")
    .update(payload)
    .eq("user_id", user.id)
    .select("user_id, email, full_name, phone, in_person, profile_picture_url")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/student/profile");
  return { ok: true, updated: data };
}