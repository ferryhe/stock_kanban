import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { runBacktestCompareRequest, useBacktestAlgorithms } from "@/lib/stockApi";
import { type BacktestAlgorithm, type BacktestConfig } from "@shared/backtest";

function getDefaultDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

const LINE_COLORS = ["#22c55e", "#60a5fa", "#f59e0b", "#f43f5e", "#14b8a6", "#a78bfa"];

export default function ComparePage() {
  const { data: algorithms = [] } = useBacktestAlgorithms();
  const [selected, setSelected] = useState<BacktestAlgorithm[]>([]);

  const [startDate, setStartDate] = useState<string>(getDefaultDate(-365));
  const [endDate, setEndDate] = useState<string>(getDefaultDate(-1));
  const [initialCash, setInitialCash] = useState<string>("100000");
  const [maxPositionPerStock, setMaxPositionPerStock] = useState<string>("0.1");
  const [maxTotalPositions, setMaxTotalPositions] = useState<string>("10");
  const [minCashReserve, setMinCashReserve] = useState<string>("0.1");
  const [commissionBps, setCommissionBps] = useState<string>("5");
  const [slippageBps, setSlippageBps] = useState<string>("5");
  const [minCommission, setMinCommission] = useState<string>("1");
  const [rebalanceFrequency, setRebalanceFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");

  useEffect(() => {
    if (algorithms.length === 0) return;
    if (selected.length > 0) return;
    setSelected(algorithms.slice(0, Math.min(2, algorithms.length)));
  }, [algorithms, selected.length]);

  const mutation = useMutation({
    mutationFn: ({
      selectedAlgorithms,
      baseConfig,
    }: {
      selectedAlgorithms: BacktestAlgorithm[];
      baseConfig: Omit<BacktestConfig, "algorithm">;
    }) => runBacktestCompareRequest(selectedAlgorithms, baseConfig),
  });

  const toggleAlgorithm = (algorithm: BacktestAlgorithm) => {
    setSelected((prev) => {
      if (prev.includes(algorithm)) {
        return prev.filter((item) => item !== algorithm);
      }
      return [...prev, algorithm];
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (selected.length === 0) return;

    const baseConfig: Omit<BacktestConfig, "algorithm"> = {
      startDate,
      endDate,
      initialCash: Number(initialCash),
      positionParams: {
        maxPositionPerStock: Number(maxPositionPerStock),
        maxTotalPositions: Number(maxTotalPositions),
        minCashReserve: Number(minCashReserve),
      },
      executionParams: {
        commissionBps: Number(commissionBps),
        slippageBps: Number(slippageBps),
        minCommission: Number(minCommission),
      },
      options: {
        benchmark: "SPY",
        rebalanceFrequency,
      },
    };

    mutation.mutate({ selectedAlgorithms: selected, baseConfig });
  };

  const comparisonChartData = useMemo(() => {
    const results = mutation.data;
    if (!results || results.length === 0) return [] as Array<Record<string, number | string>>;

    const map = new Map<string, Record<string, number | string>>();
    results.forEach((result) => {
      const key = result.summary.algorithm.toUpperCase();
      result.equityCurve.forEach((point) => {
        if (!map.has(point.date)) {
          map.set(point.date, { date: point.date });
        }
        const row = map.get(point.date);
        if (row) {
          row[key] = point.totalValue;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [mutation.data]);

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Algorithm Compare</h1>
            <p className="text-sm text-muted-foreground">Run multiple market algorithms and compare backtest outcomes.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/backtest" className="text-xs px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80">
              Backtest Center
            </Link>
            <Link href="/" className="text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary/60">
              Dashboard
            </Link>
          </div>
        </header>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border p-4 bg-card">
          <div className="grid gap-2">
            <p className="text-sm font-medium">Algorithms</p>
            <div className="flex flex-wrap gap-2">
              {algorithms.map((algorithm) => {
                const active = selected.includes(algorithm);
                return (
                  <button
                    type="button"
                    key={algorithm}
                    onClick={() => toggleAlgorithm(algorithm)}
                    className={`px-3 py-2 rounded-md text-sm border ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-secondary"
                    }`}
                  >
                    {algorithm.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <label className="text-sm grid gap-1">
              <span>Start Date</span>
              <input
                type="date"
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="text-sm grid gap-1">
              <span>End Date</span>
              <input
                type="date"
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            <label className="text-sm grid gap-1">
              <span>Initial Cash</span>
              <input
                type="number"
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={initialCash}
                onChange={(e) => setInitialCash(e.target.value)}
              />
            </label>
            <label className="text-sm grid gap-1">
              <span>Rebalance</span>
              <select
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={rebalanceFrequency}
                onChange={(e) => setRebalanceFrequency(e.target.value as "daily" | "weekly" | "monthly")}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <label className="text-sm grid gap-1">
              <span>Max Position</span>
              <input
                type="number"
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={maxPositionPerStock}
                onChange={(e) => setMaxPositionPerStock(e.target.value)}
                min={0}
                max={1}
                step={0.01}
              />
            </label>
            <label className="text-sm grid gap-1">
              <span>Max Positions</span>
              <input
                type="number"
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={maxTotalPositions}
                onChange={(e) => setMaxTotalPositions(e.target.value)}
                min={1}
                step={1}
              />
            </label>
            <label className="text-sm grid gap-1">
              <span>Cash Reserve</span>
              <input
                type="number"
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={minCashReserve}
                onChange={(e) => setMinCashReserve(e.target.value)}
                min={0}
                max={1}
                step={0.01}
              />
            </label>
            <label className="text-sm grid gap-1">
              <span>Commission bps</span>
              <input
                type="number"
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={commissionBps}
                onChange={(e) => setCommissionBps(e.target.value)}
                min={0}
                step={1}
              />
            </label>
            <label className="text-sm grid gap-1">
              <span>Slippage bps</span>
              <input
                type="number"
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={slippageBps}
                onChange={(e) => setSlippageBps(e.target.value)}
                min={0}
                step={1}
              />
            </label>
            <label className="text-sm grid gap-1">
              <span>Min Fee</span>
              <input
                type="number"
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={minCommission}
                onChange={(e) => setMinCommission(e.target.value)}
                min={0}
                step={0.1}
              />
            </label>
          </div>

          {mutation.isError && (
            <p className="text-sm text-negative">{(mutation.error as Error).message}</p>
          )}

          <button
            type="submit"
            className="h-11 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60"
            disabled={selected.length === 0 || mutation.isPending}
          >
            {mutation.isPending ? "Running Compare..." : "Run Compare"}
          </button>
        </form>

        {mutation.data && mutation.data.length > 0 && (
          <>
            <section className="rounded-xl border border-border p-3 bg-card">
              <h2 className="text-sm font-medium mb-2">Equity Curves</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonChartData} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="date" minTickGap={28} />
                    <YAxis
                      tickFormatter={(value) =>
                        new Intl.NumberFormat("en-US", {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        }).format(value)
                      }
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(Number(value))}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    {mutation.data.map((result, idx) => (
                      <Line
                        key={result.id}
                        type="monotone"
                        dataKey={result.summary.algorithm.toUpperCase()}
                        stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl border border-border p-3 bg-card overflow-x-auto">
              <h2 className="text-sm font-medium mb-2">Summary</h2>
              <table className="w-full text-sm min-w-[860px]">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 pr-2">Algorithm</th>
                    <th className="text-right py-2 pr-2">Final Value</th>
                    <th className="text-right py-2 pr-2">Total Return</th>
                    <th className="text-right py-2 pr-2">Annualized</th>
                    <th className="text-right py-2 pr-2">Sharpe</th>
                    <th className="text-right py-2 pr-2">Volatility</th>
                    <th className="text-right py-2 pr-2">Max Drawdown</th>
                    <th className="text-right py-2 pr-2">Trades</th>
                    <th className="text-right py-2">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {mutation.data.map((result) => (
                    <tr key={result.id} className="border-b border-border/40">
                      <td className="py-2 pr-2 font-medium">{result.summary.algorithm.toUpperCase()}</td>
                      <td className="py-2 pr-2 text-right">{formatCurrency(result.summary.finalValue)}</td>
                      <td className="py-2 pr-2 text-right">{formatPercent(result.summary.totalReturn)}</td>
                      <td className="py-2 pr-2 text-right">{formatPercent(result.summary.annualizedReturn)}</td>
                      <td className="py-2 pr-2 text-right">{result.summary.sharpeRatio.toFixed(2)}</td>
                      <td className="py-2 pr-2 text-right">{formatPercent(result.summary.volatility)}</td>
                      <td className="py-2 pr-2 text-right">{formatPercent(result.summary.maxDrawdown)}</td>
                      <td className="py-2 pr-2 text-right">{result.summary.totalTrades}</td>
                      <td className="py-2 text-right">{formatPercent(result.summary.winRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
