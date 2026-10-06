'use client';

import { useRouter } from 'next/navigation';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type FilterFn,
  type Row,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStore, type EvidenceTarget } from '@/lib/store';
import type { Status, Token } from '@/lib/types';
import { ago, hours, pct, usd } from '@/lib/format';
import { CoinAvatar, CopyText, DeathBar, KindTag, StatusBadge, Tick } from './ui';

export type Tab = 'all' | 'watching' | 'taken_over' | 'revived' | 'abandoned';
export const TABS: { id: Tab; label: string; match: (s: Status) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'watching', label: 'Watching', match: (s) => s === 'scanning' || s === 'dying' || s === 'dead' },
  { id: 'taken_over', label: 'Taken over', match: (s) => s === 'taken_over' },
  { id: 'revived', label: 'Revived', match: (s) => s === 'revived' },
  { id: 'abandoned', label: 'Abandoned', match: (s) => s === 'abandoned' },
];

const STATUS_RANK: Record<Status, number> = { revived: 0, taken_over: 1, dead: 2, dying: 3, scanning: 4, abandoned: 5 };

const volDelta = (t: Token) => (t.volAtTakeover ? (t.vol24h / t.volAtTakeover - 1) * 100 : undefined);

function Num({ t, field, value, children, className = '' }: { t: Token; field: EvidenceTarget['field']; value: number; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={`numbtn ${className}`}
      title="Show the actions behind this number"
      onClick={(e) => {
        e.stopPropagation();
        useStore.getState().openEvidence({ ca: t.ca, field });
      }}
    >
      <Tick value={value}>{children}</Tick>
    </button>
  );
}

const Dash = () => <span className="text-muted/60">—</span>;
const signCls = (n: number) => (n > 0 ? 'text-accent' : n < 0 ? 'text-loss' : '');

const ch = createColumnHelper<Token>();

function useColumns(now: number) {
  return useMemo(
    () => [
      ch.accessor('name', {
        header: 'Coin',
        size: 250,
        cell: ({ row: { original: t } }) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <CoinAvatar src={t.image} size={30} />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="truncate font-medium">{t.name}</span>
                <span className="font-mono text-[11px] text-muted">${t.ticker}</span>
              </div>
              <CopyText text={t.ca} display={`${t.ca.slice(0, 4)}…${t.ca.slice(-6)}`} />
            </div>
          </div>
        ),
      }),
      ch.accessor('status', {
        header: 'Status',
        size: 108,
        sortingFn: (a, b) => STATUS_RANK[a.original.status] - STATUS_RANK[b.original.status],
        cell: (c) => <StatusBadge status={c.getValue()} />,
      }),
      ch.accessor('deathScore', {
        header: 'Death',
        size: 112,
        cell: ({ row: { original: t } }) => (
          <Num t={t} field="score" value={t.deathScore}>
            <DeathBar score={t.deathScore} />
          </Num>
        ),
      }),
      ch.accessor('devSoldPct', {
        header: 'Dev sold',
        size: 76,
        meta: { right: true },
        cell: ({ row: { original: t } }) => (
          <Num t={t} field="dev" value={Math.round(t.devSoldPct)} className={t.devSoldPct >= 80 ? 'text-loss' : ''}>
            {pct(t.devSoldPct)}
          </Num>
        ),
      }),
      ch.accessor('hoursSilent', {
        header: 'Silent',
        size: 68,
        meta: { right: true },
        cell: ({ row: { original: t } }) => (
          <Num t={t} field="social" value={Math.round(t.hoursSilent * 10)} className={t.hoursSilent >= 6 ? 'text-loss' : ''}>
            {hours(t.hoursSilent)}
          </Num>
        ),
      }),
      ch.accessor('vol24h', {
        header: 'Vol 24h',
        size: 84,
        meta: { right: true },
        cell: ({ row: { original: t } }) => (
          <Num t={t} field="vol24h" value={Math.round(t.vol24h / 100)}>
            {usd(t.vol24h)}
          </Num>
        ),
      }),
      ch.accessor(volDelta, {
        id: 'volDelta',
        header: 'Vol Δ CTO',
        size: 92,
        sortUndefined: 'last',
        meta: { right: true },
        cell: ({ row: { original: t } }) => {
          const d = volDelta(t);
          return d == null ? <Dash /> : (
            <Num t={t} field="volDelta" value={Math.round(d)} className={signCls(d)}>
              {pct(d, 0, true)}
            </Num>
          );
        },
      }),
      ch.accessor((t) => (t.takeoverAt ? t.position.sol : undefined), {
        id: 'position',
        header: 'Position',
        size: 88,
        sortUndefined: 'last',
        meta: { right: true },
        cell: ({ row: { original: t } }) =>
          !t.takeoverAt ? <Dash /> : (
            <Num t={t} field="position" value={Math.round(t.position.sol * 1000)}>
              {t.position.sol.toFixed(3)}
            </Num>
          ),
      }),
      ch.accessor((t) => (t.takeoverAt ? t.position.pnl : undefined), {
        id: 'pnl',
        header: 'PnL',
        size: 84,
        sortUndefined: 'last',
        meta: { right: true },
        cell: ({ row: { original: t } }) =>
          !t.takeoverAt ? <Dash /> : (
            <Num t={t} field="pnl" value={Math.round(t.position.pnl * 1000)} className={signCls(t.position.pnl)}>
              {t.position.pnl >= 0 ? '+' : ''}{t.position.pnl.toFixed(3)}
            </Num>
          ),
      }),
      ch.accessor('feesEarned', {
        header: 'Fees',
        size: 76,
        meta: { right: true },
        cell: ({ row: { original: t } }) =>
          !t.takeoverAt ? <Dash /> : (
            <Num t={t} field="fees" value={Math.round(t.feesEarned * 1000)} className={t.feesEarned > 0 ? 'text-gain' : ''}>
              {t.feesEarned.toFixed(3)}
            </Num>
          ),
      }),
      ch.accessor((t) => t.lastAction?.at ?? 0, {
        id: 'last',
        header: 'Last action',
        size: 420,
        cell: ({ row: { original: t } }) =>
          t.lastAction ? (
            <div className="flex min-w-0 items-center gap-2" title={t.lastAction.reason}>
              <span className="num w-8 shrink-0 text-right font-mono text-[11px] text-muted">{ago(t.lastAction.at, now)}</span>
              <KindTag kind={t.lastAction.kind} />
              <span className="truncate font-mono text-[12px] text-fg/85">{t.lastAction.reason}</span>
            </div>
          ) : null,
      }),
    ],
    [now],
  );
}

const searchFn: FilterFn<Token> = (row, _id, q: string) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const t = row.original;
  return t.ca.toLowerCase().includes(s) || t.ticker.toLowerCase().includes(s.replace('$', '')) || t.name.toLowerCase().includes(s);
};

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

export function TokensTable() {
  const tokens = useStore((s) => s.snap?.tokens);
  const now = useStore((s) => s.snap?.now ?? 0);
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'last', desc: true }]);
  const [hover, setHover] = useState(false);
  const frozen = useRef<string[] | null>(null);
  const mobile = useIsMobile();

  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab') as Tab | null;
      if (t && TABS.some((x) => x.id === t)) setTab(t);
    } catch {}
  }, []);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: 0, watching: 0, taken_over: 0, revived: 0, abandoned: 0 };
    for (const t of tokens ?? []) for (const tb of TABS) if (tb.match(t.status)) c[tb.id]++;
    return c;
  }, [tokens]);

  const data = useMemo(() => {
    const m = TABS.find((x) => x.id === tab)!.match;
    return (tokens ?? []).filter((t) => m(t.status));
  }, [tokens, tab]);

  const columns = useColumns(now);
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: q },
    onSortingChange: setSorting,
    globalFilterFn: searchFn,
    getRowId: (t) => t.ca,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Freeze row order while the pointer is over the table so rows don't jump
  // under the cursor; values keep updating in place.
  const sortedRows = table.getRowModel().rows;
  const rows: Row<Token>[] = useMemo(() => {
    if (!hover || !frozen.current) {
      frozen.current = sortedRows.map((r) => r.id);
      return sortedRows;
    }
    const byId = new Map(sortedRows.map((r) => [r.id, r]));
    const out: Row<Token>[] = [];
    for (const id of frozen.current) {
      const r = byId.get(id);
      if (r) { out.push(r); byId.delete(id); }
    }
    return [...byId.values(), ...out];
  }, [sortedRows, hover]);

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-line md:flex-row md:items-end md:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`tab whitespace-nowrap ${tab === t.id ? 'tab-on' : ''}`}>
              {t.label} <span className="num ml-1 text-[11px] text-muted">{counts[t.id]}</span>
            </button>
          ))}
        </div>
        <div className="mb-2 flex items-center gap-2">
          {hover && <span className="hidden font-mono text-[11px] text-muted md:inline">order paused</span>}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search CA, ticker, name"
            className="h-8 w-full rounded-md border border-line bg-bg px-2.5 font-mono text-[12px] outline-none placeholder:text-muted focus:border-accent md:w-72"
          />
        </div>
      </div>
      {mobile ? (
        <MobileList rows={rows} now={now} sortId={sorting[0]?.id} onSort={(id) => setSorting([{ id, desc: true }])} />
      ) : (
        <DesktopTable table={table} rows={rows} onHover={setHover} />
      )}
      {rows.length === 0 && <p className="py-10 text-center text-muted">No coins match.</p>}
    </div>
  );
}

const ROW_H = 52;

function DesktopTable({ table, rows, onHover }: { table: ReturnType<typeof useReactTable<Token>>; rows: Row<Token>[]; onHover: (h: boolean) => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({ count: rows.length, getScrollElement: () => ref.current, estimateSize: () => ROW_H, overscan: 12 });
  const headers = table.getHeaderGroups()[0].headers;
  const tpl = headers.map((h) => (h.column.id === 'last' ? `minmax(${h.getSize()}px,1fr)` : `${h.getSize()}px`)).join(' ');
  const minW = headers.reduce((s, h) => s + h.getSize(), 0) + 24;

  return (
    <div ref={ref} className="relative h-[calc(100vh-186px)] min-h-[420px] overflow-auto" onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}>
      <div style={{ minWidth: minW }}>
        <div className="sticky top-0 z-10 grid border-b border-line bg-bg px-3" style={{ gridTemplateColumns: tpl }} role="row">
          {headers.map((h) => {
            const s = h.column.getIsSorted();
            const right = (h.column.columnDef.meta as { right?: boolean } | undefined)?.right;
            return (
              <button
                key={h.id}
                onClick={h.column.getToggleSortingHandler()}
                className={`flex h-9 items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted hover:text-fg ${right ? 'justify-end pr-2' : ''}`}
              >
                {flexRender(h.column.columnDef.header, h.getContext())}
                <span className="w-2 text-fg">{s === 'asc' ? '↑' : s === 'desc' ? '↓' : ''}</span>
              </button>
            );
          })}
        </div>
        <div style={{ height: v.getTotalSize(), position: 'relative' }}>
          {v.getVirtualItems().map((vi) => {
            const row = rows[vi.index];
            return <DesktopRow key={row.id} row={row} tpl={tpl} top={vi.start} onOpen={() => router.push(`/token/${row.original.ca}`)} />;
          })}
        </div>
      </div>
    </div>
  );
}

const DesktopRow = memo(
  function DesktopRow({ row, tpl, top, onOpen }: { row: Row<Token>; tpl: string; top: number; onOpen: () => void }) {
    return (
      <div
        role="row"
        onClick={onOpen}
        className="absolute left-0 right-0 grid cursor-pointer items-center border-b border-line px-3 transition-colors hover:bg-surface"
        style={{ gridTemplateColumns: tpl, height: ROW_H, transform: `translateY(${top}px)` }}
      >
        {row.getVisibleCells().map((c) => {
          const right = (c.column.columnDef.meta as { right?: boolean } | undefined)?.right;
          return (
            <div key={c.id} className={`min-w-0 ${right ? 'pr-2 text-right' : 'pr-3'}`}>
              {flexRender(c.column.columnDef.cell, c.getContext())}
            </div>
          );
        })}
      </div>
    );
  },
  (a, b) => a.row.original === b.row.original && a.top === b.top && a.tpl === b.tpl && a.row.original.lastAction === b.row.original.lastAction,
);

const MOBILE_SORTS: { id: string; label: string }[] = [
  { id: 'last', label: 'Latest' },
  { id: 'deathScore', label: 'Death' },
  { id: 'vol24h', label: 'Volume' },
  { id: 'pnl', label: 'PnL' },
];

function MobileList({ rows, now, sortId, onSort }: { rows: Row<Token>[]; now: number; sortId?: string; onSort: (id: string) => void }) {
  const router = useRouter();
  return (
    <div>
      <div className="flex gap-1 py-2">
        {MOBILE_SORTS.map((s) => (
          <button key={s.id} onClick={() => onSort(s.id)} className={`btn h-7 px-2 text-[12px] ${sortId === s.id ? 'border-fg' : ''}`}>{s.label}</button>
        ))}
      </div>
      <ul className="divide-y divide-line">
        {rows.slice(0, 300).map((r) => (
          <MobileCard key={r.id} t={r.original} now={now} onOpen={() => router.push(`/token/${r.original.ca}`)} />
        ))}
      </ul>
    </div>
  );
}

function MobileCard({ t, now, onOpen }: { t: Token; now: number; onOpen: () => void }) {
  const d = volDelta(t);
  const cell = (label: string, field: EvidenceTarget['field'], value: number, node: React.ReactNode, cls = '') => (
    <div>
      <div className="label">{label}</div>
      <Num t={t} field={field} value={value} className={cls}>{node}</Num>
    </div>
  );
  return (
    <li onClick={onOpen} className="cursor-pointer py-3">
      <div className="flex items-center gap-2.5">
        <CoinAvatar src={t.image} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="truncate font-medium">{t.name}</span>
            <span className="font-mono text-[11px] text-muted">${t.ticker}</span>
          </div>
          <CopyText text={t.ca} />
        </div>
        <StatusBadge status={t.status} />
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-x-3 gap-y-2">
        {cell('Death', 'score', t.deathScore, <DeathBar score={t.deathScore} small />)}
        {cell('Dev sold', 'dev', Math.round(t.devSoldPct), pct(t.devSoldPct), t.devSoldPct >= 80 ? 'text-loss' : '')}
        {cell('Silent', 'social', Math.round(t.hoursSilent * 10), hours(t.hoursSilent))}
        {cell('Vol 24h', 'vol24h', Math.round(t.vol24h), usd(t.vol24h))}
        {t.takeoverAt && (
          <>
            {cell('Vol Δ', 'volDelta', Math.round(d ?? 0), pct(d ?? 0, 0, true), signCls(d ?? 0))}
            {cell('Position', 'position', Math.round(t.position.sol * 1000), t.position.sol.toFixed(3))}
            {cell('PnL', 'pnl', Math.round(t.position.pnl * 1000), `${t.position.pnl >= 0 ? '+' : ''}${t.position.pnl.toFixed(3)}`, signCls(t.position.pnl))}
            {cell('Fees', 'fees', Math.round(t.feesEarned * 1000), t.feesEarned.toFixed(3))}
          </>
        )}
      </div>
      {t.lastAction && (
        <p className="mt-2 font-mono text-[12px] leading-snug text-fg/85">
          <span className="text-muted">{ago(t.lastAction.at, now)} </span>
          <KindTag kind={t.lastAction.kind} />
          {t.lastAction.reason}
        </p>
      )}
    </li>
  );
}
