import React from 'react';
import { Project } from '../types';
import { CodeIcon } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { title, description, image, tags, codeUrl } = project;
  const { theme } = useTheme();

  const colors = theme === 'underwater' ? {
    border: 'border-cyan-400/20',
    borderHover: 'hover:border-cyan-400/50',
    shadowHover: 'hover:shadow-cyan-500/20',
    title: 'text-cyan-200',
    description: 'text-cyan-100/80',
    tagBg: 'bg-cyan-900/50',
    tagText: 'text-cyan-200',
    bottomBorder: 'border-cyan-400/10',
    link: 'text-cyan-300'
  } : {
    border: 'border-indigo-400/20',
    borderHover: 'hover:border-indigo-400/50',
    shadowHover: 'hover:shadow-indigo-500/20',
    title: 'text-indigo-200',
    description: 'text-slate-300/80',
    tagBg: 'bg-indigo-900/50',
    tagText: 'text-indigo-200',
    bottomBorder: 'border-indigo-400/10',
    link: 'text-indigo-300'
  };

  return (
    <div className={`bg-black/20 backdrop-blur-md rounded-xl overflow-hidden shadow-lg border ${colors.border} group transition-all duration-300 ${colors.borderHover} ${colors.shadowHover} hover:-translate-y-2 hover:scale-[1.02]`}>
      <div className="relative overflow-hidden">
        <img src={image} alt={title} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
      </div>
      <div className="p-6">
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
};

export default ProjectCard;