import Link from "next/link";

export function AppBrand() {
  return (
    <Link
      href="/"
      className="inline-flex flex-col leading-tight transition hover:opacity-90"
      aria-label="AnatWithMe home"
    >
      <span className="text-xl font-bold tracking-tight">
        <span className="text-primary">AnatWith</span>
        <span className="text-[var(--secondary)]">M</span>
        <span className="text-primary">e</span>
      </span>
      <span className="text-xs font-medium text-muted-foreground">
        Anatomy Study Groups
      </span>
    </Link>
  );
}
