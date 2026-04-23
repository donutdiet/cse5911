"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  BookOpen,
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  Upload,
  Users,
  X,
} from "lucide-react";

import { updateStudentProfile } from "@/app/student/profile/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type StudyMode = "group" | "independent";
type Preference = "in_person" | "online" | "no_preference";

type Profile = {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  preference: Preference | null;
  study_mode: StudyMode;
  profile_picture_url: string | null;
  bio: string | null;
  hasAssignedGroup: boolean;
};

type Toast = { type: "success" | "error"; text: string } | null;

const BIO_MAX = 500;
const AVATAR_MAX_BYTES = 3 * 1024 * 1024;

const PREFERENCE_OPTIONS: {
  value: Preference;
  label: string;
  description: string;
}[] = [
  {
    value: "in_person",
    label: "In-person",
    description: "Meet on campus.",
  },
  {
    value: "online",
    label: "Online",
    description: "Meet virtually.",
  },
  {
    value: "no_preference",
    label: "No preference",
    description: "Either works for me.",
  },
];

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function getInitials(name: string | null, fallbackEmail: string) {
  const source = name?.trim() || fallbackEmail;
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [isPending, startTransition] = useTransition();

  const defaultPreference: Preference = profile.preference ?? "no_preference";
  const [studyMode, setStudyMode] = useState<StudyMode>(profile.study_mode);
  const [preference, setPreference] = useState<Preference>(defaultPreference);
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [phoneDisplay, setPhoneDisplay] = useState(
    formatPhoneNumber(profile.phone ?? ""),
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const isIndependent = studyMode === "independent";
  const isLockedToGroup = profile.hasAssignedGroup;

  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setToast(null);

    const cleanPhone = phoneDisplay.replace(/\D/g, "");
    if (cleanPhone && cleanPhone.length !== 10) {
      setToast({
        type: "error",
        text: "Phone number must be exactly 10 digits.",
      });
      return;
    }

    const safe = new FormData();
    safe.set("full_name", fullName.trim());
    safe.set("phone", cleanPhone);
    safe.set("preference", preference);
    safe.set("study_mode", studyMode);
    safe.set("bio", bio);
    if (selectedFile) {
      safe.set("avatar", selectedFile);
    }

    startTransition(async () => {
      const res = await updateStudentProfile(safe);
      if (res.ok) {
        setToast({ type: "success", text: "Profile updated successfully." });
        setSelectedFile(null);
        setPhoneDisplay(formatPhoneNumber(cleanPhone));
        setStudyMode(res.updated.study_mode);
        setPreference(res.updated.preference);
      } else {
        setToast({ type: "error", text: res.error ?? "Save failed." });
      }
    });
  }

  const avatarSrc = previewUrl || profile.profile_picture_url || "";
  const initials = getInitials(fullName, profile.email);
  const displayName = fullName.trim() || "Your name";

  return (
    <form onSubmit={onSubmit} className="w-full space-y-6 pb-28">
      {toast ? (
        <div
          role="status"
          className={cn(
            "flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm animate-in fade-in slide-in-from-top-1 duration-200",
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-destructive/50 bg-destructive/10 text-destructive",
          )}
        >
          <div className="flex items-start gap-2">
            {toast.type === "success" ? (
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setToast(null)}
            aria-label="Dismiss message"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : null}

      {/* About you */}
      <Card>
        <CardHeader className="border-b [.border-b]:pb-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-lg font-semibold text-muted-foreground ring-4 ring-background">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold">
                {displayName}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {profile.email}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
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
                    if (!file.type.startsWith("image/")) {
                      setToast({
                        type: "error",
                        text: "Please choose an image file.",
                      });
                      return;
                    }
                    if (file.size > AVATAR_MAX_BYTES) {
                      setToast({
                        type: "error",
                        text: "Image too large (max 3MB).",
                      });
                      return;
                    }
                    setSelectedFile(file);
                  }}
                />
                <Button
                  asChild
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                >
                  <label htmlFor="avatar" className="cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    {selectedFile ? "Change" : "Upload photo"}
                  </label>
                </Button>

                {selectedFile ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <span className="max-w-[14rem] truncate text-xs text-muted-foreground">
                      {selectedFile.name} ·{" "}
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    PNG, JPG, or WebP up to 3MB.
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="text"
                inputMode="numeric"
                value={phoneDisplay}
                onChange={(e) =>
                  setPhoneDisplay(formatPhoneNumber(e.target.value))
                }
                placeholder="123-456-7890"
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Fully optional. Share if you want to be contacted via phone for
                group communication.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="bio">Bio</Label>
              <span
                className={cn(
                  "text-xs tabular-nums text-muted-foreground",
                  bio.length > BIO_MAX - 25 &&
                    "text-amber-600 dark:text-amber-400",
                )}
              >
                {bio.length}/{BIO_MAX}
              </span>
            </div>
            <textarea
              id="bio"
              name="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              maxLength={BIO_MAX}
              rows={4}
              placeholder="Tell other students a little about yourself."
              disabled={isPending}
              className={cn(
                "placeholder:text-muted-foreground border-input dark:bg-input/30 w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Study participation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Study participation</CardTitle>
          <CardDescription>
            Choose whether you want to be placed into instructor-created groups.
            If you pick group study, tell us your meeting format.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLockedToGroup ? (
            <StatusCallout tone="warning">
              You&apos;re currently assigned to a group, so you can&apos;t
              switch to Independent Study. Reach out to your instructor to be
              removed first.
            </StatusCallout>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              name="study_mode"
              value="group"
              checked={studyMode === "group"}
              onSelect={() => setStudyMode("group")}
              disabled={isPending}
              icon={<Users className="h-4 w-4" />}
              title="Group study"
              description="Eligible for matching. Sets availability and meeting format."
            />
            <ChoiceCard
              name="study_mode"
              value="independent"
              checked={studyMode === "independent"}
              onSelect={() => setStudyMode("independent")}
              disabled={isPending || isLockedToGroup}
              icon={<BookOpen className="h-4 w-4" />}
              title="Independent study"
              description="Study on your own. Removed from the grouping pool entirely."
            />
          </div>

          {isIndependent ? (
            <StatusCallout tone="info">
              Independent Study is active. You won&apos;t be matched into a
              group, and your availability page will stay informational.
            </StatusCallout>
          ) : (
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <Label className="text-sm">Meeting preference</Label>
                <span className="text-xs text-muted-foreground">
                  Used when matching your group
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {PREFERENCE_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    compact
                    name="preference"
                    value={option.value}
                    checked={preference === option.value}
                    onSelect={() => setPreference(option.value)}
                    disabled={isPending}
                    title={option.label}
                    description={option.description}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:mx-0 sm:rounded-lg sm:border">
        <div className="flex items-center justify-end gap-3">
          <span className="mr-auto hidden text-xs text-muted-foreground sm:inline">
            Changes only save when you click save.
          </span>
          <Button type="submit" disabled={isPending} size="sm">
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ChoiceCard({
  name,
  value,
  checked,
  onSelect,
  disabled,
  title,
  description,
  icon,
  compact,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  disabled?: boolean;
  title: string;
  description: string;
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "group relative flex gap-3 rounded-lg border bg-background text-left transition-colors",
        compact ? "min-h-16 p-3" : "min-h-24 p-4",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:bg-muted/40",
        checked
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-input",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        disabled={disabled}
        className="peer sr-only"
      />
      <div
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
          checked
            ? "border-primary bg-primary"
            : "border-muted-foreground/40 bg-background",
        )}
        aria-hidden
      >
        {checked ? (
          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div
          className={cn(
            "flex items-center gap-1.5 font-semibold",
            compact ? "text-sm" : "text-sm",
          )}
        >
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
          {title}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}

function StatusCallout({
  tone,
  children,
}: {
  tone: "warning" | "info" | "muted";
  children: React.ReactNode;
}) {
  const Icon = tone === "warning" ? TriangleAlert : Info;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm",
        tone === "warning" &&
          "border-amber-300 bg-amber-50/70 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
        tone === "info" &&
          "border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
        tone === "muted" && "border-muted bg-muted/30 text-muted-foreground",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
