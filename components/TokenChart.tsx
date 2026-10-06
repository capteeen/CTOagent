'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  PriceScaleMode,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import { buildCandles, candleInterval, type Candle } from '@/lib/candles';
import { usd } from '@/lib/format';
import { SUPPLY } from '@/lib/sim';
import type { Action, Token } from '@/lib/types';

const css = (name: string, a = 1) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim().split(/\s+/).join(',');
  return a === 1 ? `rgb(${v})` : `rgba(${v},${a})`;
};

function theme() {
  return {
    layout: { background: { type: ColorType.Solid, color: css('bg') }, textColor: css('muted'), fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace', fontSize: 11, attributionLogo: false },
    grid: { vertLines: { color: css('line', 0.6) }, horzLines: { color: css('line', 0.6) } },
    rightPriceScale: { borderColor: css('line'), mode: PriceScaleMode.Logarithmic },
    timeScale: { borderColor: css('line'), timeVisible: true, secondsVisible: false },
    crosshair: { vertLine: { color: css('muted', 0.5), labelBackgroundColor: css('fg') }, horzLine: { color: css('muted', 0.5), labelBackgroundColor: css('fg') } },
  };
}

const toMcap = (c: Candle): Candle => ({ ...c, open: c.open * SUPPLY, high: c.high * SUPPLY, low: c.low * SUPPLY, close: c.close * SUPPLY });

export function TokenChart({ token, actions, now }: { token: Token; actions: Action[]; now: number }) {
  const el = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersRef = useRef<ReturnType<typeof createSeriesMarkers<Time>> | null>(null);
  const lastRef = useRef<Candle | null>(null);
  const [lineX, setLineX] = useState<number | null>(null);
  const takeoverRef = useRef<number | undefined>(token.takeoverAt);
  const step = candleInterval(token, now);
  const bucket = (ms: number) => Math.floor(ms / step) * step;

  // build once per token (and when a takeover happens)
  useEffect(() => {
    if (!el.current) return;
    const chart = createChart(el.current, { autoSize: true, ...theme(), localization: { priceFormatter: (p: number) => usd(p, 1) } });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: css('accent'), downColor: css('loss'), wickUpColor: css('accent'), wickDownColor: css('loss'), borderVisible: false,
      priceFormat: { type: 'custom', formatter: (p: number) => usd(p, 1), minMove: 0.01 },
    });
    const candles = buildCandles(token, actions, now).map(toMcap);
    series.setData(candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })));
    lastRef.current = candles[candles.length - 1] ?? null;
    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = createSeriesMarkers(series, []);
    chart.timeScale().fitContent();

    const place = () => {
      const t = takeoverRef.current;
      if (!t) return setLineX(null);
      const x = chart.timeScale().timeToCoordinate((bucket(t) / 1000) as UTCTimestamp);
      setLineX(x);
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(place);
    const ro = new ResizeObserver(() => requestAnimationFrame(place));
    ro.observe(el.current);
    requestAnimationFrame(place);

    const mo = new MutationObserver(() => {
      chart.applyOptions(theme());
      series.applyOptions({ upColor: css('accent'), downColor: css('loss'), wickUpColor: css('accent'), wickDownColor: css('loss') });
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      mo.disconnect();
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token.ca, Boolean(token.takeoverAt)]);

  // trade markers
  useEffect(() => {
    takeoverRef.current = token.takeoverAt;
    const trades = actions.filter((a) => a.price && ['takeover', 'buy', 'sell', 'abandon'].includes(a.kind)).slice().reverse();
    const ms: SeriesMarker<Time>[] = trades.map((a) => {
      const buy = a.kind === 'takeover' || a.kind === 'buy';
      return {
        time: (bucket(a.at) / 1000) as UTCTimestamp,
        position: buy ? 'belowBar' : 'aboveBar',
        shape: buy ? 'arrowUp' : 'arrowDown',
        color: a.kind === 'abandon' ? css('muted') : buy ? css('accent') : css('gain'),
        text: a.kind === 'takeover' ? 'CTO' : a.kind === 'buy' ? 'dip' : a.kind === 'sell' ? 'sell' : 'exit',
      };
    });
    markersRef.current?.setMarkers(ms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, token.takeoverAt]);

  // live tick: extend or update the last candle
  useEffect(() => {
    const s = seriesRef.current;
    const last = lastRef.current;
    if (!s || !last) return;
    const mc = token.price * SUPPLY;
    const tb = bucket(now) / 1000;
    let next: Candle;
    if (tb > last.time) next = { time: tb, open: last.close, high: Math.max(last.close, mc), low: Math.min(last.close, mc), close: mc };
    else next = { ...last, high: Math.max(last.high, mc), low: Math.min(last.low, mc), close: mc };
    lastRef.current = next;
    s.update({ ...next, time: next.time as UTCTimestamp });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, token.price]);

  return (
    <div className="relative h-[360px] w-full md:h-[420px]">
      <div ref={el} className="absolute inset-0" />
      {lineX != null && lineX >= 0 && (
        <div className="pointer-events-none absolute bottom-[26px] top-0 z-[2] w-px bg-accent" style={{ left: lineX }}>
          <span className="absolute left-1 top-1 whitespace-nowrap rounded bg-accent px-1 py-0.5 font-mono text-[10px] font-semibold text-white">TAKEOVER</span>
        </div>
      )}
    </div>
  );
}
