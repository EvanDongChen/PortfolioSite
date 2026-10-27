import React from 'react';

interface PixelMeterProps {
  /** 0 to 1. */
  value: number;
  color: string;
  segments?: number;
}

/** A row of pixel blocks filled to a fraction, like a game health bar. */
const PixelMeter: React.FC<PixelMeterProps> = ({ value, color, segments = 10 }) => {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * segments);
  return (
    <span className="px-meter" aria-hidden="true">
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} style={i < filled ? { background: color } : undefined} />
      ))}
    </span>
  );
};

export default React.memo(PixelMeter);
