import React from 'react';
import { Project } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface ProjectTileProps {
  project: Project;
  onOpen: (trigger: HTMLButtonElement) => void;
}

const MAX_TILE_TAGS = 2;

const ProjectTile: React.FC<ProjectTileProps> = React.memo(({ project, onOpen }) => {
  const { title, image, tags } = project;
  const { theme } = useTheme();

  const colors = theme === 'underwater' ? {
    border: 'border-cyan-400/20 hover:border-cyan-300/60 focus-visible:ring-cyan-300',
    shadow: 'hover:shadow-cyan-500/20',
    title: 'text-cyan-100',
    tagBg: 'bg-cyan-900/60',
    tagText: 'text-cyan-200',
    hint: 'text-cyan-200',
  } : {
    border: 'border-indigo-400/20 hover:border-indigo-300/60 focus-visible:ring-indigo-300',
    shadow: 'hover:shadow-indigo-500/20',
    title: 'text-indigo-100',
    tagBg: 'bg-indigo-900/60',
    tagText: 'text-indigo-200',
    hint: 'text-indigo-200',
  };

  const visibleTags = tags.slice(0, MAX_TILE_TAGS);
  const hiddenTagCount = tags.length - visibleTags.length;

  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget)}
      aria-haspopup="dialog"
      aria-label={`${title} — view details`}
      className={`group text-left flex flex-col bg-black/25 backdrop-blur-md rounded-xl overflow-hidden border shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 ${colors.border} ${colors.shadow}`}
    >
      <div className="relative w-full aspect-video overflow-hidden">
        <img
          src={image}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className={`absolute bottom-2 right-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/60 ${colors.hint} opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300`}>
          View details
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className={`text-sm md:text-base font-semibold leading-snug ${colors.title}`}>{title}</h3>
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {visibleTags.map(tag => (
            <span key={tag} className={`${colors.tagBg} ${colors.tagText} text-[11px] font-medium px-2 py-0.5 rounded-full`}>
              {tag}
            </span>
          ))}
          {hiddenTagCount > 0 && (
            <span className={`text-[11px] font-medium px-1.5 py-0.5 ${colors.tagText} opacity-70`}>
              +{hiddenTagCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});

export default ProjectTile;
