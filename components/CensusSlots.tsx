import React from 'react';
import './census.css';

export interface CensusSlot {
  key: string;
  name: string;
  count: number;
  icon: string;
}

/**
 * The census's collection grid: each creature in its own little slot with the
 * count in the corner, its name on hover, and a silhouette when there are none
 * about right now.
 */
const CensusSlots: React.FC<{ label: string; items: CensusSlot[] }> = ({ label, items }) => (
  <ul className="census-slots" aria-label={label}>
    {items.map(item => (
      <li
        key={item.key}
        className={item.count === 0 ? 'is-absent' : undefined}
        data-name={item.name}
        aria-label={`${item.name}: ${item.count}`}
      >
        <img src={item.icon} alt="" />
        <span className="census-count" aria-hidden="true">{item.count}</span>
      </li>
    ))}
  </ul>
);

export default CensusSlots;
