import React from 'react';

interface ShootingStarProps {
  top: string;
  left: string;
  duration: string;
  delay: string;
  rotation: number;
}

const ShootingStar: React.FC<ShootingStarProps> = ({ top, left, duration, delay, rotation }) => {
  const style: React.CSSProperties = {
    top,
    left,
    animationDuration: duration,
    animationDelay: delay,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'left center',
  };

  return (
    <div className="shooting-star-animation" style={style}>
      <div className="absolute right-0 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_2px_#fff]"></div>
      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-48 h-px bg-gradient-to-l from-white to-transparent opacity-70"></div>
    </div>
  );
};

export default ShootingStar;