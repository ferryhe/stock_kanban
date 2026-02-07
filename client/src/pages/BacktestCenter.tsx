import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  runBacktestRequest,
  useBacktestAlgorithms,
} from "@/lib/stockApi";
import { type BacktestAlgorithm, type BacktestConfig } from "@shared/backtest";

function getDefaultDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export default function BacktestCenter() {
  const [, setLocation] = useLocation();
  const { data: algorithms = [], isLoading } = useBacktestAlgorithms();

  const [algorithm, setAlgorithm] = useState<BacktestAlgorithm>("us");
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

    mutation.mutate(config);
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Backtest Center</h1>
            <p className="text-sm text-muted-foreground">
              Configure and run a single-algorithm backtest from quant snapshot signals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/compare" className="text-xs px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80">
              Compare
            </Link>
            <Link href="/" className="text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary/60">
              Dashboard
            </Link>
          </div>
        </header>

        <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-border p-4 bg-card">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm grid gap-1">
              <span>Algorithm</span>
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
              <span>Rebalance</span>
              <select
                className="h-10 px-3 rounded-md bg-background border border-input"
                value={rebalanceFrequency}
                onChange={(e) =>
                  setRebalanceFrequency(e.target.value as "daily" | "weekly" | "monthly")
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
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
                min={1000}
                step={1000}
              />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm grid gap-1">
              <span>Max Position Per Stock</span>
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
              <span>Max Total Positions</span>
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
              <span>Min Cash Reserve</span>
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
              <span>Commission (bps)</span>
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
              <span>Slippage (bps)</span>
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
              <span>Min Commission</span>
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
            {mutation.isPending ? "Running Backtest..." : "Run Backtest"}
          </button>
        </form>
      </div>
    </main>
  );
}

