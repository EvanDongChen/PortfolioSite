import { Project } from '../types';

export const getProjectLinkLabel = ({ codeUrl, linkLabel }: Project): string => {
  if (linkLabel) return linkLabel;
  const url = codeUrl.toLowerCase();
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'Watch Demo';
  if (url.includes('devpost.com')) return 'View on Devpost';
  if (url.includes('itch.io')) return 'Play on itch.io';
  if (url.includes('github.io')) return 'Play';
  return 'View Code';
};
