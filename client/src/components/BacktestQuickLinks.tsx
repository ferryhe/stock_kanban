import { Link } from "wouter";
import { Activity, BarChart3, FlaskConical, History, LayoutDashboard } from "lucide-react";
import { type Language } from "@/lib/i18n";
import { backtestUi, bt } from "@/lib/backtestUi";

type BacktestQuickLinksProps = {
  lang: Language;
  className?: string;
  compact?: boolean;
};

export function BacktestQuickLinks({
  lang,
  className,
  compact = false,
}: BacktestQuickLinksProps) {
  const links = [
    { href: "/backtest", icon: FlaskConical, label: bt(backtestUi.nav.center, lang) },
    { href: "/compare", icon: BarChart3, label: bt(backtestUi.nav.compare, lang) },
    { href: "/backtest/history", icon: History, label: bt(backtestUi.nav.history, lang) },
    { href: "/live", icon: Activity, label: bt(backtestUi.nav.live, lang) },
    { href: "/", icon: LayoutDashboard, label: bt(backtestUi.nav.dashboard, lang) },
  ];

  return (
    <div
      className={`flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar ${className ?? ""}`.trim()}
    >
      {links.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-secondary/60 whitespace-nowrap ${
              compact ? "text-[11px]" : ""
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
