import { useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useBacktestAlgorithms, useBacktestHistory } from "@/lib/stockApi";
import { type BacktestAlgorithm, type BacktestHistoryQuery } from "@shared/backtest";

type AlgorithmFilter = "all" | BacktestAlgorithm;

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

function formatRunAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-US", {
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

  const [algorithm, setAlgorithm] = useState<AlgorithmFilter>("all");
  const [runDateFrom, setRunDateFrom] = useState<string>(getDefaultDate(-60));
  const [runDateTo, setRunDateTo] = useState<string>(getDefaultDate(0));
  const [query, setQuery] = useState<BacktestHistoryQuery>({
    runDateFrom: getDefaultDate(-60),
    runDateTo: getDefaultDate(0),
    limit: 100,
  });

  const { data: items = [], isLoading, error, isFetching } = useBacktestHistory(query);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setQuery({
      algorithm: algorithm === "all" ? undefined : algorithm,
      runDateFrom: runDateFrom.length > 0 ? runDateFrom : undefined,
      runDateTo: runDateTo.length > 0 ? runDateTo : undefined,
      limit: 100,
    });
  };

  const summary = useMemo(() => {
    if (items.length === 0) {
      return { total: 0, positive: 0, avgReturn: null as number | null };
    }

    const returnValues = items
      .map((item) => item.totalReturn)
      .filter((value): value is number => value !== null);
    const positive = returnValues.filter((value) => value >= 0).length;

    return {
      total: items.length,
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
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Backtest History</h1>
            <p className="text-sm text-muted-foreground">
              Filter by algorithm and run date, then open any result details.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/backtest" className="text-xs px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80">
              Backtest Center
            </Link>
            <Link href="/compare" className="text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary/60">
              Compare
            </Link>
          </div>
        </header>

        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4 rounded-xl border border-border p-4 bg-card">
          <label className="text-sm grid gap-1">
            <span>Algorithm</span>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as AlgorithmFilter)}
              className="h-10 px-3 rounded-md bg-background border border-input"
            >
              <option value="all">All</option>
              {algorithms.map((item) => (
                <option key={item} value={item}>
                  {item.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm grid gap-1">
            <span>Run Date From</span>
            <input
              type="date"
              className="h-10 px-3 rounded-md bg-background border border-input"
              value={runDateFrom}
              onChange={(e) => setRunDateFrom(e.target.value)}
            />
          </label>
          <label className="text-sm grid gap-1">
            <span>Run Date To</span>
            <input
              type="date"
              className="h-10 px-3 rounded-md bg-background border border-input"
              value={runDateTo}
              onChange={(e) => setRunDateTo(e.target.value)}
            />
          </label>
          <div className="text-sm grid gap-1">
            <span>&nbsp;</span>
            <button
              type="submit"
              className="h-10 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60"
              disabled={isFetching}
            >
              {isFetching ? "Filtering..." : "Apply Filters"}
            </button>
          </div>
        </form>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Runs</p>
            <p className="text-xl font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Positive Returns</p>
            <p className="text-xl font-semibold">{summary.positive}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Average Return</p>
            <p className={`text-xl font-semibold ${metricClass(summary.avgReturn)}`}>
              {formatPercent(summary.avgReturn)}
            </p>
          </div>
        </section>

        {isLoading ? (
          <section className="rounded-xl border border-border p-6 bg-card">Loading history...</section>
        ) : error ? (
          <section className="rounded-xl border border-border p-6 bg-card text-negative">
            {(error as Error).message}
          </section>
        ) : (
          <section className="rounded-xl border border-border p-3 bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-2">Run At</th>
                    <th className="text-left py-2 pr-2">Algorithm</th>
                    <th className="text-left py-2 pr-2">Backtest Period</th>
                    <th className="text-right py-2 pr-2">Final Value</th>
                    <th className="text-right py-2 pr-2">Total Return</th>
                    <th className="text-right py-2 pr-2">Sharpe</th>
                    <th className="text-right py-2 pr-2">Max Drawdown</th>
                    <th className="text-right py-2 pr-2">Trades</th>
                    <th className="text-left py-2 pr-2">Status</th>
                    <th className="text-right py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-muted-foreground">
                        No backtest history found for current filters.
                      </td>
                    </tr>
                  )}
                  {items.map((item) => (
                    <tr key={item.backtestResultId} className="border-b border-border/40">
                      <td className="py-2 pr-2 whitespace-nowrap">{formatRunAt(item.runAt)}</td>
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
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
