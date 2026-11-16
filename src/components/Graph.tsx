'use client';
// Relationship graph: a lens on the ledger. Cytoscape.js with the ELK layered layout,
// wrapped directly (no React wrapper dependency). Nodes are typographic: a filled
// square for companies, a tick for people, never rounded outlined boxes.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Core } from 'cytoscape';
import type { EntityBundle, Relationship } from '@/lib/types';
import { fmtDate, inForce } from '@/lib/dates';
import { Spine, useAsAt } from './AsAt';
import { EvidenceLedger } from './EvidenceLedger';

function neighbourhood(bundle: EntityBundle) {
  // Breadth-first from the focal company. People stop at two hops.
  const focal = bundle.entity.id;
  const dist = new Map<string, number>([[focal, 0]]);
  const queue = [focal];
  const rels = new Set<Relationship>();
  while (queue.length) {
    const cur = queue.shift()!;
    const d = dist.get(cur)!;
    for (const r of bundle.relationships) {
      if (r.from !== cur && r.to !== cur) continue;
      const other = r.from === cur ? r.to : r.from;
      const isPerson = bundle.entities[other]?.kind === 'person';
      const nd = d + 1;
      if (isPerson ? nd > 2 : nd > 3) continue;
      rels.add(r);
      if (!dist.has(other)) {
        dist.set(other, nd);
        // Companies are expanded; a person is expanded only when directly attached to the focal company.
        if (!isPerson || nd === 1) queue.push(other);
      }
    }
  }
  return { ids: [...dist.keys()], rels: [...rels] };
}

export function Graph({ bundle }: { bundle: EntityBundle }) {
  const host = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const asAt = useAsAt(bundle);
  const [selected, setSelected] = useState<{ kind: 'node' | 'edge'; id: string } | null>(null);
  const [asList, setAsList] = useState(false);
  const [failed, setFailed] = useState(false);
  const { ids, rels } = useMemo(() => neighbourhood(bundle), [bundle]);

  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setAsList(true);
  }, []);

  useEffect(() => {
    if (asList || !host.current) return;
    let cy: Core | null = null;
    let cancelled = false;
    (async () => {
      try {
        const [{ default: cytoscape }, { default: elk }] = await Promise.all([import('cytoscape'), import('cytoscape-elk')]);
        if (cancelled || !host.current) return;
        try { cytoscape.use(elk as never); } catch { /* already registered */ }
        const css = getComputedStyle(document.documentElement);
        const ink = css.getPropertyValue('--ink').trim();
        const ink2 = css.getPropertyValue('--ink-2').trim();
        const rule = css.getPropertyValue('--rule').trim();
        const sans = css.getPropertyValue('--sans').trim();
        const ground = css.getPropertyValue('--ground').trim();
        cy = cytoscape({
          container: host.current,
          elements: [
            ...ids.map((id) => {
              const e = bundle.entities[id];
              return { data: { id, label: e.name, kind: e.kind, dissolved: e.status === 'dissolved' ? 1 : 0, focal: id === bundle.entity.id ? 1 : 0 } };
            }),
            ...rels.map((r) => ({ data: { id: r.id, source: r.from, target: r.to, label: `${r.label} · ${fmtDate(r.start)}${r.end ? ' to ' + fmtDate(r.end) : ''}` } })),
          ],
          style: [
            { selector: 'node', style: { shape: 'rectangle', width: 8, height: 8, 'background-color': ink, label: 'data(label)', color: ink, 'font-family': sans, 'font-size': 13, 'text-halign': 'right', 'text-valign': 'center', 'text-margin-x': 8, 'text-wrap': 'wrap', 'text-max-width': '170px', 'text-background-color': ground, 'text-background-opacity': 1, 'text-background-padding': '2px' } },
            { selector: 'node[kind = "company"], node[kind = "llp"]', style: { 'font-weight': 600 } },
            { selector: 'node[kind = "person"]', style: { width: 2, height: 12 } },
            { selector: 'node[focal = 1]', style: { width: 12, height: 12, 'font-size': 15, 'font-weight': 700 } },
            { selector: 'node[dissolved = 1]', style: { color: ink2, 'background-color': ink2 } },
            { selector: 'edge', style: { width: 1, 'line-color': ink2, 'curve-style': 'taxi', 'taxi-direction': 'downward', 'taxi-turn': 30, 'taxi-turn-min-distance': 8, 'target-arrow-shape': 'none', label: '', 'font-family': sans, 'font-size': 11, color: ink, 'text-background-color': ground, 'text-background-opacity': 1, 'text-background-padding': '3px' } },
            { selector: 'edge.show, edge:selected', style: { label: 'data(label)', width: 2, 'line-color': ink } },
            { selector: 'node:selected', style: { 'background-color': ink, 'border-width': 3, 'border-color': rule } },
            { selector: '.off', style: { opacity: 0.25 } },
          ] as never,
          layout: { name: 'elk', elk: { algorithm: 'layered', 'elk.direction': 'DOWN', 'elk.spacing.nodeNode': 90, 'elk.layered.spacing.nodeNodeBetweenLayers': 80 }, padding: 40, nodeDimensionsIncludeLabels: true } as never,
          minZoom: 0.4,
          maxZoom: 2,
          wheelSensitivity: 0.3,
        });
        cy.on('tap', 'node', (ev) => setSelected({ kind: 'node', id: ev.target.id() }));
        cy.on('tap', 'edge', (ev) => setSelected({ kind: 'edge', id: ev.target.id() }));
        cy.on('tap', (ev) => { if (ev.target === cy) setSelected(null); });
        cy.on('mouseover', 'edge', (ev) => ev.target.addClass('show'));
        cy.on('mouseout', 'edge', (ev) => ev.target.removeClass('show'));
        cy.one('layoutstop', () => cy?.fit(undefined, 40));
        cyRef.current = cy;
        (window as unknown as { __cy?: Core }).__cy = cy;
      } catch {
        setFailed(true);
        setAsList(true);
      }
    })();
    return () => { cancelled = true; cy?.destroy(); cyRef.current = null; };
  }, [asList, bundle, ids, rels]);

  // Fade what is not in force at the as-at date.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const live = new Set<string>([bundle.entity.id]);
    for (const r of rels) {
      const on = inForce(asAt.date, r.start, r.end);
      cy.getElementById(r.id).toggleClass('off', !on);
      if (on) { live.add(r.from); live.add(r.to); }
    }
    for (const id of ids) cy.getElementById(id).toggleClass('off', !live.has(id));
  });

  const selRels = selected ? (selected.kind === 'edge' ? rels.filter((r) => r.id === selected.id) : rels.filter((r) => r.from === selected.id || r.to === selected.id)) : [];
  const evIds = new Set(selRels.flatMap((r) => r.evidenceIds));
  const rows = bundle.evidence.filter((e) => evIds.has(e.id));
  const selName = selected?.kind === 'node' ? bundle.entities[selected.id]?.name : selRels[0] ? `${bundle.entities[selRels[0].from]?.name} and ${bundle.entities[selRels[0].to]?.name}` : '';

  return (
    <div className="graph-wrap">
      <div className="spine-controls no-print">
        <button type="button" className="textlink" onClick={() => setAsList(!asList)}>{asList ? 'View as graph' : 'View as list'}</button>
        {failed ? <span className="state-line">The graph could not load here, so the list is shown.</span> : null}
      </div>
      {asList ? (
        <div>
          <div className="ledger-head grid12" aria-hidden="true"><span className="ledger-margin">From</span><span className="ledger-claim">Relationship</span><span className="ledger-value">To</span></div>
          {rels.map((r) => (
            <div key={r.id} className="ledger-row">
              <button type="button" className="ledger-line grid12" onClick={() => setSelected({ kind: 'edge', id: r.id })}>
                <span className="ledger-margin mono">{fmtDate(r.start)}{r.end ? ` to ${fmtDate(r.end)}` : ''}</span>
                <span className="ledger-claim">{bundle.entities[r.from]?.name}: {r.label}{inForce(asAt.date, r.start, r.end) ? '' : ' (not in force at the as-at date)'}</span>
                <span className="ledger-value">{bundle.entities[r.to]?.name}</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid12">
          <div className="graph-canvas" ref={host} role="img" aria-label={`Relationship graph for ${bundle.entity.name}. Use View as list for an accessible version.`} />
          <aside className="graph-side" aria-live="polite">
            {selected ? (
              <>
                <h3 className="sub" style={{ marginTop: 0 }}>{selName}</h3>
                {rows.length ? <EvidenceLedger bundle={bundle} rows={rows} showFilters={false} /> : <p className="quiet">No evidence rows are attached to this selection.</p>}
              </>
            ) : (
              <p className="quiet">Select a name or a line to see the evidence behind it. Hover a line for the role and dates.</p>
            )}
          </aside>
        </div>
      )}
      {asList && selected && rows.length ? <div style={{ marginTop: 24 }}><h3 className="sub">{selName}</h3><EvidenceLedger bundle={bundle} rows={rows} showFilters={false} /></div> : null}
      <div className="graph-legend"><span><span className="legend-sq" />Company or LLP</span><span><span className="legend-tick" />Person</span><span>Faded: not in force on {fmtDate(asAt.date)}</span><span>Parents and officers sit above the companies they control or serve</span></div>
      <Spine events={asAt.events} min={asAt.min} today={asAt.today} date={asAt.date} onChange={asAt.set} />
    </div>
  );
}
