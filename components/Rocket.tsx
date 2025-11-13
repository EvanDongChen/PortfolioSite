import React from 'react';

interface RocketProps {
  duration: string;
  delay: string;
}

const Rocket: React.FC<RocketProps> = ({ duration, delay }) => {
  const style: React.CSSProperties = {
    animationDuration: duration,
    animationDelay: delay,
    width: '60px',
    height: '60px',
  };

  return (
    <div className="rocket-animation" style={style}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E2E8F0" className="w-full h-full">
            <path d="M12 2L2 22h20L12 2zm0 4.236L16.472 18H7.528L12 6.236z"/>
            <path d="M9 20h6v2H9z" fill="#F97316"/>
        </svg>
    </div>
  );
};

export default Rocket;
