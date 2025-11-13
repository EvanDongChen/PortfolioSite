import React from 'react';
import { Nebula as NebulaType } from '../types';

const Nebula: React.FC<NebulaType> = ({ id, top, left, size, color1, color2, rotation, animationDelay }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    top,
    left,
    width: size,
    height: size,
    background: `radial-gradient(ellipse at center, ${color1} 0%, ${color2} 40%, transparent 70%)`,
    filter: 'blur(40px)',
    pointerEvents: 'none',
    '--nebula-rotation': `${rotation}deg`,
    animationDelay,
  } as React.CSSProperties;

  return <div className="nebula-animation" style={style}></div>;
};

export default Nebula;