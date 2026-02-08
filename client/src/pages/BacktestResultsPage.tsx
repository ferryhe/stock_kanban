import { Link } from "wouter";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useBacktestResult } from "@/lib/stockApi";
import { useI18n } from "@/lib/i18n";
import { backtestTerms, backtestUi, bt } from "@/lib/backtestUi";
import { TermInfoLabel } from "@/components/TermInfoLabel";
import { BacktestQuickLinks } from "@/components/BacktestQuickLinks";

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
  const { lang, setLang, t } = useI18n();

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground p-6">
        {bt(backtestUi.results.loading, lang)}
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="min-h-screen bg-background text-foreground p-6 space-y-4">
        <p className="text-negative">{bt(backtestUi.results.loadFailed, lang)}</p>
        <Link href="/backtest" className="text-sm px-3 py-2 rounded-md border border-border">
          {bt(backtestUi.results.backToCenter, lang)}
        </Link>
      </main>
    );
  }

  const summary = result.summary;

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{bt(backtestUi.results.title, lang)}</h1>
              <p className="text-sm text-muted-foreground">
                {summary.algorithm.toUpperCase()} | {summary.startDate} to {summary.endDate}
              </p>
            </div>
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="self-start px-2 py-1 rounded-full border border-border text-[10px] font-mono font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              data-testid="backtest-results-lang-toggle"
            >
              {t("langToggle")}
            </button>
          </div>
          <BacktestQuickLinks lang={lang} />
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">{bt(backtestUi.results.finalValue, lang)}</p>
            <p className="text-xl font-semibold">{formatCurrency(summary.finalValue)}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">{bt(backtestUi.results.totalReturn, lang)}</p>
            <p className={`text-xl font-semibold ${metricClass(summary.totalReturn)}`}>
              {formatPercent(summary.totalReturn)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">
              <TermInfoLabel
                label={backtestTerms.annualizedReturn.label[lang]}
                description={backtestTerms.annualizedReturn.description[lang]}
              />
            </p>
            <p className={`text-xl font-semibold ${metricClass(summary.annualizedReturn)}`}>
              {formatPercent(summary.annualizedReturn)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">
              <TermInfoLabel
                label={backtestTerms.maxDrawdown.label[lang]}
                description={backtestTerms.maxDrawdown.description[lang]}
              />
            </p>
            <p className="text-xl font-semibold text-negative">{formatPercent(summary.maxDrawdown)}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">
              <TermInfoLabel
                label={backtestTerms.sharpeRatio.label[lang]}
                description={backtestTerms.sharpeRatio.description[lang]}
              />
            </p>
            <p className="text-xl font-semibold">{summary.sharpeRatio.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">
              <TermInfoLabel
                label={backtestTerms.volatility.label[lang]}
                description={backtestTerms.volatility.description[lang]}
              />
            </p>
            <p className="text-xl font-semibold">{formatPercent(summary.volatility)}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">{bt(backtestUi.results.totalTrades, lang)}</p>
            <p className="text-xl font-semibold">{summary.totalTrades}</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">
              <TermInfoLabel
                label={backtestTerms.winRate.label[lang]}
                description={backtestTerms.winRate.description[lang]}
              />
            </p>
            <p className="text-xl font-semibold">{formatPercent(summary.winRate)}</p>
          </div>
        </section>

        <section className="rounded-xl border border-border p-3 bg-card">
          <h2 className="text-sm font-medium mb-2">{bt(backtestUi.results.equityCurve, lang)}</h2>
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
          <h2 className="text-sm font-medium mb-2">{bt(backtestUi.results.trades, lang)}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-2">{lang === "en" ? "Date" : "日期"}</th>
                    <th className="text-left py-2 pr-2">{lang === "en" ? "Ticker" : "代码"}</th>
                    <th className="text-left py-2 pr-2">{lang === "en" ? "Side" : "方向"}</th>
                    <th className="text-right py-2 pr-2">{lang === "en" ? "Shares" : "股数"}</th>
                    <th className="text-right py-2 pr-2">{lang === "en" ? "Price" : "价格"}</th>
                    <th className="text-right py-2 pr-2">{lang === "en" ? "Notional" : "成交额"}</th>
                    <th className="text-right py-2">
                      <TermInfoLabel
                        label={backtestTerms.commissionBps.label[lang]}
                        description={backtestTerms.commissionBps.description[lang]}
                      />
                    </th>
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
