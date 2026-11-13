import { useMemo, useState } from 'react';
import ReactECharts from '@/components/Chart';
import { useQuery } from '@/hooks/useQuery';
import { fetchBusinessOntology } from '@/lib/api';
import MetricCard from '@/components/MetricCard';
import ChartCard from '@/components/ChartCard';
import DataTable from '@/components/DataTable';
import { ExternalLink, Boxes, GitBranch, Database } from 'lucide-react';

// ---------------------------------------------------------------------------
// Governed concepts from Snowflake Business Ontology (domain "Supply Chain").
//
// Business Ontology is only enabled on the US account (MSB89522), so the server
// serves a bundled snapshot (GET /api/business-ontology) in every region. The
// Snowsight links therefore open the US account.
// ---------------------------------------------------------------------------

interface BoEdge { type: string; label: string | null; direction: 'in' | 'out'; node: string }
interface BoRepresentation { object: string; fqn: string; objectType: string; role: string; validity: string }
interface BoNode {
  name: string;
  fqn: string;
  kind: string;
  status: string;
  description: string;
  synonyms: string[];
  appClass?: string;
  edges: BoEdge[];
  representations: BoRepresentation[];
  history?: { events: number; changedBy: string[] };
  snowsightUrl: string;
}
interface BoRelationship { source: string; target: string; type: string; label: string | null }
interface BusinessOntology {
  domain: string;
  account: string;
  exportedAt: string;
  snowsightUrl: string;
  counts: { nodes: number; relationships: number; representations: number };
  nodes: BoNode[];
  relationships: BoRelationship[];
}

const SKY = 'border-sky-300 bg-gradient-to-br from-sky-50 to-white';
const KIND_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#64748b'];
const REL_COLORS: Record<string, string> = { IS_A: '#0ea5e9', HAS_PART: '#8b5cf6', RELATES_TO: '#94a3b8' };

export default function BusinessOntologyPanel() {
  const { data, loading, error } = useQuery<BusinessOntology>(fetchBusinessOntology, []);
  const [selected, setSelected] = useState<string | null>(null);

  const relByType = useMemo(() => {
    const m = new Map<string, number>();
    data?.relationships.forEach((r) => m.set(r.type, (m.get(r.type) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  const kinds = useMemo(() => [...new Set((data?.nodes ?? []).map((n) => n.kind))], [data]);

  const graphOption = useMemo(() => {
    if (!data) return null;
    const degree = new Map<string, number>();
    data.relationships.forEach((r) => {
      degree.set(r.source, (degree.get(r.source) ?? 0) + 1);
      degree.set(r.target, (degree.get(r.target) ?? 0) + 1);
    });
    return {
      tooltip: { formatter: (p: any) => (p.dataType === 'edge' ? `${p.data.source} —${p.data.relType}→ ${p.data.target}` : p.data.name) },
      legend: { data: kinds, bottom: 0 },
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        force: { repulsion: 260, edgeLength: [70, 140] },
        categories: kinds.map((k, i) => ({ name: k, itemStyle: { color: KIND_COLORS[i % KIND_COLORS.length] } })),
        label: { show: true, position: 'right', fontSize: 11 },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 7,
        data: data.nodes.map((n) => ({
          name: n.name,
          category: kinds.indexOf(n.kind),
          symbolSize: 14 + Math.min(degree.get(n.name) ?? 0, 8) * 3,
          itemStyle: n.name === selected ? { borderColor: '#0f172a', borderWidth: 3 } : undefined,
        })),
        links: data.relationships.map((r) => ({
          source: r.source,
          target: r.target,
          relType: r.label ? `${r.type} (${r.label})` : r.type,
          lineStyle: { color: REL_COLORS[r.type] ?? '#94a3b8', width: 1.5, curveness: 0.1 },
        })),
      }],
    };
  }, [data, kinds, selected]);

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-sky-100/60" />;
  if (error || !data) {
    return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Business Ontology snapshot unavailable: {error}</div>;
  }

  const node = data.nodes.find((n) => n.name === selected) ?? null;
  const asOf = new Date(data.exportedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <section className="space-y-4 rounded-xl border border-sky-300 bg-sky-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}snowflake_logo.svg`} alt="" className="h-5 w-5" />
            <h2 className="text-lg font-bold text-sf-dark">Governed concepts (Snowflake Business Ontology)</h2>
            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Business Ontology</span>
          </div>
          <p className="mt-1 text-xs text-sf-dark/60">
            Domain “{data.domain}” — snapshot from account {data.account} (US), as of {asOf}. Bundled with the app, so it
            shows the same in every region.
          </p>
        </div>
        <a
          href={data.snowsightUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400 bg-white px-3 py-1.5 text-sm font-semibold text-sky-700 hover:bg-sky-50"
          title="Opens Snowsight on the US account MSB89522"
        >
          Open in Snowsight (US account) <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard title="Concepts" value={String(data.counts.nodes)} icon={Boxes} accent={SKY} />
        <MetricCard title="Relationships" value={String(data.counts.relationships)} icon={GitBranch} accent={SKY} />
        <MetricCard title="Representations" value={String(data.counts.representations)} icon={Database} accent={SKY} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {relByType.map(([t, c]) => (
          <span key={t} className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-sf-dark/70">
            <span className="font-semibold" style={{ color: REL_COLORS[t] ?? '#475569' }}>{t}</span> × {c}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ChartCard title="Concept graph" subtitle="Click a concept to see its definition, relationships and representations">
            {graphOption && (
              <ReactECharts
                option={graphOption}
                keepOrder
                style={{ height: 440 }}
                onEvents={{ click: (p: any) => p.dataType === 'node' && setSelected(p.data.name) }}
              />
            )}
          </ChartCard>
        </div>
        <div className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {data.nodes.map((n) => (
              <button
                key={n.name}
                onClick={() => setSelected(n.name)}
                className={`rounded-md border px-2 py-1 text-xs ${n.name === selected ? 'border-sky-500 bg-sky-500 text-white' : 'border-sky-200 bg-white text-sf-dark/80 hover:border-sky-400'}`}
              >
                {n.name}
              </button>
            ))}
          </div>
          {node ? (
            <div className="space-y-3 rounded-xl border border-sky-200 bg-white p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-sf-dark">{node.name}</div>
                  <div className="text-[11px] text-sf-dark/50">{node.fqn} · {node.kind} · {node.status}</div>
                </div>
                <a href={node.snowsightUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-700 underline" title="US account MSB89522">
                  Snowsight
                </a>
              </div>
              <p className="leading-relaxed text-sf-dark/75">{node.description}</p>
              {node.synonyms.length > 0 && (
                <div className="text-xs text-sf-dark/60">Synonyms: {node.synonyms.join(', ')}</div>
              )}
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-sf-dark/50">Relationships</div>
                {node.edges.length === 0 ? <div className="text-xs text-sf-dark/40">None</div> : (
                  <ul className="space-y-0.5 text-xs">
                    {node.edges.map((e, i) => (
                      <li key={i}>
                        {e.direction === 'out'
                          ? <>{node.name} <b>{e.type}</b>{e.label ? ` (${e.label})` : ''} → <button className="text-sky-700 underline" onClick={() => setSelected(e.node)}>{e.node}</button></>
                          : <><button className="text-sky-700 underline" onClick={() => setSelected(e.node)}>{e.node}</button> <b>{e.type}</b>{e.label ? ` (${e.label})` : ''} → {node.name}</>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-sf-dark/50">Representations</div>
                {node.representations.length === 0 ? <div className="text-xs text-sf-dark/40">None</div> : (
                  <DataTable
                    columns={[
                      { key: 'fqn', label: 'Object' },
                      { key: 'objectType', label: 'Type' },
                      { key: 'role', label: 'Role' },
                    ]}
                    data={node.representations as any}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-sky-300 p-4 text-sm text-sf-dark/50">Select a concept.</div>
          )}
        </div>
      </div>
    </section>
  );
}
