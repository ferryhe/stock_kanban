import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  getBacktestUserId,
  runLiveSettlementNowRequest,
  runLiveTradingRequest,
  setBacktestUserId,
  useBacktestAlgorithms,
  useLivePortfolio,
} from "@/lib/stockApi";
import { type BacktestAlgorithm } from "@shared/backtest";

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

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
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

export default function LiveTradingPage() {
  const queryClient = useQueryClient();
  const { data: algorithms = [] } = useBacktestAlgorithms();
  const [algorithm, setAlgorithm] = useState<BacktestAlgorithm>("us");
  const [userId, setUserId] = useState<string>(getBacktestUserId());
  const [localError, setLocalError] = useState<string | null>(null);

  const activeAlgorithm = useMemo<BacktestAlgorithm>(() => {
    if (algorithms.includes(algorithm)) {
      return algorithm;
    }
    if (algorithms.length > 0) {
      return algorithms[0];
    }
    return "us";
  }, [algorithm, algorithms]);

  const {
    data: snapshot,
    isLoading,
    error,
    isFetching,
  } = useLivePortfolio(activeAlgorithm, true);

  const invalidateLive = () => {
    queryClient.invalidateQueries({
      queryKey: ["live", "portfolio", getBacktestUserId(), activeAlgorithm],
    });
  };

  const runMutation = useMutation({
    mutationFn: runLiveTradingRequest,
    onSuccess: () => {
      setLocalError(null);
      invalidateLive();
    },
    onError: (e) => {
      setLocalError((e as Error).message);
    },
  });

  const settleMutation = useMutation({
    mutationFn: runLiveSettlementNowRequest,
    onSuccess: () => {
      setLocalError(null);
      invalidateLive();
    },
    onError: (e) => {
      setLocalError((e as Error).message);
    },
  });

  const onApplyUserId = (event: FormEvent) => {
    event.preventDefault();
    setBacktestUserId(userId);
    invalidateLive();
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Live Paper Trading</h1>
            <p className="text-sm text-muted-foreground">
              Real-time paper portfolio snapshot with daily settlement.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/backtest" className="text-xs px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80">
              Backtest Center
            </Link>
            <Link href="/backtest/history" className="text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary/60">
              History
            </Link>
            <Link href="/" className="text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary/60">
              Dashboard
            </Link>
          </div>
        </header>

        <form onSubmit={onApplyUserId} className="grid gap-3 sm:grid-cols-4 rounded-xl border border-border p-4 bg-card">
          <label className="text-sm grid gap-1">
            <span>User ID</span>
            <input
              className="h-10 px-3 rounded-md bg-background border border-input"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="demo-user"
            />
          </label>

          <label className="text-sm grid gap-1">
            <span>Algorithm</span>
            <select
              className="h-10 px-3 rounded-md bg-background border border-input"
              value={activeAlgorithm}
              onChange={(e) => setAlgorithm(e.target.value as BacktestAlgorithm)}
            >
              {(algorithms.length > 0 ? algorithms : ["us", "cn", "hk"]).map((item) => (
                <option key={item} value={item}>
                  {item.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <div className="text-sm grid gap-1">
            <span>Actions</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="h-10 px-3 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60"
                disabled={runMutation.isPending}
                onClick={() => runMutation.mutate(activeAlgorithm)}
              >
                {runMutation.isPending ? "Running..." : "Run Now"}
              </button>
              <button
                type="button"
                className="h-10 px-3 rounded-md border border-border hover:bg-secondary/60 disabled:opacity-60"
                disabled={settleMutation.isPending}
                onClick={() => settleMutation.mutate()}
              >
                {settleMutation.isPending ? "Settling..." : "Settle Now"}
              </button>
            </div>
          </div>

          <div className="text-sm grid gap-1">
            <span>Scope</span>
            <button
              type="submit"
              className="h-10 rounded-md border border-border hover:bg-secondary/60"
            >
              Apply User ID
            </button>
          </div>
        </form>

        {localError && (
          <section className="rounded-xl border border-border p-4 bg-card text-negative">
            {localError}
          </section>
        )}
        {error && !localError && (
          <section className="rounded-xl border border-border p-4 bg-card text-negative">
            {(error as Error).message}
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-5">
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-xl font-semibold">
              {snapshot ? formatCurrency(snapshot.totalValue) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Cash</p>
            <p className="text-xl font-semibold">
              {snapshot ? formatCurrency(snapshot.cash) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Holdings Value</p>
            <p className="text-xl font-semibold">
              {snapshot ? formatCurrency(snapshot.holdingsValue) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Daily Return</p>
            <p className={`text-xl font-semibold ${metricClass(snapshot?.dailyReturn ?? null)}`}>
              {snapshot ? formatPercent(snapshot.dailyReturn) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Cumulative Return</p>
            <p className={`text-xl font-semibold ${metricClass(snapshot?.cumulativeReturn ?? null)}`}>
              {snapshot ? formatPercent(snapshot.cumulativeReturn) : "-"}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-border p-3 bg-card space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Holdings ({snapshot?.holdings.length ?? 0}) | Trades ({snapshot?.recentTrades.length ?? 0})
            </span>
            <span>
              Updated: {snapshot ? formatTime(snapshot.updatedAt) : "-"}
              {isFetching ? " | refreshing..." : ""}
              {isLoading ? " | loading..." : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-2">Ticker</th>
                  <th className="text-right py-2 pr-2">Quantity</th>
                  <th className="text-right py-2 pr-2">Avg Cost</th>
                  <th className="text-right py-2 pr-2">Price</th>
                  <th className="text-right py-2 pr-2">Market Value</th>
                  <th className="text-right py-2">Unrealized PnL</th>
                </tr>
              </thead>
              <tbody>
                {!snapshot || snapshot.holdings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No holdings yet.
                    </td>
                  </tr>
                ) : (
                  snapshot.holdings.map((row) => (
                    <tr key={row.ticker} className="border-b border-border/40">
                      <td className="py-2 pr-2">{row.ticker}</td>
                      <td className="py-2 pr-2 text-right">{row.quantity.toFixed(4)}</td>
                      <td className="py-2 pr-2 text-right">{formatCurrency(row.avgCost)}</td>
                      <td className="py-2 pr-2 text-right">
                        {row.currentPrice === null ? "-" : formatCurrency(row.currentPrice)}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {row.marketValue === null ? "-" : formatCurrency(row.marketValue)}
                      </td>
                      <td className={`py-2 text-right ${metricClass(row.unrealizedPnl)}`}>
                        {row.unrealizedPnl === null ? "-" : formatCurrency(row.unrealizedPnl)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-border p-3 bg-card space-y-3">
          <p className="text-sm font-medium">Recent Trades</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-2">Time</th>
                  <th className="text-left py-2 pr-2">Ticker</th>
                  <th className="text-left py-2 pr-2">Side</th>
                  <th className="text-right py-2 pr-2">Quantity</th>
                  <th className="text-right py-2 pr-2">Price</th>
                  <th className="text-right py-2 pr-2">Amount</th>
                  <th className="text-right py-2">Commission</th>
                </tr>
              </thead>
              <tbody>
                {!snapshot || snapshot.recentTrades.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      No trades yet.
                    </td>
                  </tr>
                ) : (
                  snapshot.recentTrades.map((row) => (
                    <tr key={row.id} className="border-b border-border/40">
                      <td className="py-2 pr-2 whitespace-nowrap">{formatTime(row.executedAt)}</td>
                      <td className="py-2 pr-2">{row.ticker}</td>
                      <td className={`py-2 pr-2 ${row.side === "BUY" ? "text-positive" : "text-negative"}`}>
                        {row.side}
                      </td>
                      <td className="py-2 pr-2 text-right">{row.quantity.toFixed(4)}</td>
                      <td className="py-2 pr-2 text-right">{formatCurrency(row.price)}</td>
                      <td className="py-2 pr-2 text-right">{formatCurrency(row.totalAmount)}</td>
                      <td className="py-2 text-right">{formatCurrency(row.commission)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
