import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  getBacktestUserId,
  runBacktestRequest,
  setBacktestUserId,
  useBacktestAlgorithms,
} from "@/lib/stockApi";
import { type BacktestAlgorithm, type BacktestConfig } from "@shared/backtest";
import { useI18n } from "@/lib/i18n";
import { backtestTerms, backtestUi, bt } from "@/lib/backtestUi";
import { TermInfoLabel } from "@/components/TermInfoLabel";
import { BacktestQuickLinks } from "@/components/BacktestQuickLinks";

function getDefaultDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export default function BacktestCenter() {
  const [, setLocation] = useLocation();
  const { data: algorithms = [], isLoading } = useBacktestAlgorithms();
  const { lang, setLang } = useI18n();

  const [algorithm, setAlgorithm] = useState<BacktestAlgorithm>("us");
  const [userId, setUserId] = useState<string>(getBacktestUserId());
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
    if (algorithms.length > 0 && !algorithms.includes(algorithm)) {
      setAlgorithm(algorithms[0]);
    }
  }, [algorithms, algorithm]);

  const mutation = useMutation({
    mutationFn: runBacktestRequest,
    onSuccess: (result) => {
      setLocation(`/backtest/${result.id}/results`);
    },
  });

  const canSubmit = useMemo(() => {
    return algorithms.length > 0 && startDate.length > 0 && endDate.length > 0;
  }, [algorithms.length, startDate, endDate]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const config: BacktestConfig = {
      algorithm,
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
    mutation.mutate(config);
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{bt(backtestUi.center.title, lang)}</h1>
              <p className="text-sm text-muted-foreground">
                {bt(backtestUi.center.subtitle, lang)}
              </p>
            </div>
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="self-start px-2 py-1 rounded-full border border-border text-[10px] font-mono font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              data-testid="backtest-lang-toggle"
            >
              {lang === "en" ? "EN" : "中"}
            </button>
          </div>
          <BacktestQuickLinks lang={lang} />
        </header>

        <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-border p-4 bg-card">
          <div className="grid gap-2 sm:grid-cols-2">
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
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as BacktestAlgorithm)}
                disabled={isLoading || algorithms.length === 0}
              >
                {algorithms.map((item) => (
                  <option key={item} value={item}>
                    {item.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm grid gap-1">
              <TermInfoLabel
                label={backtestTerms.rebalance.label[lang]}
                description={backtestTerms.rebalance.description[lang]}
              />
              <select
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={rebalanceFrequency}
                onChange={(e) =>
                  setRebalanceFrequency(e.target.value as "daily" | "weekly" | "monthly")
                }
              >
                <option value="daily">{bt(backtestUi.center.daily, lang)}</option>
                <option value="weekly">{bt(backtestUi.center.weekly, lang)}</option>
                <option value="monthly">{bt(backtestUi.center.monthly, lang)}</option>
              </select>
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm grid gap-1">
              <span>{bt(backtestUi.center.startDate, lang)}</span>
              <input
                type="date"
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="text-sm grid gap-1">
              <span>{bt(backtestUi.center.endDate, lang)}</span>
              <input
                type="date"
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            <label className="text-sm grid gap-1">
              <span>{bt(backtestUi.center.initialCash, lang)}</span>
              <input
                type="number"
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={initialCash}
                onChange={(e) => setInitialCash(e.target.value)}
                min={1000}
                step={1000}
              />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm grid gap-1">
              <span>{bt(backtestUi.center.maxPositionPerStock, lang)}</span>
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
              <span>{bt(backtestUi.center.maxTotalPositions, lang)}</span>
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
              <TermInfoLabel
                label={backtestTerms.cashReserve.label[lang]}
                description={backtestTerms.cashReserve.description[lang]}
              />
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
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm grid gap-1">
              <TermInfoLabel
                label={backtestTerms.commissionBps.label[lang]}
                description={backtestTerms.commissionBps.description[lang]}
              />
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
              <TermInfoLabel
                label={backtestTerms.slippageBps.label[lang]}
                description={backtestTerms.slippageBps.description[lang]}
              />
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
              <span>{bt(backtestUi.center.minCommission, lang)}</span>
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
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending
              ? bt(backtestUi.center.running, lang)
              : bt(backtestUi.center.run, lang)}
          </button>
        </form>
      </div>
    </main>
  );
}


