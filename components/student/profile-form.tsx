"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { updateStudentProfile } from "@/app/student/profile/actions";

type Profile = {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  preference: "in_person" | "online" | "no_preference" | null;
  profile_picture_url: string | null;
};

type Toast = { type: "success" | "error"; text: string } | null;

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [isPending, startTransition] = useTransition();

  const defaultPreference = profile.preference ?? "no_preference";

  const [toast, setToast] = useState<Toast>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setToast(null);

    const fd = new FormData(e.currentTarget);

    const safe = new FormData();
    safe.set("full_name", String(fd.get("full_name") ?? ""));
    safe.set("phone", String(fd.get("phone") ?? ""));
    safe.set("preference", String(fd.get("preference") ?? "no_preference"));

    if (selectedFile) {
      safe.set("avatar", selectedFile);
    }

    startTransition(async () => {
      const res = await updateStudentProfile(safe);
      if (res.ok) {
        setToast({ type: "success", text: "Profile updated successfully." });
        setSelectedFile(null);
      } else {
        setToast({ type: "error", text: res.error ?? "Save failed." });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
      {/* Toast */}
      {toast && (
        <div
          className={[
            "rounded-lg border px-4 py-3 text-sm flex items-start justify-between gap-3",
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800",
          ].join(" ")}
          role="status"
        >
          <div className="font-medium">{toast.text}</div>
          <button
            type="button"
            className="text-xs opacity-80 hover:opacity-100"
            onClick={() => setToast(null)}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Profile picture */}
      <div className="space-y-2">
        <label className="font-semibold">Profile picture</label>

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full overflow-hidden border bg-gray-100 flex items-center justify-center">
            {previewUrl || profile.profile_picture_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl || profile.profile_picture_url || ""}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              </>
            ) : (
              <span className="text-xs text-gray-500">No photo</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={isPending}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) return;

                const MAX_BYTES = 3 * 1024 * 1024;
                if (!file.type.startsWith("image/")) {
                  setToast({ type: "error", text: "Please choose an image file." });
                  return;
                }
                if (file.size > MAX_BYTES) {
                  setToast({ type: "error", text: "Image too large (max 3MB)." });
                  return;
                }

                setSelectedFile(file);
              }}
            />

            <div className="flex items-center gap-2">
              <label
                htmlFor="avatar"
                className={[
                  "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold cursor-pointer",
                  isPending ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50",
                ].join(" ")}
              >
                {selectedFile ? "Change photo" : "Upload new photo"}
              </label>

              {selectedFile && (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  disabled={isPending}
                  className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-2 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>

            {selectedFile ? (
              <div className="inline-flex items-center gap-2">
                <span className="text-xs rounded-full bg-gray-100 border px-3 py-1 text-gray-700">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">PNG/JPG/WebP. Max 3MB.</p>
            )}
          </div>
        </div>
      </div>

      {/* Email (read-only) */}
      <div className="space-y-1">
        <label className="font-semibold">Email</label>
        <input
          value={profile.email}
          disabled
          className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-600"
        />
      </div>

      {/* Full name */}
      <div className="space-y-1">
        <label className="font-semibold" htmlFor="full_name">
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          defaultValue={profile.full_name ?? ""}
          placeholder="Enter your full name"
          className="w-full border rounded-md px-3 py-2"
        />
      </div>

      {/* Meeting preference */}
      <div className="space-y-2">
        <div className="font-semibold">Meeting preference</div>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="preference"
            value="in_person"
            defaultChecked={defaultPreference === "in_person"}
          />
          In-person
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="preference"
            value="online"
            defaultChecked={defaultPreference === "online"}
          />
          Online
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="preference"
            value="no_preference"
            defaultChecked={defaultPreference === "no_preference"}
          />
          No preference
        </label>
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <label className="font-semibold" htmlFor="phone">
          Phone number (optional)
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={profile.phone ?? ""}
          placeholder="(555) 555-5555"
          className="w-full border rounded-md px-3 py-2"
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={[
            "px-4 py-2 rounded-md border font-semibold",
            isPending ? "opacity-60" : "hover:bg-gray-50",
          ].join(" ")}
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>

        {isPending && <span className="text-sm text-gray-500">Saving…</span>}
      </div>
    </form>
  );
}