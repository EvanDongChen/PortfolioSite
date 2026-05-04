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

export type FishBehavior = 'cruise' | 'dart' | 'loiter' | 'conga' | 'curious' | 'mating';

export type FishVariant = 'default' | 'clown' | 'puffer' | 'rainbow';

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
  variant?: FishVariant;
  behavior: FishBehavior;
  behaviorPhase: number; // per-fish random offset for behavior oscillations
  congaLeaderId?: number; // conga: shared group id (= leader's fish.id)
  congaIndex?: number;    // conga: 0 = leader, 1+ = follower
  curiousTimer?: number;  // track how long a fish has been curious
  matingStartTime?: number; // timestamp when mating started
  matingPartnerId?: number; // id of the partner
  matingCenter?: { x: number; y: number }; // center of the mating circle
  matingSpiralStartTime?: number; // timestamp when spiral actually started
  readyToSpiral?: boolean; // whether this fish reached pole and is horizontal
  birthTime?: number;
  isPuffed?: boolean;
  puffStartTime?: number;
}

export interface FishFood {
  id: number;
  x: number;     // absolute x (same as fish x)
  worldY: number; // world y, same space as Fish.y
  type?: 'default' | 'love';
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
