import React, { useState } from 'react';
import { OceanStats } from '../lib/pixelOcean';

interface EcosystemPanelProps {
  stats: OceanStats | null;
}

const Row: React.FC<{ label: string; value: number; swatch: string }> = ({ label, value, swatch }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="flex items-center gap-2">
      <span className="inline-block h-2 w-2" style={{ background: swatch }} />
      {label}
    </span>
    <span className="tabular-nums font-semibold">{value}</span>
  </div>
);

/** Live census of the pixel ecosystem, bottom-left beside the food button. */
const EcosystemPanel: React.FC<EcosystemPanelProps> = ({ stats }) => {
  const [isOpen, setIsOpen] = useState(true);
  if (!stats) return null;
  const { deaths } = stats;

  return (
    <div className="fixed bottom-8 left-24 z-40 hidden sm:block w-56 rounded-md border border-cyan-400/20 bg-[#020b24]/70 px-3 py-2 text-xs text-cyan-100/90 backdrop-blur-sm opacity-80 hover:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className="flex w-full items-center justify-between font-semibold tracking-wide text-cyan-100"
        aria-expanded={isOpen}
      >
        <span>Ecosystem</span>
        <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="mt-2 space-y-1">
          <Row label="Minnows" value={stats.minnows} swatch="#aac8e1" />
          <Row label="Predators" value={stats.predators} swatch="#b04a4a" />
          <Row label="Plankton" value={stats.plankton} swatch="#96ffaa" />
          <Row label="Kelp" value={stats.kelp} swatch="#2ea05a" />
          <Row label="Fish food" value={stats.food} swatch="#ea9634" />
          <Row label="Remains" value={stats.corpses} swatch="#bea9a5" />
          <Row label="Free nutrients" value={stats.nutrients} swatch="#4f6fa8" />
          <div className="mt-2 border-t border-cyan-400/15 pt-2 text-cyan-100/70">
            <div>{stats.births} born · {deaths.eaten} eaten</div>
            <div>{deaths.starved} starved · {deaths.oldAge} of old age</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(EcosystemPanel);
