export class TechnicalIndicators {
  static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  static calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const slice = prices.slice(-period);
    return slice.reduce((a: number, b: number) => a + b, 0) / period;
  }

  static calculateEMA(prices: number[], period: number): number[] {
    if (prices.length < period) return [];
    const k = 2 / (period + 1);
    const emaValues: number[] = [];
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    emaValues.push(ema);
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
      emaValues.push(ema);
    }
    return emaValues;
  }

  static calculateMACD(prices: number[]): { macd: number; signal: number } {
    const ema12 = TechnicalIndicators.calculateEMA(prices, 12);
    const ema26 = TechnicalIndicators.calculateEMA(prices, 26);
    if (ema12.length === 0 || ema26.length === 0) return { macd: 0, signal: 0 };

    const macdLine: number[] = [];
    const offset = ema12.length - ema26.length;
    for (let i = 0; i < ema26.length; i++) {
      macdLine.push(ema12[i + offset] - ema26[i]);
    }

    const signalLine = TechnicalIndicators.calculateEMA(macdLine, 9);
    return {
      macd: macdLine[macdLine.length - 1] || 0,
      signal: signalLine[signalLine.length - 1] || 0,
    };
  }

  static calculateBollingerBands(
    prices: number[],
    period: number = 20,
  ): { upper: number; lower: number } {
    if (prices.length < period) return { upper: 0, lower: 0 };
    const slice = prices.slice(-period);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance =
      slice.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    return {
      upper: sma + 2 * stdDev,
      lower: sma - 2 * stdDev,
    };
  }
}
