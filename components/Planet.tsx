import React from 'react';
import { Planet as PlanetType } from '../types';

const Planet: React.FC<PlanetType> = ({ id, top, left, size, gradientColors, shadowColor, animationDelay }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    top,
    left,
    width: size,
    height: size,
    borderRadius: '50%',
    background: `radial-gradient(circle at 30% 30%, ${gradientColors[0]}, ${gradientColors[1]})`,
    boxShadow: `0 0 40px 10px ${shadowColor}, inset -20px -10px 40px rgba(0,0,0,0.3)`,
    pointerEvents: 'none',
    animationDelay,
  };

  return <div className="planet-animation" style={style}></div>;
};

export default Planet;