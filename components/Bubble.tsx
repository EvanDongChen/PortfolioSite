import React from 'react';

interface BubbleProps {
  left: string;
  size: string;
  duration: string;
}

const Bubble: React.FC<BubbleProps> = React.memo(({ left, size, duration }) => {
  const style: React.CSSProperties = {
    left,
    width: size,
    height: size,
    animationDuration: duration,
  };

  return <div className="bubble-animation rounded-full bg-cyan-400/20" style={style}></div>;
});

export default Bubble;
