import React from 'react';

interface StarProps {
  left: string;
  top: string;
  size: string;
  duration: string;
}

const Star: React.FC<StarProps> = ({ left, top, size, duration }) => {
  const style: React.CSSProperties = {
    left,
    top,
    width: size,
    height: size,
    animationDuration: duration,
  };

  return <div className="star-animation rounded-full bg-slate-300" style={style}></div>;
};

export default Star;
