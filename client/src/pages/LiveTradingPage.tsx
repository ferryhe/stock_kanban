import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStrategyAccountId,
  runLiveSettlementNowRequest,
  runLiveTradingRequest,
  setStrategyAccountId,
  useBacktestAlgorithms,
  useLivePortfolio,
} from "@/lib/stockApi";
import { type BacktestAlgorithm } from "@shared/backtest";
import { useI18n } from "@/lib/i18n";
import { backtestTerms, backtestUi, bt } from "@/lib/backtestUi";
import { TermInfoLabel } from "@/components/TermInfoLabel";
import { BacktestQuickLinks } from "@/components/BacktestQuickLinks";

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

function formatTime(value: string, lang: "en" | "zh"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
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

export default function LiveTradingPage() {
  const queryClient = useQueryClient();
  const { data: algorithms = [] } = useBacktestAlgorithms();
  const { lang, setLang } = useI18n();

  const [algorithm, setAlgorithm] = useState<BacktestAlgorithm>("us");
  const [accountId, setAccountId] = useState<string>(getStrategyAccountId());
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
      queryKey: ["live", "portfolio", getStrategyAccountId(), activeAlgorithm],
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

  const onApplyStrategyAccountId = (event: FormEvent) => {
    event.preventDefault();
    setStrategyAccountId(accountId);
    invalidateLive();
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{bt(backtestUi.live.title, lang)}</h1>
              <p className="text-sm text-muted-foreground">
                {bt(backtestUi.live.subtitle, lang)}
              </p>
            </div>
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="self-start px-2 py-1 rounded-full border border-border text-[10px] font-mono font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              data-testid="live-lang-toggle"
            >
              {lang === "en" ? "EN" : "中"}
            </button>
          </div>
          <BacktestQuickLinks lang={lang} />
        </header>

        <form
          onSubmit={onApplyStrategyAccountId}
          className="grid gap-3 rounded-xl border border-border p-4 bg-card sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="text-sm grid gap-1">
            <span>{bt(backtestUi.center.strategyAccountId, lang)}</span>
            <input
              className="h-10 px-3 rounded-md bg-background border border-input"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="demo-user"
            />
          </label>

          <label className="text-sm grid gap-1">
            <span>{bt(backtestUi.center.algorithm, lang)}</span>
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
            <TermInfoLabel
              label={bt(backtestUi.live.actions, lang)}
              description={backtestTerms.paperSettlement.description[lang]}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="h-10 px-3 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60"
                disabled={runMutation.isPending}
                onClick={() => runMutation.mutate(activeAlgorithm)}
              >
                {runMutation.isPending
                  ? bt(backtestUi.live.runningNow, lang)
                  : bt(backtestUi.live.runNow, lang)}
              </button>
              <button
                type="button"
                className="h-10 px-3 rounded-md border border-border hover:bg-secondary/60 disabled:opacity-60"
                disabled={settleMutation.isPending}
                onClick={() => settleMutation.mutate()}
              >
                {settleMutation.isPending
                  ? bt(backtestUi.live.settlingNow, lang)
                  : bt(backtestUi.live.settleNow, lang)}
              </button>
            </div>
          </div>

          <div className="text-sm grid gap-1">
            <span>{bt(backtestUi.live.scope, lang)}</span>
            <button
              type="submit"
              className="h-10 rounded-md border border-border hover:bg-secondary/60"
            >
              {bt(backtestUi.live.applyStrategyAccountId, lang)}
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

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">{bt(backtestUi.live.totalValue, lang)}</p>
            <p className="text-xl font-semibold">
              {snapshot ? formatCurrency(snapshot.totalValue) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">{bt(backtestUi.live.cash, lang)}</p>
            <p className="text-xl font-semibold">
              {snapshot ? formatCurrency(snapshot.cash) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">{bt(backtestUi.live.holdingsValue, lang)}</p>
            <p className="text-xl font-semibold">
              {snapshot ? formatCurrency(snapshot.holdingsValue) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">
              <TermInfoLabel
                label={backtestTerms.dailyReturn.label[lang]}
                description={backtestTerms.dailyReturn.description[lang]}
              />
            </p>
            <p className={`text-xl font-semibold ${metricClass(snapshot?.dailyReturn ?? null)}`}>
              {snapshot ? formatPercent(snapshot.dailyReturn) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">
              <TermInfoLabel
                label={backtestTerms.cumulativeReturn.label[lang]}
                description={backtestTerms.cumulativeReturn.description[lang]}
              />
            </p>
            <p className={`text-xl font-semibold ${metricClass(snapshot?.cumulativeReturn ?? null)}`}>
              {snapshot ? formatPercent(snapshot.cumulativeReturn) : "-"}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-border p-3 bg-card space-y-3">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {bt(backtestUi.live.holdings, lang)} ({snapshot?.holdings.length ?? 0}) | {" "}
              {bt(backtestUi.live.recentTrades, lang)} ({snapshot?.recentTrades.length ?? 0})
            </span>
            <span>
              {bt(backtestUi.live.updated, lang)}: {snapshot ? formatTime(snapshot.updatedAt, lang) : "-"}
              {isFetching ? ` | ${bt(backtestUi.live.refreshing, lang)}` : ""}
              {isLoading ? ` | ${bt(backtestUi.live.loading, lang)}` : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-2">{bt(backtestUi.live.ticker, lang)}</th>
                  <th className="text-right py-2 pr-2">{bt(backtestUi.live.quantity, lang)}</th>
                  <th className="text-right py-2 pr-2">{bt(backtestUi.live.avgCost, lang)}</th>
                  <th className="text-right py-2 pr-2">{bt(backtestUi.live.price, lang)}</th>
                  <th className="text-right py-2 pr-2">{bt(backtestUi.live.marketValue, lang)}</th>
                  <th className="text-right py-2">
                    <TermInfoLabel
                      label={backtestTerms.unrealizedPnl.label[lang]}
                      description={backtestTerms.unrealizedPnl.description[lang]}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {!snapshot || snapshot.holdings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      {bt(backtestUi.live.noHoldings, lang)}
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
          <p className="text-sm font-medium">{bt(backtestUi.live.recentTrades, lang)}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-2">{bt(backtestUi.live.time, lang)}</th>
                  <th className="text-left py-2 pr-2">{bt(backtestUi.live.ticker, lang)}</th>
                  <th className="text-left py-2 pr-2">{bt(backtestUi.live.side, lang)}</th>
                  <th className="text-right py-2 pr-2">{bt(backtestUi.live.quantity, lang)}</th>
                  <th className="text-right py-2 pr-2">{bt(backtestUi.live.price, lang)}</th>
                  <th className="text-right py-2 pr-2">{bt(backtestUi.live.amount, lang)}</th>
                  <th className="text-right py-2">{bt(backtestUi.live.commission, lang)}</th>
                </tr>
              </thead>
              <tbody>
                {!snapshot || snapshot.recentTrades.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      {bt(backtestUi.live.noTrades, lang)}
                    </td>
                  </tr>
                ) : (
                  snapshot.recentTrades.map((row) => (
                    <tr key={row.id} className="border-b border-border/40">
                      <td className="py-2 pr-2 whitespace-nowrap">{formatTime(row.executedAt, lang)}</td>
                      <td className="py-2 pr-2">{row.ticker}</td>
                      <td className={`py-2 pr-2 ${row.side === "BUY" ? "text-positive" : "text-negative"}`}>
                        {row.side === "BUY"
                          ? bt(backtestUi.live.buy, lang)
                          : row.side === "SELL"
                            ? bt(backtestUi.live.sell, lang)
                            : row.side}
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
