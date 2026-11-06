import { Bell } from "lucide-react";

export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--fx-border)] bg-white/90 backdrop-blur-md">
      <div className="fx-hero-bar" />
      <div className="flex items-center justify-between gap-4 px-7 py-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--fx-text)] leading-tight">{title}</h1>
          {subtitle ? <div className="mt-[3px] text-[13px] text-[var(--fx-text-subtle)]">{subtitle}</div> : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <button className="relative ml-1 rounded-[10px] border border-[var(--fx-border)] bg-white p-2.5 text-[var(--fx-text-muted)] hover:bg-[var(--fx-bg)]" title="Notifications" type="button">
            <Bell size={17} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--fx-orange-500)]" />
          </button>
        </div>
      </div>
    </header>
  );
}
