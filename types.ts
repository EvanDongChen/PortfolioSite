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

export type FishBehavior = 'cruise' | 'swirl' | 'dart' | 'loiter' | 'conga';

export interface Fish {
  id: number;
  x: number;
  y: number;
  displayY: number;
  vx: number;
  vy: number;
  initialVx: number;
  rotation: number;
  scale: number;
  color1: string;
  color2: string;
  isFlipped: boolean;
  schoolId: number;
  variant?: 'default' | 'clown';
  behavior: FishBehavior;
  behaviorPhase: number; // per-fish random offset for behavior oscillations
  swirlCx: number;      // swirl: orbit center x
  swirlCy: number;      // swirl: orbit center y
  swirlAngle: number;   // swirl: current angle in radians
  swirlRadius: number;  // swirl: orbit radius
  congaLeaderId?: number; // conga: shared group id (= leader's fish.id)
  congaIndex?: number;    // conga: 0 = leader, 1+ = follower
}

export interface FishFood {
  id: number;
  x: number;     // absolute x (same as fish x)
  worldY: number; // world y, same space as Fish.y
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
