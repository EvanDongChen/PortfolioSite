import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Project } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { CodeIcon, ExternalLinkIcon } from './Icons';
import { getProjectLinkLabel } from '../lib/projectLink';

interface ProjectModalProps {
  projects: Project[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

// Rendered through a portal: every <Section> carries a CSS transform for its
// reveal animation, which would otherwise turn `position: fixed` into
// "fixed relative to the section" and trap the overlay inside it.
const ProjectModal: React.FC<ProjectModalProps> = ({ projects, index, onClose, onNavigate }) => {
  const { theme } = useTheme();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const project = projects[index];
  const hasMultiple = projects.length > 1;

  const goPrev = () => onNavigate((index - 1 + projects.length) % projects.length);
  const goNext = () => onNavigate((index + 1) % projects.length);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft' && hasMultiple) {
        goPrev();
      } else if (e.key === 'ArrowRight' && hasMultiple) {
        goNext();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>('button, a[href]');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!project) return null;

  const colors = theme === 'underwater' ? {
    panel: 'bg-slate-900/90 border-cyan-300/30',
    title: 'text-cyan-100',
    text: 'text-cyan-50/85',
    muted: 'text-cyan-200/70',
    tagBg: 'bg-cyan-900/60',
    tagText: 'text-cyan-200',
    cta: 'bg-cyan-400 hover:bg-cyan-300 text-slate-900 focus-visible:ring-cyan-200',
    ghost: 'border-cyan-300/30 text-cyan-100 hover:bg-cyan-400/15 focus-visible:ring-cyan-300',
  } : {
    panel: 'bg-slate-950/90 border-indigo-300/30',
    title: 'text-indigo-100',
    text: 'text-slate-200/85',
    muted: 'text-indigo-200/70',
    tagBg: 'bg-indigo-900/60',
    tagText: 'text-indigo-200',
    cta: 'bg-indigo-400 hover:bg-indigo-300 text-slate-900 focus-visible:ring-indigo-200',
    ghost: 'border-indigo-300/30 text-indigo-100 hover:bg-indigo-400/15 focus-visible:ring-indigo-300',
  };

  const linkLabel = getProjectLinkLabel(project);
  const LinkIcon = linkLabel === 'View Code' ? CodeIcon : ExternalLinkIcon;
  const titleId = 'project-modal-title';

  return createPortal(
    <div
      data-is-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-none" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl animate-fade-in-up ${colors.panel}`}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close project details"
          className="absolute top-3 right-3 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="relative w-full aspect-video bg-black/40">
          <img
            key={project.image}
            src={project.image}
            alt={`Screenshot of ${project.title}`}
            className="w-full h-full object-cover"
            decoding="async"
          />
        </div>

        <div className="p-6 sm:p-8">
          <h3 id={titleId} className={`text-2xl sm:text-3xl font-bold mb-3 ${colors.title}`}>{project.title}</h3>
          <p className={`text-base sm:text-lg leading-relaxed mb-5 ${colors.text}`}>{project.description}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {project.tags.map(tag => (
              <span key={tag} className={`${colors.tagBg} ${colors.tagText} text-xs font-semibold px-3 py-1 rounded-full`}>
                {tag}
              </span>
            ))}
          </div>

          <a
            href={project.codeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-colors focus:outline-none focus-visible:ring-2 ${colors.cta}`}
          >
            <LinkIcon className="w-5 h-5" />
            {linkLabel}
          </a>

          {hasMultiple && (
            <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPrev}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 ${colors.ghost}`}
              >
                <span aria-hidden="true">←</span> Previous
              </button>
              <span className={`text-sm ${colors.muted}`} aria-live="polite">
                {index + 1} / {projects.length}
              </span>
              <button
                type="button"
                onClick={goNext}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 ${colors.ghost}`}
              >
                Next <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProjectModal;
