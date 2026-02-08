import { useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  getBacktestUserId,
  setBacktestUserId,
  useBacktestAlgorithms,
  useBacktestHistory,
} from "@/lib/stockApi";
import {
  type BacktestAlgorithm,
  type BacktestHistoryQuery,
  type BacktestStatus,
} from "@shared/backtest";
import { useI18n } from "@/lib/i18n";
import { backtestTerms, backtestUi, bt } from "@/lib/backtestUi";
import { TermInfoLabel } from "@/components/TermInfoLabel";
import { BacktestQuickLinks } from "@/components/BacktestQuickLinks";

type AlgorithmFilter = "all" | BacktestAlgorithm;
type StatusFilter = "all" | BacktestStatus;

function getDefaultDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

function formatRunAt(value: string, lang: "en" | "zh"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(lang === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function metricClass(value: number | null): string {
  if (value === null) return "text-muted-foreground";
  return value >= 0 ? "text-positive" : "text-negative";
}

export default function BacktestHistoryPage() {
  const { data: algorithms = [] } = useBacktestAlgorithms();
  const { lang, setLang, t } = useI18n();
  const [userId, setUserId] = useState<string>(getBacktestUserId());
  const [algorithm, setAlgorithm] = useState<AlgorithmFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [runDateFrom, setRunDateFrom] = useState<string>(getDefaultDate(-60));
  const [runDateTo, setRunDateTo] = useState<string>(getDefaultDate(0));
  const [pageSize, setPageSize] = useState<number>(20);
  const [query, setQuery] = useState<BacktestHistoryQuery>({
    runDateFrom: getDefaultDate(-60),
    runDateTo: getDefaultDate(0),
    page: 1,
    pageSize: 20,
  });

  const { data, isLoading, error, isFetching } = useBacktestHistory(query);
  const items = data?.items ?? [];

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setBacktestUserId(userId);
    setQuery({
      algorithm: algorithm === "all" ? undefined : algorithm,
      status: status === "all" ? undefined : status,
      runDateFrom: runDateFrom.length > 0 ? runDateFrom : undefined,
      runDateTo: runDateTo.length > 0 ? runDateTo : undefined,
      page: 1,
      pageSize,
    });
  };

  const gotoPage = (page: number) => {
    setQuery((prev) => ({
      ...prev,
      page,
    }));
  };

  const summary = useMemo(() => {
    if (items.length === 0) {
      return { count: 0, positive: 0, avgReturn: null as number | null };
    }

    const returnValues = items
      .map((item) => item.totalReturn)
      .filter((value): value is number => value !== null);
    const positive = returnValues.filter((value) => value >= 0).length;

    return {
      count: items.length,
      positive,
      avgReturn:
        returnValues.length > 0
          ? returnValues.reduce((acc, value) => acc + value, 0) / returnValues.length
          : null,
    };
  }, [items]);

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{bt(backtestUi.history.title, lang)}</h1>
              <p className="text-sm text-muted-foreground">
                {bt(backtestUi.history.subtitle, lang)}
              </p>
            </div>
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="self-start px-2 py-1 rounded-full border border-border text-[10px] font-mono font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              data-testid="backtest-history-lang-toggle"
            >
              {t("langToggle")}
            </button>
          </div>
          <BacktestQuickLinks lang={lang} />
        </header>

        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 rounded-xl border border-border p-4 bg-card">
          <label className="text-sm grid gap-1">
            <span>{bt(backtestUi.center.userId, lang)}</span>
            <input
              className="h-10 px-3 rounded-md bg-background border border-input"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="demo-user"
            />
          </label>
          <label className="text-sm grid gap-1">
            <span>{bt(backtestUi.center.algorithm, lang)}</span>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as AlgorithmFilter)}
              className="h-10 px-3 rounded-md bg-background border border-input"
            >
              <option value="all">{lang === "en" ? "All" : "全部"}</option>
              {algorithms.map((item) => (
                <option key={item} value={item}>
                  {item.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm grid gap-1">
            <span>{bt(backtestUi.history.status, lang)}</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="h-10 px-3 rounded-md bg-background border border-input"
            >
              <option value="all">{lang === "en" ? "All" : "全部"}</option>
              <option value="pending">{lang === "en" ? "Pending" : "待执行"}</option>
              <option value="running">{lang === "en" ? "Running" : "运行中"}</option>
              <option value="completed">{lang === "en" ? "Completed" : "已完成"}</option>
              <option value="failed">{lang === "en" ? "Failed" : "失败"}</option>
              <option value="cancelled">{lang === "en" ? "Cancelled" : "已取消"}</option>
            </select>
          </label>
          <label className="text-sm grid gap-1">
            <span>{bt(backtestUi.history.runDateFrom, lang)}</span>
            <input
              type="date"
              className="h-10 px-3 rounded-md bg-background border border-input"
              value={runDateFrom}
              onChange={(e) => setRunDateFrom(e.target.value)}
            />
          </label>
          <label className="text-sm grid gap-1">
            <span>{bt(backtestUi.history.runDateTo, lang)}</span>
            <input
              type="date"
              className="h-10 px-3 rounded-md bg-background border border-input"
              value={runDateTo}
              onChange={(e) => setRunDateTo(e.target.value)}
            />
          </label>
          <label className="text-sm grid gap-1">
            <span>{bt(backtestUi.history.pageSize, lang)}</span>
            <select
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-10 px-3 rounded-md bg-background border border-input"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <div className="text-sm grid gap-1 sm:col-span-3 lg:col-span-6">
            <button
              type="submit"
              className="h-10 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60"
              disabled={isFetching}
            >
              {isFetching
                ? bt(backtestUi.history.filtering, lang)
                : bt(backtestUi.history.applyFilters, lang)}
            </button>
          </div>
        </form>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">
              {lang === "en" ? "Current Page Rows" : "当前页记录数"}
            </p>
            <p className="text-xl font-semibold">{summary.count}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">
              {lang === "en" ? "Positive Returns" : "正收益条数"}
            </p>
            <p className="text-xl font-semibold">{summary.positive}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">
              {lang === "en" ? "Average Return" : "平均收益"}
            </p>
            <p className={`text-xl font-semibold ${metricClass(summary.avgReturn)}`}>
              {formatPercent(summary.avgReturn)}
            </p>
          </div>
        </section>

        {isLoading ? (
          <section className="rounded-xl border border-border p-6 bg-card">
            {lang === "en" ? "Loading history..." : "历史数据加载中..."}
          </section>
        ) : error ? (
          <section className="rounded-xl border border-border p-6 bg-card text-negative">
            {(error as Error).message}
          </section>
        ) : (
          <section className="rounded-xl border border-border p-3 bg-card space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {lang === "en" ? "Total" : "总数"}: {data?.total ?? 0} |{" "}
                {lang === "en" ? "Page" : "页码"} {(data?.page ?? 1)} / {(data?.totalPages ?? 1)}
              </span>
              <span>{lang === "en" ? "User Scope" : "用户范围"}: {getBacktestUserId()}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-2">{lang === "en" ? "Run At" : "运行时间"}</th>
                    <th className="text-left py-2 pr-2">{bt(backtestUi.center.algorithm, lang)}</th>
                    <th className="text-left py-2 pr-2">{lang === "en" ? "Backtest Period" : "回测区间"}</th>
                    <th className="text-right py-2 pr-2">{bt(backtestUi.results.finalValue, lang)}</th>
                    <th className="text-right py-2 pr-2">{bt(backtestUi.results.totalReturn, lang)}</th>
                    <th className="text-right py-2 pr-2">
                      <TermInfoLabel
                        label={backtestTerms.sharpeRatio.label[lang]}
                        description={backtestTerms.sharpeRatio.description[lang]}
                      />
                    </th>
                    <th className="text-right py-2 pr-2">
                      <TermInfoLabel
                        label={backtestTerms.maxDrawdown.label[lang]}
                        description={backtestTerms.maxDrawdown.description[lang]}
                      />
                    </th>
                    <th className="text-right py-2 pr-2">{bt(backtestUi.results.totalTrades, lang)}</th>
                    <th className="text-left py-2 pr-2">{bt(backtestUi.history.status, lang)}</th>
                    <th className="text-right py-2">{lang === "en" ? "Action" : "操作"}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-muted-foreground">
                        {bt(backtestUi.history.noData, lang)}
                      </td>
                    </tr>
                  )}
                  {items.map((item) => (
                    <tr key={item.backtestResultId} className="border-b border-border/40">
                      <td className="py-2 pr-2 whitespace-nowrap">{formatRunAt(item.runAt, lang)}</td>
                      <td className="py-2 pr-2">{item.algorithm.toUpperCase()}</td>
                      <td className="py-2 pr-2">
                        {item.startDate ?? "-"} to {item.endDate ?? "-"}
                      </td>
                      <td className="py-2 pr-2 text-right">{formatCurrency(item.finalValue)}</td>
                      <td className={`py-2 pr-2 text-right ${metricClass(item.totalReturn)}`}>
                        {formatPercent(item.totalReturn)}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {item.sharpeRatio === null ? "-" : item.sharpeRatio.toFixed(2)}
                      </td>
                      <td className="py-2 pr-2 text-right text-negative">{formatPercent(item.maxDrawdown)}</td>
                      <td className="py-2 pr-2 text-right">{item.totalTrades ?? "-"}</td>
                      <td className="py-2 pr-2">{item.status ?? "-"}</td>
                      <td className="py-2 text-right">
                        <Link
                          href={`/backtest/${item.backtestResultId}/results`}
                          className="text-xs px-2 py-1 rounded-md border border-border hover:bg-secondary/60"
                        >
                          {bt(backtestUi.history.view, lang)}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary/60 disabled:opacity-50"
                disabled={(data?.page ?? 1) <= 1 || isFetching}
                onClick={() => gotoPage((data?.page ?? 1) - 1)}
              >
                {bt(backtestUi.history.prev, lang)}
              </button>
              <button
                type="button"
                className="text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary/60 disabled:opacity-50"
                disabled={(data?.page ?? 1) >= (data?.totalPages ?? 1) || isFetching}
                onClick={() => gotoPage((data?.page ?? 1) + 1)}
              >
                {bt(backtestUi.history.next, lang)}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
