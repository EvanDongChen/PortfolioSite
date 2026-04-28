import React, { useRef, useState, useCallback } from 'react';
import { Project } from '../types';
import { CodeIcon } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = React.memo(({ project }) => {
  const { title, description, image, tags, codeUrl } = project;
  const { theme } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const colors = theme === 'underwater' ? {
    border: 'border-cyan-400/20',
    borderHover: 'hover:border-cyan-400/50',
    shadowHover: 'hover:shadow-cyan-500/20',
    title: 'text-cyan-200',
    description: 'text-cyan-100/80',
    tagBg: 'bg-cyan-900/50',
    tagText: 'text-cyan-200',
    bottomBorder: 'border-cyan-400/10',
    link: 'text-cyan-300',
    glareColor: 'rgba(0, 255, 255, 0.08)',
    edgeGlow: 'rgba(0, 255, 255, 0.4)',
  } : {
    border: 'border-indigo-400/20',
    borderHover: 'hover:border-indigo-400/50',
    shadowHover: 'hover:shadow-indigo-500/20',
    title: 'text-indigo-200',
    description: 'text-slate-300/80',
    tagBg: 'bg-indigo-900/50',
    tagText: 'text-indigo-200',
    bottomBorder: 'border-indigo-400/10',
    link: 'text-indigo-300',
    glareColor: 'rgba(129, 140, 248, 0.1)',
    edgeGlow: 'rgba(129, 140, 248, 0.5)',
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Balatro uses a pretty aggressive tilt — ~15-20 degrees max
    const maxTilt = 15;
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    const rotateX = ((centerY - y) / centerY) * maxTilt;

    // Glare position as percentage for the radial gradient
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ rotateX, rotateY, glareX, glareY });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  }, []);

  const cardStyle: React.CSSProperties = {
    transform: isHovered
      ? `perspective(800px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(1.05, 1.05, 1.05)`
      : 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    transition: isHovered
      ? 'transform 0.1s ease-out, box-shadow 0.2s ease-out'
      : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s ease-out',
    transformStyle: 'preserve-3d' as const,
    willChange: 'transform',
    boxShadow: isHovered
      ? `${tilt.rotateY * -0.5}px ${tilt.rotateX * 0.5 + 15}px 30px rgba(0,0,0,0.35),
         0 0 20px ${colors.edgeGlow},
         inset 0 0 0 1px ${colors.edgeGlow}`
      : '0 4px 15px rgba(0,0,0,0.15)',
  };

  // Glare / holographic shine overlay
  const glareStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    zIndex: 30,
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.3s ease-out',
    background: `
      radial-gradient(
        circle at ${tilt.glareX}% ${tilt.glareY}%,
        rgba(255, 255, 255, 0.2) 0%,
        ${colors.glareColor} 40%,
        transparent 70%
      )
    `,
    mixBlendMode: 'overlay' as const,
  };

  // Subtle edge highlight that shifts with tilt
  const edgeHighlightStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    zIndex: 31,
    opacity: isHovered ? 0.6 : 0,
    transition: 'opacity 0.3s ease-out',
    background: `
      linear-gradient(
        ${135 + tilt.rotateY * 2}deg,
        rgba(255,255,255,0.15) 0%,
        transparent 50%,
        transparent 100%
      )
    `,
  };

  return (
    <div
      ref={cardRef}
      className={`balatro-card bg-black/20 backdrop-blur-md rounded-xl overflow-hidden shadow-lg border ${colors.border} group`}
      style={cardStyle}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glare overlay */}
      <div style={glareStyle} />
      {/* Edge highlight */}
      <div style={edgeHighlightStyle} />

      <div className="relative overflow-hidden" style={{ zIndex: 1 }}>
        <img
          src={image}
          alt={title}
          className="w-full h-64 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
      </div>
      <div className="p-6 relative" style={{ zIndex: 2 }}>
        <h3 className={`text-2xl font-bold ${colors.title} mb-2`}>{title}</h3>
        <p className={`${colors.description} mb-4`}>{description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, index) => (
            <span key={index} className={`${colors.tagBg} ${colors.tagText} text-xs font-semibold px-3 py-1 rounded-full`}>
              {tag}
            </span>
          ))}
        </div>
        <div className={`flex items-center space-x-4 mt-auto pt-4 border-t ${colors.bottomBorder}`}>
          <a
            href={codeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center space-x-2 ${colors.link} hover:text-white transition-colors duration-300`}
          >
            <CodeIcon className="w-5 h-5" />
            <span>View Code</span>
          </a>
        </div>
      </div>
    </div>
  );
});

export default ProjectCard;