import * as fs from "fs";
import { promises as fsPromises } from "fs";
import * as path from "path";
import { type BacktestAlgorithm } from "../../shared/backtest";

export type SignalAction = "BUY" | "SELL" | "HOLD" | "RISK_ALERT";

export interface SignalSnapshotEntry {
  ticker: string;
  signal: SignalAction;
  predictedReturn: number | null;
  rank: number | null;
  score: number | null;
  risk?: {
    vol60?: number | null;
    maxdd252?: number | null;
  };
}

export interface SignalSnapshot {
  algorithm: BacktestAlgorithm;
  sourceFile: string;
  generatedAtUtc?: string;
  dataDate?: string;
  configFile?: string;
  entries: SignalSnapshotEntry[];
}

type RawMetricsItem = {
  ticker?: unknown;
  signal?: unknown;
  predictedReturn?: unknown;
  rank?: unknown;
  score?: unknown;
  risk?: {
    vol60?: unknown;
    maxdd252?: unknown;
  };
};

type RawMetricsFile = {
  metadata?: {
    generated_at_utc?: unknown;
    data_date?: unknown;
    config_file?: unknown;
  };
  data?: unknown;
};

const METRICS_FILES: Record<BacktestAlgorithm, string> = {
  us: "quant-metrics-us.json",
  cn: "quant-metrics-cn.json",
  hk: "quant-metrics-hk.json",
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeSignal(signal: unknown): SignalAction {
  if (typeof signal !== "string") return "HOLD";
  const upper = signal.toUpperCase();
  if (upper === "BUY" || upper === "LONG") return "BUY";
  if (upper === "SELL" || upper === "SHORT") return "SELL";
  if (upper === "RISK_ALERT") return "RISK_ALERT";
  return "HOLD";
}

function getDefaultExternalKanbanDirs(): string[] {
  const dirs = [
    path.resolve(process.cwd(), "..", "stock_quant_work", "outputs", "kanban"),
  ];

  if (process.platform === "win32") {
    dirs.push("C:\\Projects\\stock_quant_work\\outputs\\kanban");
  }

  return dirs;
}

function resolveSignalFile(algorithm: BacktestAlgorithm): string | null {
  const fileName = METRICS_FILES[algorithm];
  const localCandidate = path.join(process.cwd(), "data", fileName);
  if (fs.existsSync(localCandidate)) {
    return localCandidate;
  }

  const envDir = process.env.STOCK_QUANT_KANBAN_DIR;
  const externalDirs = envDir ? [envDir] : getDefaultExternalKanbanDirs();
  for (const dir of externalDirs) {
    const candidate = path.join(dir, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function parseEntries(raw: unknown): SignalSnapshotEntry[] {
  const inputArray: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as RawMetricsFile).data)
      ? ((raw as RawMetricsFile).data as unknown[])
      : [];

  return inputArray
    .map((item): SignalSnapshotEntry | null => {
      const row = item as RawMetricsItem;
      if (typeof row?.ticker !== "string" || !row.ticker.trim()) {
        return null;
      }

      return {
        ticker: row.ticker.toUpperCase(),
        signal: normalizeSignal(row.signal),
        predictedReturn: toFiniteNumber(row.predictedReturn),
        rank: toFiniteNumber(row.rank),
        score: toFiniteNumber(row.score),
        risk:
          row.risk && typeof row.risk === "object"
            ? {
                vol60: toFiniteNumber(row.risk.vol60),
                maxdd252: toFiniteNumber(row.risk.maxdd252),
              }
            : undefined,
      };
    })
    .filter((row): row is SignalSnapshotEntry => row !== null);
}

export function getAvailableBacktestAlgorithms(): BacktestAlgorithm[] {
  const all = Object.keys(METRICS_FILES) as BacktestAlgorithm[];
  return all.filter((algo) => resolveSignalFile(algo) !== null);
}

export async function loadSignalSnapshot(
  algorithm: BacktestAlgorithm,
): Promise<SignalSnapshot> {
  const sourceFile = resolveSignalFile(algorithm);
  if (!sourceFile) {
    throw new Error(`Signal file not found for algorithm: ${algorithm}`);
  }

  const rawText = await fsPromises.readFile(sourceFile, "utf-8");
  const parsed = JSON.parse(rawText) as unknown;

  const metadata =
    parsed && typeof parsed === "object" && "metadata" in parsed
      ? (parsed as RawMetricsFile).metadata
      : undefined;

  const entries = parseEntries(parsed);
  if (entries.length === 0) {
    throw new Error(`No valid signal entries found in ${sourceFile}`);
  }

  return {
    algorithm,
    sourceFile,
    generatedAtUtc:
      typeof metadata?.generated_at_utc === "string"
        ? metadata.generated_at_utc
        : undefined,
    dataDate: typeof metadata?.data_date === "string" ? metadata.data_date : undefined,
    configFile:
      typeof metadata?.config_file === "string" ? metadata.config_file : undefined,
    entries,
  };
}
