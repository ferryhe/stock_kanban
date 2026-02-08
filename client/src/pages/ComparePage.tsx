import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getBacktestUserId,
  runBacktestCompareRequest,
  setBacktestUserId,
  useBacktestAlgorithms,
} from "@/lib/stockApi";
import { type BacktestAlgorithm, type BacktestConfig, type BacktestResult } from "@shared/backtest";

type ChartRow = Record<string, string | number | null>;

type CorrelationResult = {
  labels: string[];
  matrix: Array<Array<number | null>>;
};

const LINE_COLORS = ["#22c55e", "#60a5fa", "#f59e0b", "#f43f5e", "#14b8a6", "#a78bfa"];

function getDefaultDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatPercentNullable(value: number | null): string {
  if (value === null) return "-";
  return formatPercent(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function metricClass(value: number | null): string {
  if (value === null) return "text-muted-foreground";
  return value >= 0 ? "text-positive" : "text-negative";
}

function buildChartData(
  results: BacktestResult[] | undefined,
  valueSelector: (point: BacktestResult["equityCurve"][number]) => number,
): ChartRow[] {
  if (!results || results.length === 0) {
    return [];
  }

  const map = new Map<string, ChartRow>();
  results.forEach((result) => {
    const key = result.summary.algorithm.toUpperCase();
    result.equityCurve.forEach((point) => {
      if (!map.has(point.date)) {
        map.set(point.date, { date: point.date });
      }
      const row = map.get(point.date);
      if (row) {
        row[key] = valueSelector(point);
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function pearsonCorrelation(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 2) {
    return null;
  }

  const meanA = a.reduce((sum, value) => sum + value, 0) / a.length;
  const meanB = b.reduce((sum, value) => sum + value, 0) / b.length;

  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }

  if (denomA <= 0 || denomB <= 0) {
    return null;
  }

  return numerator / Math.sqrt(denomA * denomB);
}

function buildDailyReturnMap(result: BacktestResult): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 1; i < result.equityCurve.length; i += 1) {
    const prev = result.equityCurve[i - 1].totalValue;
    const next = result.equityCurve[i].totalValue;
    if (prev > 0) {
      map.set(result.equityCurve[i].date, next / prev - 1);
    }
  }
  return map;
}

function buildCorrelationResult(results: BacktestResult[] | undefined): CorrelationResult {
  if (!results || results.length === 0) {
    return { labels: [], matrix: [] };
  }

  const labels = results.map((result) => result.summary.algorithm.toUpperCase());
  const returnMaps = results.map((result) => buildDailyReturnMap(result));

  const matrix = labels.map((_, i) =>
    labels.map((__, j) => {
      if (i === j) {
        return 1;
      }

      const mapA = returnMaps[i];
      const mapB = returnMaps[j];
      const dates = Array.from(mapA.keys()).filter((date) => mapB.has(date));
      if (dates.length < 2) {
        return null;
      }

      const valuesA = dates.map((date) => mapA.get(date) as number);
      const valuesB = dates.map((date) => mapB.get(date) as number);
      return pearsonCorrelation(valuesA, valuesB);
    }),
  );

  return { labels, matrix };
}

function buildMonthlyHeatmapRows(results: BacktestResult[] | undefined): ChartRow[] {
  if (!results || results.length === 0) {
    return [];
  }

  const labels = results.map((result) => result.summary.algorithm.toUpperCase());
  const monthEndMaps = results.map((result) => {
    const map = new Map<string, number>();
    result.equityCurve.forEach((point) => {
      map.set(point.date.slice(0, 7), point.totalValue);
    });
    return map;
  });

  const monthSet = new Set<string>();
  monthEndMaps.forEach((map) => {
    map.forEach((_value, month) => {
      monthSet.add(month);
    });
  });
  const months = Array.from(monthSet).sort((a, b) => a.localeCompare(b));

  const rows = months.map((month) => ({ month } as ChartRow));
  labels.forEach((label, idx) => {
    let previousValue: number | null = null;
    months.forEach((month, monthIdx) => {
      const currentValue = monthEndMaps[idx].get(month);
      const row = rows[monthIdx];

      if (currentValue === undefined || previousValue === null || previousValue <= 0) {
        row[label] = null;
      } else {
        row[label] = currentValue / previousValue - 1;
      }

      if (currentValue !== undefined) {
        previousValue = currentValue;
      }
    });
  });

  return rows;
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

function downloadCsv(filename: string, lines: string[]): void {
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function heatmapCellColor(value: number | null): string {
  if (value === null) {
    return "transparent";
  }
  const intensity = Math.min(0.9, Math.abs(value) * 6);
  if (value >= 0) {
    return `rgba(34, 197, 94, ${0.1 + intensity})`;
  }
  return `rgba(239, 68, 68, ${0.1 + intensity})`;
}

function buildPrintableReportHtml(
  results: BacktestResult[],
  correlation: CorrelationResult,
  monthlyRows: ChartRow[],
): string {
  const summaryRows = results
    .map((result) => {
      const s = result.summary;
      return `<tr>
        <td>${s.algorithm.toUpperCase()}</td>
        <td>${formatCurrency(s.finalValue)}</td>
        <td>${formatPercent(s.totalReturn)}</td>
        <td>${formatPercent(s.annualizedReturn)}</td>
        <td>${s.sharpeRatio.toFixed(2)}</td>
        <td>${formatPercent(s.maxDrawdown)}</td>
        <td>${s.totalTrades}</td>
      </tr>`;
    })
    .join("");

  const correlationHead = correlation.labels.map((label) => `<th>${label}</th>`).join("");
  const correlationRows = correlation.labels
    .map((label, i) => {
      const values = correlation.matrix[i]
        .map((value) => `<td>${value === null ? "-" : value.toFixed(3)}</td>`)
        .join("");
      return `<tr><th>${label}</th>${values}</tr>`;
    })
    .join("");

  const heatmapLabels = correlation.labels;
  const heatmapHead = heatmapLabels.map((label) => `<th>${label}</th>`).join("");
  const heatmapRows = monthlyRows
    .map((row) => {
      const values = heatmapLabels
        .map((label) => {
          const value = row[label];
          return `<td>${typeof value === "number" ? formatPercent(value) : "-"}</td>`;
        })
        .join("");
      return `<tr><th>${String(row.month)}</th>${values}</tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Backtest Compare Report</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
      h1, h2 { margin: 0 0 12px; }
      h2 { margin-top: 28px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: right; }
      th:first-child, td:first-child { text-align: left; }
      .meta { color: #4b5563; margin-bottom: 8px; }
    </style>
  </head>
  <body>
    <h1>Backtest Compare Report</h1>
    <div class="meta">Generated at: ${new Date().toISOString()}</div>

    <h2>Summary</h2>
    <table>
      <thead>
        <tr><th>Algorithm</th><th>Final Value</th><th>Total Return</th><th>Annualized</th><th>Sharpe</th><th>Max Drawdown</th><th>Trades</th></tr>
      </thead>
      <tbody>${summaryRows}</tbody>
    </table>

    <h2>Correlation Matrix (Daily Returns)</h2>
    <table>
      <thead><tr><th>Algorithm</th>${correlationHead}</tr></thead>
      <tbody>${correlationRows}</tbody>
    </table>

    <h2>Monthly Returns</h2>
    <table>
      <thead><tr><th>Month</th>${heatmapHead}</tr></thead>
      <tbody>${heatmapRows}</tbody>
    </table>
  </body>
</html>`;
}

export default function ComparePage() {
  const { data: algorithms = [] } = useBacktestAlgorithms();
  const [userId, setUserId] = useState<string>(getBacktestUserId());
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

    setBacktestUserId(userId);
    mutation.mutate({ selectedAlgorithms: selected, baseConfig });
  };

  const comparisonChartData = useMemo(
    () => buildChartData(mutation.data, (point) => point.totalValue),
    [mutation.data],
  );
  const drawdownChartData = useMemo(
    () => buildChartData(mutation.data, (point) => point.drawdown),
    [mutation.data],
  );
  const correlation = useMemo(
    () => buildCorrelationResult(mutation.data),
    [mutation.data],
  );
  const monthlyRows = useMemo(
    () => buildMonthlyHeatmapRows(mutation.data),
    [mutation.data],
  );

  const onExportCsv = () => {
    if (!mutation.data || mutation.data.length === 0) return;

    const lines: string[] = [];
    lines.push("Backtest Compare Summary");
    lines.push("Algorithm,Final Value,Total Return,Annualized Return,Sharpe,Volatility,Max Drawdown,Trades,Win Rate");
    mutation.data.forEach((result) => {
      const s = result.summary;
      lines.push(
        [
          s.algorithm.toUpperCase(),
          s.finalValue.toFixed(2),
          s.totalReturn.toFixed(6),
          s.annualizedReturn.toFixed(6),
          s.sharpeRatio.toFixed(6),
          s.volatility.toFixed(6),
          s.maxDrawdown.toFixed(6),
          String(s.totalTrades),
          s.winRate.toFixed(6),
        ]
          .map(csvEscape)
          .join(","),
      );
    });

    lines.push("");
    lines.push("Correlation Matrix (Daily Returns)");
    lines.push(["Algorithm", ...correlation.labels].map(csvEscape).join(","));
    correlation.labels.forEach((label, rowIdx) => {
      const values = correlation.matrix[rowIdx].map((value) =>
        value === null ? "-" : value.toFixed(6),
      );
      lines.push([label, ...values].map(csvEscape).join(","));
    });

    lines.push("");
    lines.push("Monthly Returns");
    lines.push(["Month", ...correlation.labels].map(csvEscape).join(","));
    monthlyRows.forEach((row) => {
      const values = correlation.labels.map((label) => {
        const value = row[label];
        return typeof value === "number" ? value.toFixed(6) : "-";
      });
      lines.push([String(row.month), ...values].map(csvEscape).join(","));
    });

    downloadCsv(
      `backtest-compare-${new Date().toISOString().slice(0, 10)}.csv`,
      lines,
    );
  };

  const onExportPdf = () => {
    if (!mutation.data || mutation.data.length === 0) return;
    const reportHtml = buildPrintableReportHtml(
      mutation.data,
      correlation,
      monthlyRows,
    );

    const child = window.open("", "_blank", "noopener,noreferrer");
    if (!child) {
      return;
    }
    child.document.write(reportHtml);
    child.document.close();
    child.focus();
    setTimeout(() => {
      child.print();
    }, 300);
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Algorithm Compare</h1>
            <p className="text-sm text-muted-foreground">
              Run multiple market algorithms and compare backtest outcomes.
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
              <span>User ID</span>
              <input
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="demo-user"
              />
            </label>
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
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium">Equity Curves</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary/60"
                    onClick={onExportCsv}
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    className="text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary/60"
                    onClick={onExportPdf}
                  >
                    Export PDF
                  </button>
                </div>
              </div>
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
                        }).format(Number(value))
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

            <section className="rounded-xl border border-border p-3 bg-card">
              <h2 className="text-sm font-medium mb-2">Drawdown Curves</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={drawdownChartData} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="date" minTickGap={28} />
                    <YAxis tickFormatter={(value) => formatPercent(Number(value))} />
                    <Tooltip
                      formatter={(value: number) => formatPercent(Number(value))}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    {mutation.data.map((result, idx) => (
                      <Line
                        key={`drawdown-${result.id}`}
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

            <section className="rounded-xl border border-border p-3 bg-card overflow-x-auto">
              <h2 className="text-sm font-medium mb-2">Correlation Matrix (Daily Returns)</h2>
              <table className="w-full text-sm min-w-[520px]">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 pr-2">Algorithm</th>
                    {correlation.labels.map((label) => (
                      <th key={`corr-head-${label}`} className="text-right py-2 pr-2">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlation.labels.map((rowLabel, rowIdx) => (
                    <tr key={`corr-row-${rowLabel}`} className="border-b border-border/40">
                      <td className="py-2 pr-2 font-medium">{rowLabel}</td>
                      {correlation.matrix[rowIdx].map((value, colIdx) => (
                        <td
                          key={`corr-${rowIdx}-${colIdx}`}
                          className={`py-2 pr-2 text-right ${metricClass(value)}`}
                        >
                          {value === null ? "-" : value.toFixed(3)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-xl border border-border p-3 bg-card overflow-x-auto">
              <h2 className="text-sm font-medium mb-2">Monthly Return Heatmap</h2>
              <table className="w-full text-sm min-w-[640px]">
                <thead className="text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 pr-2">Month</th>
                    {correlation.labels.map((label) => (
                      <th key={`month-head-${label}`} className="text-right py-2 pr-2">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map((row) => (
                    <tr key={`month-${String(row.month)}`} className="border-b border-border/40">
                      <td className="py-2 pr-2 font-medium">{String(row.month)}</td>
                      {correlation.labels.map((label) => {
                        const value = row[label];
                        return (
                          <td
                            key={`month-${String(row.month)}-${label}`}
                            className={`py-2 pr-2 text-right ${metricClass(
                              typeof value === "number" ? value : null,
                            )}`}
                            style={{
                              backgroundColor: heatmapCellColor(
                                typeof value === "number" ? value : null,
                              ),
                            }}
                          >
                            {formatPercentNullable(typeof value === "number" ? value : null)}
                          </td>
                        );
                      })}
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
