import React from 'react';

interface BubbleProps {
  left: string;
  size: string;
  duration: string;
  isDeepSea?: boolean;
}

const Bubble: React.FC<BubbleProps> = React.memo(({ left, size, duration, isDeepSea }) => {
  const style: React.CSSProperties = {
    left,
    width: size,
    height: size,
    animationDuration: duration,
  };

  return (
    <div
      className={`bubble-animation rounded-full ${isDeepSea ? 'bg-slate-800/24' : 'bg-cyan-400/20'}`}
      style={style}
    ></div>
  );
});

export default Bubble;
