export interface Project {
  title: string;
  description: string;
  image: string;
  tags: string[];
  codeUrl: string;
}

export interface Bubble {
  id: number;
  left: string;
  size: string;
  duration: string;
}

export interface Experience {
  role: string;
  company: string;
  period: string;
  description: string[];
}

export interface Education {
  degree: string;
  program: string;
  university: string;
  period: string;
  gpa: string;
}

export interface Fish {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  initialVx: number;
  rotation: number;
  scale: number;
  color1: string;
  color2: string;
  isFlipped: boolean;
}

export interface Star {
  id: number;
  left: string;
  top: string;
  size: string;
  duration: string;
}

export interface ShootingStar {
  id: number;
  top: string;
  left: string;
  duration: string;
  delay: string;
  rotation: number;
}

// Fix: Add missing Nebula and Planet type definitions.
export interface Nebula {
  id: number;
  top: string;
  left: string;
  size: string;
  color1: string;
  color2: string;
  rotation: number;
  animationDelay: string;
}

export interface Planet {
  id: number;
  top: string;
  left: string;
  size: string;
  gradientColors: string[];
  shadowColor: string;
  animationDelay: string;
}
