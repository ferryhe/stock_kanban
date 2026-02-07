import { Link } from "wouter";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useBacktestResult } from "@/lib/stockApi";

type BacktestResultsPageProps = {
  params?: {
    id?: string;
  };
};

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

function metricClass(value: number): string {
  return value >= 0 ? "text-positive" : "text-negative";
}

export default function BacktestResultsPage({ params }: BacktestResultsPageProps) {
  const id = params?.id ?? "";
  const { data: result, isLoading, error } = useBacktestResult(id, id.length > 0);

  if (isLoading) {
    return <main className="min-h-screen bg-background text-foreground p-6">Loading backtest...</main>;
  }

  if (error || !result) {
    return (
      <main className="min-h-screen bg-background text-foreground p-6 space-y-4">
        <p className="text-negative">Failed to load backtest result.</p>
        <Link href="/backtest" className="text-sm px-3 py-2 rounded-md border border-border">
          Back to Backtest Center
        </Link>
      </main>
    );
  }

  const summary = result.summary;

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Backtest Results</h1>
            <p className="text-sm text-muted-foreground">
              {summary.algorithm.toUpperCase()} | {summary.startDate} to {summary.endDate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/compare" className="text-xs px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80">
              Compare
            </Link>
            <Link href="/backtest" className="text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary/60">
              New Backtest
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Final Value</p>
            <p className="text-xl font-semibold">{formatCurrency(summary.finalValue)}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Total Return</p>
            <p className={`text-xl font-semibold ${metricClass(summary.totalReturn)}`}>
              {formatPercent(summary.totalReturn)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Annualized Return</p>
            <p className={`text-xl font-semibold ${metricClass(summary.annualizedReturn)}`}>
              {formatPercent(summary.annualizedReturn)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Max Drawdown</p>
            <p className="text-xl font-semibold text-negative">{formatPercent(summary.maxDrawdown)}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
            <p className="text-xl font-semibold">{summary.sharpeRatio.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Volatility</p>
            <p className="text-xl font-semibold">{formatPercent(summary.volatility)}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Total Trades</p>
            <p className="text-xl font-semibold">{summary.totalTrades}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="text-xl font-semibold">{formatPercent(summary.winRate)}</p>
          </div>
        </section>

        <section className="rounded-xl border border-border p-3 bg-card">
          <h2 className="text-sm font-medium mb-2">Equity Curve</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.equityCurve} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
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
                <Line type="monotone" dataKey="totalValue" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-border p-3 bg-card">
          <h2 className="text-sm font-medium mb-2">Trades</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-2">Date</th>
                  <th className="text-left py-2 pr-2">Ticker</th>
                  <th className="text-left py-2 pr-2">Side</th>
                  <th className="text-right py-2 pr-2">Shares</th>
                  <th className="text-right py-2 pr-2">Price</th>
                  <th className="text-right py-2 pr-2">Notional</th>
                  <th className="text-right py-2">Commission</th>
                </tr>
              </thead>
              <tbody>
                {result.trades.slice().reverse().slice(0, 120).map((trade, idx) => (
                  <tr key={`${trade.date}-${trade.ticker}-${idx}`} className="border-b border-border/40">
                    <td className="py-2 pr-2">{trade.date}</td>
                    <td className="py-2 pr-2">{trade.ticker}</td>
                    <td className={`py-2 pr-2 ${trade.side === "BUY" ? "text-positive" : "text-negative"}`}>
                      {trade.side}
                    </td>
                    <td className="py-2 pr-2 text-right">{trade.shares}</td>
                    <td className="py-2 pr-2 text-right">{formatCurrency(trade.price)}</td>
                    <td className="py-2 pr-2 text-right">{formatCurrency(trade.notional)}</td>
                    <td className="py-2 text-right">{formatCurrency(trade.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
