import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Header from './components/Header';
import Section from './components/Section';
import ProjectCard from './components/ProjectCard';
import Bubble from './components/Bubble';
import Fish from './components/Fish';
import Turtle from './components/Turtle';
import Jellyfish from './components/Jellyfish';
import Whale from './components/Whale';
import SandDune from './components/SandDune';
import GodRays from './components/GodRays';
import FishCensus from './components/FishCensus';
import LoveModeButton from './components/LoveModeButton';
import BackToTopButton from './components/BackToTopButton';
import FishFoodButton from './components/FishFoodButton';
import PortfolioContent from './components/PortfolioContent';
import ParticleCanvas, { ParticleCanvasRef } from './components/ParticleCanvas';
import GrabModeButton from './components/GrabModeButton';
import FishTank from './components/FishTank';
import TankToggleButton from './components/TankToggleButton';

const BASE_URL = import.meta.env.BASE_URL;
import ThemeToggleButton from './components/ThemeToggleButton';
import { GitHubIcon, LinkedInIcon, MailIcon, SearchIcon } from './components/Icons';
import { Project, Bubble as BubbleType, Experience, Fish as FishType, FishFood as FishFoodType, Education, FishBehavior } from './types';
import { useTheme } from './contexts/ThemeContext';

const SCROLL_PARALLAX = 1.0;
const DEFAULT_FISH_LIMIT = 75;
const MIN_FISH_LIMIT = 5;
const MAX_FISH_LIMIT = 150;
const LARGE_CREATURE_MIN_SEPARATION = 220;
const FISH_SPAWN_INTERVAL_MS = 600;
const PUFFER_FISH_CHANCE = 0.02;
const RAINBOW_FISH_CHANCE = 0.005;
const SCROLL_ACTIVE_WINDOW_MS = 140;
const FISH_SIMULATION_FPS = 30;
const FISH_SIMULATION_FRAME_MS = 1000 / FISH_SIMULATION_FPS;
const THEME_TRANSITION_MS = 900;
const SILHOUETTE_FADE_MS = 460;
const randomInRange = (minMs: number, maxMs: number) => minMs + Math.random() * (maxMs - minMs);

const WHALE_INITIAL_DELAY_MIN_MS = 2500;
const WHALE_INITIAL_DELAY_MAX_MS = 7000;
const WHALE_RESPAWN_DELAY_MIN_MS = 6000;
const WHALE_RESPAWN_DELAY_MAX_MS = 14000;

const TURTLE_INITIAL_DELAY_MIN_MS = 3000;
const TURTLE_INITIAL_DELAY_MAX_MS = 8000;
const TURTLE_RESPAWN_DELAY_MIN_MS = 7000;
const TURTLE_RESPAWN_DELAY_MAX_MS = 16000;

const JELLYFISH_INITIAL_DELAY_MIN_MS = 1500;
const JELLYFISH_INITIAL_DELAY_MAX_MS = 5000;
const JELLYFISH_RESPAWN_DELAY_MIN_MS = 4000;
const JELLYFISH_RESPAWN_DELAY_MAX_MS = 10000;
const JELLYFISH_COLORS: [string, string][] = [
  ['#fda4af', '#fb7185'],
  ['#f9a8d4', '#f472b6'],
  ['#fbcfe8', '#ec4899'],
  ['#fda4af', '#db2777'],
];

interface JellyPopRing {
  id: number;
  x: number;
  y: number;
  size: number;
  durationMs: number;
}

interface WhaleState {
  id: number;
  x: number;
  y: number;
  baseY: number;
  displayY: number;
  vx: number;
  scale: number;
  isFlipped: boolean;
  phase: number;
}

interface TurtleState {
  id: number;
  x: number;
  y: number;
  baseY: number;
  displayY: number;
  vx: number;
  scale: number;
  isFlipped: boolean;
  phase: number;
}

interface JellyfishState {
  id: number;
  x: number;
  y: number;
  baseY: number;
  displayY: number;
  vx: number;
  scale: number;
  isFlipped: boolean;
  phase: number;
  color1: string;
  color2: string;
}

const App: React.FC = () => {
  const { theme } = useTheme();
  const [bubbles, setBubbles] = useState<BubbleType[]>([]);
  const [fishes, setFishes] = useState<FishType[]>([]);
  const [isThemeTransitionActive, setIsThemeTransitionActive] = useState(false);
  const [themeTransitionDirection, setThemeTransitionDirection] = useState<'dive' | 'surface'>('dive');
  const [silhouetteFishes, setSilhouetteFishes] = useState<FishType[]>([]);
  const [showSilhouetteFishes, setShowSilhouetteFishes] = useState(false);
  const fishesRef = useRef<FishType[]>([]);
  const fishesByThemeRef = useRef<{ underwater: FishType[]; deepsea: FishType[] }>({ underwater: [], deepsea: [] });
  const previousThemeRef = useRef<'underwater' | 'deepsea'>(theme);
  const transitionTimerRef = useRef<number | null>(null);
  const silhouetteTimerRef = useRef<number | null>(null);
  useEffect(() => { fishesRef.current = fishes; }, [fishes]);
  useEffect(() => {
    // During a theme transition, this render still has previous theme's fish state.
    // Skip writing until the transition effect has completed to avoid cross-theme bleed.
    if (previousThemeRef.current !== theme) return;
    fishesByThemeRef.current[theme] = fishes;
  }, [theme, fishes]);
  useEffect(() => {
    const previousTheme = previousThemeRef.current;
    if (previousTheme === theme) return;

    const transitionDirection: 'dive' | 'surface' = theme === 'deepsea' ? 'dive' : 'surface';
    setThemeTransitionDirection(transitionDirection);
    setSilhouetteFishes(fishesRef.current);
    setShowSilhouetteFishes(true);
    setIsThemeTransitionActive(true);

    if (silhouetteTimerRef.current !== null) {
      window.clearTimeout(silhouetteTimerRef.current);
      silhouetteTimerRef.current = null;
    }
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    silhouetteTimerRef.current = window.setTimeout(() => {
      setShowSilhouetteFishes(false);
      silhouetteTimerRef.current = null;
    }, SILHOUETTE_FADE_MS);
    transitionTimerRef.current = window.setTimeout(() => {
      setIsThemeTransitionActive(false);
      setSilhouetteFishes([]);
      transitionTimerRef.current = null;
    }, THEME_TRANSITION_MS);

    // Persist the old theme's fish set, then restore the newly selected theme's set.
    fishesByThemeRef.current[previousTheme] = fishesRef.current;
    setFishes(fishesByThemeRef.current[theme] ?? []);

    setNibblingFishIds({});
    previousThemeRef.current = theme;
  }, [theme]);
  useEffect(() => {
    return () => {
      if (silhouetteTimerRef.current !== null) window.clearTimeout(silhouetteTimerRef.current);
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    };
  }, []);
  const [whale, setWhale] = useState<WhaleState | null>(null);
  const [turtle, setTurtle] = useState<TurtleState | null>(null);
  const [jellyfish, setJellyfish] = useState<JellyfishState | null>(null);
  const [fishFoods, setFishFoods] = useState<FishFoodType[]>([]);
  const [nibblingFishIds, setNibblingFishIds] = useState<Record<number, boolean>>({});
  const [fishLimit, setFishLimit] = useState(DEFAULT_FISH_LIMIT);
  const [highlightedBehavior, setHighlightedBehavior] = useState<FishBehavior | null>(null);
  const [isFishFoodMode, setIsFishFoodMode] = useState(false);
  const [isLoveMode, setIsLoveMode] = useState(false);
  const [deepSeaOrbs, setDeepSeaOrbs] = useState<{id:number;left:string;top:string;size:string;color:string;duration:string;delay:string;}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGrabMode, setIsGrabMode] = useState(false);
  const [grabbedFish, setGrabbedFish] = useState<FishType | null>(null);
  const [tankFishes, setTankFishes] = useState<FishType[]>([]);
  const [isTankOpen, setIsTankOpen] = useState(false);
  useEffect(() => { isGrabModeRef.current = isGrabMode; }, [isGrabMode]);
  useEffect(() => {
    const handleVisibility = () => { isPageHiddenRef.current = document.hidden; };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
  const particleCanvasRef = useRef<ParticleCanvasRef>(null);
  const scrollYRef = useRef(0);
  const worldLayerRef = useRef<HTMLDivElement>(null);
  const worldLayerForegroundRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const mousePosRef = useRef({ x: -1000, y: -1000 });
  const fishFoodsRef = useRef<FishFoodType[]>([]);
  const trailEmitRef = useRef<Record<number, number>>({});
  const grabbedFishRef = useRef<HTMLDivElement>(null);
  const nextWhaleSpawnRef = useRef(0);
  const nextTurtleSpawnRef = useRef(0);
  const nextJellyfishSpawnRef = useRef(0);
  const whaleRef = useRef<WhaleState | null>(null);
  const turtleRef = useRef<TurtleState | null>(null);
  const jellyfishRef = useRef<JellyfishState | null>(null);
  const firstLargeCreatureSideRef = useRef<'left' | 'right' | null>(null);
  const whaleHasSpawnedRef = useRef(false);
  const turtleHasSpawnedRef = useRef(false);
  const nextEntityIdRef = useRef(1);
  const fishLastFrameTimeRef = useRef(0);
  const whaleLastFrameTimeRef = useRef(0);
  const turtleLastFrameTimeRef = useRef(0);
  const jellyfishLastFrameTimeRef = useRef(0);
  const isPageHiddenRef = useRef(false);
  const shockwavesRef = useRef<{ id: number; x: number; worldY: number; timestamp: number }[]>([]);
  const lastScrollTimestampRef = useRef(0);
  const isGrabModeRef = useRef(isGrabMode);

  const getNextEntityId = useCallback(() => {
    const id = nextEntityIdRef.current;
    nextEntityIdRef.current += 1;
    return id;
  }, []);  const projects = useMemo<Project[]>(() => [
    {
      title: 'Cramsino',
      description: 'AI-powered study app that uses computer vision to detect focus and rewards studying with gacha-style card pulls. Won Best UI at JourneyHacks 2026.',
      image: `${BASE_URL}images/cramsino.jpg`,
      tags: ['Next.js', 'FastAPI', 'OpenCV', 'PostgreSQL', 'Hackathon'],
      codeUrl: 'https://devpost.com/software/cramsino',
    },
    {
      title: 'WitchDog',
      description: 'Real-time multiplayer trivia game built in Unity with Socket.IO networking and custom multi-phase gameplay.',
      image: `${BASE_URL}images/witch_dog.png`,
      tags: ['Unity', 'C#', 'Multiplayer', 'Hackathon'],
      codeUrl: 'https://devpost.com/software/witch-dog',
    },
    {
      title: 'Money Mango',
      description: 'Personal finance Android app prototype built with Android Studio and Kotlin. Features OCR receipt parsing, manual entry, tags, spending goals, reminders, and analytics.',
      image: `${BASE_URL}images/money_mango.png`,
      tags: ['Android', 'Kotlin', 'ML Kit', 'OCR', 'Mobile', 'Finance', 'Notifications', 'Analytics'],
      codeUrl: 'https://github.com/EvanDongChen/MoneyMango',
    },
    {
      title: 'Chord Breakers',
      description: '2D action game built in Unity with modular architecture, elemental combat, and AI using finite state machines.',
      image: `${BASE_URL}images/chord_breakers.png`,
      tags: ['Unity', 'C#', 'Game Development', 'Hackathon'],
      codeUrl: 'https://angrycow05.itch.io/chord-breaker',
    },
    {
      title: 'SAM for Medical Segmentation',
      description: 'Research project exploring Segment Anything Models for MRI brain tumor segmentation. Implemented fine-tuning and automated bounding box prompts.',
      image: `${BASE_URL}images/sam.png`,
      tags: ['Python', 'AI', 'Research', 'Medical Imaging'],
      codeUrl: 'https://www.youtube.com/watch?v=DGHAxlcROsQ',
    },
    {
      title: 'Library Database Application',
      description: 'Full-stack library platform with Flask and SQL. Automated 50% of manual tasks with complex database schema.',
      image: `${BASE_URL}images/library_database.png`,
      tags: ['Flask', 'SQL', 'JavaScript', 'HTML/CSS'],
      codeUrl: 'https://github.com/EvanDongChen/CMPT354-LibraryDataBase',
    },
    {
      title: 'WanderWise',
      description: 'AI-powered trip planner using React and Google APIs. Generates full-day plans in 5 seconds with real-time recommendations.',
      image: `${BASE_URL}images/wander_wise.png`,
      tags: ['React', 'AWS Amplify', 'Google APIs', 'AI'],
      codeUrl: 'https://www.youtube.com/watch?v=WI8YdPw-tSo',
    },
    {
      title: 'Krill Krushers',
      description: 'Unity 2D combat game inspired by vampire survivors. Created 50+ assets and won Best Entertainment Hack.',
      image: `${BASE_URL}images/krill_krushers.png`,
      tags: ['Unity', 'C#', 'Game Development', 'Team Leadership'],
      codeUrl: 'https://evandongchen.github.io/Krill-Krushers/',
    },
    {
      title: 'Lizard Wizard',
      description: '2D combat game where you combo elemental spells to defeat enemies. Built in Unity using C#.',
      image: `${BASE_URL}images/lizard_wizard.png`,
      tags: ['Unity', 'C#', 'Game Development', '2D', 'Combat', 'Elemental'],
      codeUrl: 'https://github.com/cna52/LizardWizard',
    },
    {
      title: 'Bird Game',
      description: 'Unity 2D roguelike with custom level generation. Designed 30+ original assets and core gameplay mechanics.',
      image: `${BASE_URL}images/bird_game.png`,
      tags: ['Unity', 'C#', 'Game Design', 'Aseprite'],
      codeUrl: 'https://evandongchen.github.io/Bird-Game/',
    },
    {
      title: 'Raccoon Game',
      description: '2.5D platformer game developed for Mountain Madness 2024. Won Most Mountainous award.',
      image: `${BASE_URL}images/racoon_game.png`,
      tags: ['Unity', 'Game Development', 'Hackathon', 'Incomplete'],
      codeUrl: 'https://github.com/emmyfong/racoongame',
    },
    {
      title: 'Dream On, Sing On',
      description: 'Web app for vocal/instrumental track separation with karaoke features. Displays synchronized lyrics for songs.',
      image: `${BASE_URL}images/dream_on_sing_on.png`,
      tags: ['React', 'Python', 'Spleeter', 'Audio Processing', 'Hackathon', 'Incomplete'],
      codeUrl: 'https://devpost.com/software/dream-on-sing-on',
    },
    {
      title: 'Pastry Panic',
      description: 'Stack-based cake game with leaderboard. Built with Unity and integrated into a React website with SQL database.',
      image: `${BASE_URL}images/pastry_panic.png`,
      tags: ['Unity', 'C#', 'React', 'SQL', 'JavaScript', 'Hackathon', 'Incomplete'],
      codeUrl: 'https://devpost.com/software/pastry-panic',
    },
  ], []);

  const education = useMemo<Education>(() => ({
    degree: 'Bachelor of Science, Computing Science',
    program: 'Zhejiang Dual Degree',
    university: 'Simon Fraser University, Burnaby, BC',
    period: 'Sep 2023 - Expected Jun 2027',
    gpa: '3.62 GPA'
  }), []);

  const experiences = useMemo<Experience[]>(() => [
    {
      role: 'Software Engineer Co-op',
      company: 'OSI Maritime Systems, Burnaby, BC',
      period: 'Jan 2026 - Present',
      description: [],
    },
    {
      role: 'Software Developer',
      company: 'SFU Robot Soccer Club (SFURS), BC',
      period: 'Feb 2025 - Present',
      description: [
        'Designed and implemented QML-based UI components supporting game state visualization.',
        'Built a real-time C++ backend that models the game and exposes state to a Qt/QML UI.',
        'Wrote unit tests with Boost.Test to validate core pathfinding and grid logic.',
        'Refactored C++ logic for system scalability and code readability.',
      ],
    },
    {
      role: 'Full Stack Engineer',
      company: 'Whitebox Coworking Inc., Remote',
      period: 'May 2025 - Aug 2025',
      description: [
        'Built a web platform and internal tools using Next.js, FastAPI, and MongoDB to manage content.',
        'Developed frontend with TypeScript and Tailwind CSS, implementing routing and state-driven logic.',
        'Implemented RESTful APIs and data models to support content management workflows.',
      ],
    },
  ], []);

  const skills = useMemo(() => ({
    languages: ['C', 'C#', 'C++', 'HTML/CSS', 'Java', 'JavaScript', 'Kotlin', 'Python', 'QML', 'SQL', 'TypeScript'],
    frameworksAndTools: ['CMake', 'Node.js', 'PyTorch', 'React.js', 'Unity', 'Android Studio', 'CI/CD', 'Figma', 'GitHub', 'GitLab', 'Linux', 'MongoDB', 'Plastic SCM', 'Visual Studio']
  }), []);

  const filteredProjects = useMemo(
    () => projects.filter(project =>
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [projects, searchTerm]
  );

  const createBubble = useCallback(() => {
    const id = getNextEntityId();
    const size = Math.random() * 60 + 20;
    const duration = Math.random() * 15 + 10;
    const newBubble: BubbleType = {
      id,
      left: `${Math.random() * 100}%`,
      size: `${size}px`,
      duration: `${duration}s`,
    };

    setBubbles(prev => [...prev, newBubble]);

    setTimeout(() => {
      setBubbles(prev => prev.filter(bubble => bubble.id !== id));
    }, duration * 1000 + 1000);
  }, [getNextEntityId]);

  const createFish = useCallback(() => {
    const id = getNextEntityId();
    const scale = Math.random() * 0.4 + 0.3;
    const speed = (Math.random() * 1 + 1);

    let x, y, vx, vy, isFlipped;

    if (Math.random() > 0.5) {
      x = -100;
      vx = speed;
      isFlipped = false;
    } else {
      x = window.innerWidth + 100;
      vx = -speed;
      isFlipped = true;
    }

    const viewportWorldTop = scrollYRef.current * SCROLL_PARALLAX;
    const viewportWorldBottom = viewportWorldTop + window.innerHeight;
    const spawnRoll = Math.random();

    if (spawnRoll < 0.6) {
      // Most fish spawn within the current viewport.
      y = viewportWorldTop + window.innerHeight * (0.05 + Math.random() * 0.9);
    } else if (spawnRoll < 0.84) {
      // Some fish spawn just above or below view to swim in naturally.
      const band = window.innerHeight * (0.25 + Math.random() * 0.35);
      y = Math.random() > 0.5 ? viewportWorldTop - band : viewportWorldBottom + band;
    } else {
      // A small percentage can spawn anywhere in the document.
      y = Math.random() * document.documentElement.scrollHeight;
    }
    vy = 0;
    let initialVx = vx;

    const underwaterPalette = [
      ['#4facfe', '#00f2fe'],
      ['#89f7fe', '#66a6ff'],
      ['#DA22FF', '#9733EE'],
      ['#00dbde', '#fc00ff'],
      ['#5433FF', '#20BDFF'],
      ['#48c6ef', '#6f86d6'],
      ['#a779e9', '#4facfe'],
    ];
    const deepSeaPalette = [
      ['#00d4ff', '#0077ff'],
      ['#ff2fcf', '#9d00ff'],
      ['#39ff14', '#00c853'],
      ['#ffe600', '#ffb300'],
    ];
    const fishPalette = theme === 'deepsea' ? deepSeaPalette : underwaterPalette;

    setFishes(prev => {
      if (prev.length >= fishLimit) {
        return prev;
      }

      const alreadyHasClown = prev.some(f => f.variant === 'clown');
      const alreadyHasPuffer = prev.some(f => f.variant === 'puffer');
      const variantRoll = Math.random();

      const variant: FishType['variant'] = theme === 'deepsea'
        ? 'default'
        : (!alreadyHasClown
          ? 'clown'
          : (!alreadyHasPuffer
            ? 'puffer'
            : (variantRoll < RAINBOW_FISH_CHANCE
              ? 'rainbow'
              : (variantRoll < RAINBOW_FISH_CHANCE + PUFFER_FISH_CHANCE ? 'puffer' : 'default'))));
      const [color1, color2] = fishPalette[Math.floor(Math.random() * fishPalette.length)];

      // Weighted random behavior: 48% cruise, 10% dart, 5% loiter, 25% conga, 12% curious
      const behaviorRoll = Math.random();
      const behavior: FishBehavior =
        behaviorRoll < 0.48 ? 'cruise' :
          behaviorRoll < 0.58 ? 'dart' :
            behaviorRoll < 0.63 ? 'loiter' :
              behaviorRoll < 0.88 ? 'conga' : 'curious';
      const behaviorPhase = Math.random() * Math.PI * 2;

      // Conga line: join existing group or start a new one
      let congaLeaderId: number | undefined;
      let congaIndex: number | undefined;
      if (behavior === 'conga') {
        const CONGA_MAX_SIZE = 8;
        // Find the group with most members that still has room
        const groups = new Map<number, { maxIdx: number; tail: FishType }>();
        for (const f of prev) {
          if (f.behavior === 'conga' && f.congaLeaderId !== undefined) {
            const g = groups.get(f.congaLeaderId);
            if (!g || (f.congaIndex ?? 0) > g.maxIdx) {
              groups.set(f.congaLeaderId, { maxIdx: f.congaIndex ?? 0, tail: f });
            }
          }
        }
        let joined = false;
        for (const [leaderId, { maxIdx, tail }] of groups) {
          const isTailOffscreen = tail.x < -20 || tail.x > window.innerWidth + 20;
          if (maxIdx < CONGA_MAX_SIZE - 1 && isTailOffscreen) {
            congaLeaderId = leaderId;
            congaIndex = maxIdx + 1;
            // Spawn just behind the current tail in its direction of travel
            const predAngle = Math.atan2(tail.vy, tail.vx);
            x = tail.x - Math.cos(predAngle) * 38;
            y = tail.y - Math.sin(predAngle) * 38;
            vx = tail.vx * 0.85;
            vy = tail.vy * 0.85;
            initialVx = tail.initialVx;
            isFlipped = tail.isFlipped;
            joined = true;
            break;
          }
        }
        if (!joined) {
          // This fish becomes the leader of a new conga group
          congaLeaderId = id;
          congaIndex = 0;
        }
      }

      const newFish: FishType = {
        id, x, y, displayY: y, vx, vy, initialVx,
        rotation: Math.atan2(vy, vx) * (180 / Math.PI),
        scale, color1, color2,
        isFlipped,
        schoolId: (() => {
          const xBand = Math.min(2, Math.floor((x / window.innerWidth) * 3));
          const spawnDisplayY = y - scrollYRef.current * SCROLL_PARALLAX;
          const yBand = spawnDisplayY < window.innerHeight / 2 ? 0 : 1;
          return xBand * 2 + yBand; // 0–5
        })(),
        variant,
        behavior,
        behaviorPhase,
        congaLeaderId,
        congaIndex,
      };

      return [...prev, newFish];
    });
  }, [fishLimit, getNextEntityId, theme]);

  // Keep fishFoodsRef in sync so animation loop can read it without stale closure
  useEffect(() => {
    fishFoodsRef.current = fishFoods;
  }, [fishFoods]);

  useEffect(() => {
    whaleRef.current = whale;
  }, [whale]);

  useEffect(() => {
    turtleRef.current = turtle;
  }, [turtle]);

  useEffect(() => {
    jellyfishRef.current = jellyfish;
  }, [jellyfish]);

  useEffect(() => {
    firstLargeCreatureSideRef.current = null;
    whaleHasSpawnedRef.current = false;
    turtleHasSpawnedRef.current = false;
  }, [theme]);

  const emitTrailBubble = useCallback((x: number, worldY: number) => {
    particleCanvasRef.current?.emitTrailBubble(x, worldY);
  }, []);

  const emitFoodCrumbs = useCallback((x: number, worldY: number, isLove?: boolean) => {
    particleCanvasRef.current?.emitFoodCrumbs(x, worldY, isLove);
  }, []);

  const emitHearts = useCallback((x: number, worldY: number) => {
    particleCanvasRef.current?.emitHearts(x, worldY);
  }, []);

  const emitJellyfishPop = useCallback((x: number, y: number, scale: number) => {
    particleCanvasRef.current?.emitJellyfishPop(x, y, scale);
  }, []);

  // Place fish food on click when food mode is active
  useEffect(() => {
    if (!isFishFoodMode) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.closest('button, a, input, [data-is-tank="true"]')) return;
      const id = getNextEntityId();
      const newFood: FishFoodType = {
        id,
        x: e.clientX,
        worldY: e.clientY + scrollYRef.current * SCROLL_PARALLAX,
        type: isLoveMode ? 'love' : 'default',
      };
      setFishFoods(prev => prev.length >= 10 ? prev : [...prev, newFood]);
      // Auto-decay after 15 seconds if uneaten
      setTimeout(() => {
        setFishFoods(prev => prev.filter(f => f.id !== id));
      }, 15000);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isFishFoodMode, isLoveMode, getNextEntityId]);

  // Global click ripples (only when not feeding fish)
  useEffect(() => {
    if (isFishFoodMode || isGrabMode) return;
    const handleRippleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const pufferEl = target.closest('[data-is-puffer="true"]');
      if (pufferEl) {
        const id = Number(pufferEl.getAttribute('data-fish-id'));
        setFishes(prev => prev.map(f => f.id === id ? { ...f, isPuffed: true, puffStartTime: performance.now() } : f));
        return;
      }

      if (target.closest('button, a, input, [data-is-tank="true"]')) return;
      const id = getNextEntityId();
      particleCanvasRef.current?.emitClickRipple(e.clientX, e.clientY, theme);

      shockwavesRef.current.push({
        id,
        x: e.clientX,
        worldY: e.clientY + scrollYRef.current * SCROLL_PARALLAX,
        timestamp: performance.now(),
      });
    };
    window.addEventListener('click', handleRippleClick);
    return () => window.removeEventListener('click', handleRippleClick);
  }, [isFishFoodMode, isGrabMode, getNextEntityId, theme]);

  // Crosshair cursor when food mode is active
  useEffect(() => {
    document.body.style.cursor = isFishFoodMode ? 'crosshair' : '';
    return () => { document.body.style.cursor = ''; };
  }, [isFishFoodMode]);

  const handleScroll = useCallback(() => {
    lastScrollTimestampRef.current = performance.now();
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollYRef.current = window.scrollY;
      if (worldLayerRef.current) {
        worldLayerRef.current.style.transform = `translate3d(0, ${-scrollYRef.current * SCROLL_PARALLAX}px, 0)`;
      }
      if (worldLayerForegroundRef.current) {
        worldLayerForegroundRef.current.style.transform = `translate3d(0, ${-scrollYRef.current * SCROLL_PARALLAX}px, 0)`;
      }
      scrollRafRef.current = null;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Sync world-layer offset immediately (important when page loads not at top).
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [handleScroll]);

  const handleGrabFish = useCallback((id: number, e?: React.MouseEvent) => {
    if (!isGrabMode || grabbedFish) return;
    e?.preventDefault();
    const fishToGrab = fishes.find(f => f.id === id);
    if (fishToGrab) {
      setGrabbedFish(fishToGrab);
      setFishes(prev => prev.filter(f => f.id !== id));
    }
  }, [isGrabMode, grabbedFish, fishes]);

  const handleDropFish = useCallback((clientX?: number, clientY?: number) => {
    if (!grabbedFish) return;

    const tankElement = document.querySelector('[data-is-tank="true"]');
    if (tankElement && clientX !== undefined && clientY !== undefined) {
      const rect = tankElement.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && 
          clientY >= rect.top && clientY <= rect.bottom) {
        // Drop into tank
        const localX = clientX - rect.left;
        const localY = clientY - rect.top;
        setTankFishes(prev => [...prev, { ...grabbedFish, x: localX, y: localY }]);
        setGrabbedFish(null);
        return;
      }
    }

    // Drop into ocean
    if (clientX !== undefined && clientY !== undefined) {
      setFishes(prev => [...prev, { 
        ...grabbedFish, 
        x: clientX, 
        y: clientY + scrollYRef.current * SCROLL_PARALLAX,
        displayY: clientY,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      }]);
    } else {
      // Fallback if no coords (shouldn't happen with mouseup)
      setFishes(prev => [...prev, grabbedFish]);
    }
    setGrabbedFish(null);
  }, [grabbedFish]);

  useEffect(() => {
    isGrabModeRef.current = isGrabMode;
  }, [isGrabMode]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (!grabbedFish) return;
    
    const handleGlobalMouseUp = (e: MouseEvent) => {
      handleDropFish(e.clientX, e.clientY);
    };
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (grabbedFishRef.current) {
        grabbedFishRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) rotate(15deg)`;
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [grabbedFish, handleDropFish]);

  const handleGrabFishFromTank = useCallback((fish: FishType) => {
    if (!isGrabMode || grabbedFish) return;
    setGrabbedFish(fish);
    setTankFishes(prev => prev.filter(f => f.id !== fish.id));
  }, [isGrabMode, grabbedFish]);

  const handleFishBreed = useCallback((baby: FishType) => {
    setTankFishes(prev => [...prev, baby]);
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    fishLastFrameTimeRef.current = 0;

    const animate = (timestamp: number) => {
      if (isPageHiddenRef.current) { animationFrameId = requestAnimationFrame(animate); return; }
      if (fishLastFrameTimeRef.current !== 0 && timestamp - fishLastFrameTimeRef.current < FISH_SIMULATION_FRAME_MS) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      fishLastFrameTimeRef.current = timestamp;

      const eatenFoodIds = new Set<number>();
      const nibbleTriggers = new Set<number>();
      const crumbBursts: Array<{ x: number; worldY: number, isLove?: boolean }> = [];
      const matingTriggers = new Map<number, { partnerId: number, center: { x: number, y: number } }>();
      const frameTimeSeconds = timestamp * 0.001;

      const currentFishes = fishesRef.current;
      const foods = fishFoodsRef.current;
      const loveFoodAssignments = new Map<number, number[]>();
      const spiralTriggers = new Set<number>();
      const assignedForLove = new Set<number>();        
      foods.filter(f => f.type === 'love').forEach(food => {
        const potentialFishes: Array<FishType & { dist: number }> = [];
        currentFishes.forEach(f => {
          if (f.behavior === 'mating' || assignedForLove.has(f.id)) return;
          const dist = Math.hypot(f.x - food.x, f.y - food.worldY);
          if (dist < 450) {
            potentialFishes.push({ ...f, dist } as any);
          }
        });

        if (potentialFishes.length >= 2) {
          // Sort by distance to food and take the closest two, regardless of species
          potentialFishes.sort((a, b) => a.dist - b.dist);
          const pair = potentialFishes.slice(0, 2);
          
          pair.forEach(nf => assignedForLove.add(nf.id));
          loveFoodAssignments.set(food.id, pair.map(f => f.id));
          
          const EAT_RADIUS = 35;
          if (pair.some(f => f.dist < EAT_RADIUS)) {
            matingTriggers.set(pair[0].id, { partnerId: pair[1].id, center: { x: food.x, y: food.worldY } });
            matingTriggers.set(pair[1].id, { partnerId: pair[0].id, center: { x: food.x, y: food.worldY } });
            eatenFoodIds.add(food.id);
          }
        }
      });

      // Coordinate spiral starts
      currentFishes.forEach(fish => {
        if (fish.behavior === 'mating' && fish.readyToSpiral && !fish.matingSpiralStartTime) {
          const partner = fishById.get(fish.matingPartnerId!);
          if (partner?.readyToSpiral) {
            spiralTriggers.add(fish.id);
            spiralTriggers.add(partner.id);
          }
        }
      });

      const DEFAULT_EAT_RADIUS = 30;
      currentFishes.forEach(fish => {
        if (fish.behavior === 'mating') return;
        for (const food of foods) {
          if (food.type === 'love' || eatenFoodIds.has(food.id)) continue;
          const dist = Math.hypot(fish.x - food.x, fish.y - food.worldY);
          if (dist < DEFAULT_EAT_RADIUS) {
            eatenFoodIds.add(food.id);
            nibbleTriggers.add(fish.id);
            crumbBursts.push({ x: food.x, worldY: food.worldY, isLove: false });
          }
        }
      });

      // ── Per-frame acceleration structures ──────────────────────────────────
      // Map<id, fish> for O(1) partner / predecessor lookups.
      const fishById = new Map<number, FishType>();
      // Spatial grid (cell size = SCHOOL_RADIUS) for O(1) neighbor queries.
      const CELL_SIZE = 140;
      const spatialGrid = new Map<string, FishType[]>();
      // Conga predecessor map: `${leaderId}_${index}` → fish.
      const congaPredMap = new Map<string, FishType>();

      for (const f of currentFishes) {
        fishById.set(f.id, f);
        const cx = Math.floor(f.x / CELL_SIZE);
        const cy = Math.floor(f.y / CELL_SIZE);
        const key = `${cx},${cy}`;
        const cell = spatialGrid.get(key);
        if (cell) cell.push(f);
        else spatialGrid.set(key, [f]);
        if (f.behavior === 'conga' && f.congaLeaderId !== undefined && f.congaIndex !== undefined) {
          congaPredMap.set(`${f.congaLeaderId}_${f.congaIndex}`, f);
        }
      }

      // Simulation constants hoisted from the per-fish loop.
      const SCARE_RADIUS = 150;
      const FLEE_STRENGTH = 6;
      const MAX_SPEED_FLEE = 5;
      const MAX_SPEED_CRUISE = 2;
      const FOOD_ATTRACT_RADIUS = 500;
      const FOOD_ATTRACT_STRENGTH = 0.25;
      const MAX_SPEED_FOOD = 3.5;
      const TURN_SPEED = 0.1;
      const RETURN_TO_HORIZONTAL_STRENGTH = 0.05;
      const WANDER_STRENGTH = 0.1;
      const SCHOOL_RADIUS = 140;
      const SEPARATION_RADIUS = 68;
      const ALIGN_STRENGTH = 0.015;
      const COHESION_STRENGTH = 0.006;
      const SEPARATION_STRENGTH = 0.12;
      const MAX_NEIGHBORS_CONSIDERED = 8;
      const SCHOOL_SPEED_BOOST = 0.55;
      const MAX_SPEED_SCHOOL = 3.5;

      setFishes(currentFishes => {
        const next = currentFishes.map(fish => {
          let { x, y, vx, vy, rotation, initialVx, isFlipped } = fish;
          let newBehavior = fish.behavior;
          let newCuriousTimer = fish.curiousTimer || 0;
          let newMatingStartTime = fish.matingStartTime;
          let newMatingPartnerId = fish.matingPartnerId;
          let newMatingCenter = fish.matingCenter;
          let newMatingSpiralStartTime = fish.matingSpiralStartTime;
          let newReadyToSpiral = fish.readyToSpiral;
          let newIsPuffed = fish.isPuffed;
          let newPuffStartTime = fish.puffStartTime;

          if (newIsPuffed && newPuffStartTime && (timestamp - newPuffStartTime > 3500)) {
            newIsPuffed = false;
            newPuffStartTime = undefined;
          }

          if (matingTriggers.has(fish.id)) {
            const trigger = matingTriggers.get(fish.id)!;
            newBehavior = 'mating';
            newMatingStartTime = timestamp;
            newMatingPartnerId = trigger.partnerId;
            newMatingCenter = trigger.center;
            newReadyToSpiral = false;
            newMatingSpiralStartTime = undefined;
          }
          if (spiralTriggers.has(fish.id)) {
            newMatingSpiralStartTime = timestamp;
          }

          const prevVx = vx;
          const prevVy = vy;

          const screenY = y - scrollYRef.current * SCROLL_PARALLAX;
          const dxMouse = x - mousePosRef.current.x;
          const dyMouse = screenY - mousePosRef.current.y;
          const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

          let isFleeing = false;

          // Check physical shockwaves
          if (!isGrabModeRef.current) {
            for (const wave of shockwavesRef.current) {
              const age = timestamp - wave.timestamp;
              if (age < 500) {
                const dx = x - wave.x;
                const dy = y - wave.worldY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const BLAST_RADIUS = 350;
                if (dist < BLAST_RADIUS) {
                  const force = (1 - dist / BLAST_RADIUS) * 3.5;
                  const angle = Math.atan2(dy, dx);
                  vx += Math.cos(angle) * force;
                  vy += Math.sin(angle) * force;
                  isFleeing = true;
                  if (fish.behavior === 'conga') {
                    newBehavior = 'dart';
                  }
                }
              }
            }
          }

          if (!isGrabModeRef.current && fish.variant !== 'puffer' && fish.behavior !== 'curious' && fish.behavior !== 'mating' && distanceMouse < SCARE_RADIUS) {
            const angle = Math.atan2(dyMouse, dxMouse);
            vx += Math.cos(angle) * FLEE_STRENGTH;
            vy += Math.sin(angle) * FLEE_STRENGTH;
            isFleeing = true;
          }

          if (isFleeing) {
            const fleeCap = MAX_SPEED_FLEE + 0.8;
            const currentSpeed = Math.sqrt(vx * vx + vy * vy);
            if (currentSpeed > fleeCap) {
              vx = (vx / currentSpeed) * fleeCap;
              vy = (vy / currentSpeed) * fleeCap;
            }
          } else {
            // Find food
            let closestFood: FishFoodType | null = null;
            let closestDist = Infinity;
            for (const food of foods) {
              const fdx = food.x - x;
              const fdy = food.worldY - y;
              const dist = Math.sqrt(fdx * fdx + fdy * fdy);
              if (food.type === 'love') {
                const assigned = loveFoodAssignments.get(food.id);
                if (!assigned || !assigned.includes(fish.id)) continue;
              }
              if (dist < closestDist) {
                closestDist = dist;
                closestFood = food;
              }
            }

            if (closestFood && closestDist < FOOD_ATTRACT_RADIUS) {
              const fdx = closestFood.x - x;
              const fdy = closestFood.worldY - y;
              const angle = Math.atan2(fdy, fdx);
              vx += Math.cos(angle) * FOOD_ATTRACT_STRENGTH;
              vy += Math.sin(angle) * FOOD_ATTRACT_STRENGTH;
              const currentSpeed = Math.sqrt(vx * vx + vy * vy);
              if (currentSpeed > MAX_SPEED_FOOD) {
                vx = (vx / currentSpeed) * MAX_SPEED_FOOD;
                vy = (vy / currentSpeed) * MAX_SPEED_FOOD;
              }
              if (closestDist < DEFAULT_EAT_RADIUS && closestFood.type === 'love') {
                nibbleTriggers.add(fish.id);
                crumbBursts.push({ x: closestFood.x, worldY: closestFood.worldY, isLove: true });
              }
            } else if (fish.behavior === 'mating' && fish.matingStartTime && fish.matingCenter) {
              if (fish.matingSpiralStartTime) {
                const elapsed = timestamp - fish.matingSpiralStartTime;
                const SPIRAL_DURATION = 4500;
                const t = Math.min(1, elapsed / SPIRAL_DURATION);
                if (t >= 1) {
                  newBehavior = 'cruise';
                  if (fish.matingPartnerId && fish.id < fish.matingPartnerId) {
                    const cx = fish.matingCenter.x;
                    const cy = fish.matingCenter.y;
                    emitHearts(cx, cy);
                    setTimeout(() => {
                      const babyId = getNextEntityId();
                      setFishes(prev => {
                        // Much higher safety cap for mating births (250) to ensure babies usually spawn
                        if (prev.length >= 250) return prev; 
                        
                        const babyFish: FishType = {
                          ...fish,
                          id: babyId,
                          birthTime: timestamp,
                          x: cx,
                          y: cy,
                          scale: fish.scale, // Base scale (adult size)
                          behavior: 'cruise',
                          behaviorPhase: Math.random() * Math.PI * 2,
                          initialVx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.0),
                          congaLeaderId: undefined,
                          congaIndex: undefined,
                          readyToSpiral: false,
                          matingSpiralStartTime: undefined,
                          matingStartTime: undefined,
                          matingPartnerId: undefined
                        };
                        return [...prev, babyFish];
                      });
                    }, 50);
                  }
                } else {
                  const START_RADIUS = 65;
                  const END_RADIUS = 12;
                  const currentRadius = START_RADIUS - (START_RADIUS - END_RADIUS) * t;
                  const ORBIT_SPEED = 0.006 + (t * 0.005);
                  const isTop = fish.id < (fish.matingPartnerId ?? 0);
                  const angle = (elapsed * ORBIT_SPEED) + (isTop ? -Math.PI/2 : Math.PI/2);
                  const tx = fish.matingCenter.x + Math.cos(angle) * currentRadius;
                  const ty = fish.matingCenter.y + Math.sin(angle) * currentRadius;
                  vx = (tx - x) * 0.55;
                  vy = (ty - y) * 0.55;
                  rotation = (angle + Math.PI / 2) * (180 / Math.PI);
                }
              } else {
                const isTop = fish.id < (fish.matingPartnerId ?? 0);
                const START_RADIUS = 65;
                const tx = fish.matingCenter.x;
                const ty = fish.matingCenter.y + (isTop ? -START_RADIUS : START_RADIUS);
                const dx = tx - x;
                const dy = ty - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const MAX_STEER_SPEED = 4.5;
                const STEER_STRENGTH = 0.3;
                if (dist > 8) {
                  const targetAngle = Math.atan2(dy, dx);
                  vx += (Math.cos(targetAngle) * MAX_STEER_SPEED - vx) * STEER_STRENGTH;
                  vy += (Math.sin(targetAngle) * MAX_STEER_SPEED - vy) * STEER_STRENGTH;
                  (fish as any).isPreamble = true;
                } else {
                  vx = dx * 0.2;
                  vy = dy * 0.2;
                  (fish as any).isPreamble = false; // Stop following velocity rotation
                  const targetTangent = isTop ? 0 : 180;
                  let deltaH = targetTangent - rotation;
                  if (deltaH > 180) deltaH -= 360;
                  if (deltaH < -180) deltaH += 360;
                  rotation += deltaH * 0.25;
                  if (Math.abs(deltaH) < 5) {
                    newReadyToSpiral = true;
                  }
                }
              }
            } else if (fish.behavior === 'conga') {
              const CONGA_SPEED = 4.2;
              const CONGA_GAP = 36;
              if (fish.congaIndex === 0) {
                vy += Math.sin(frameTimeSeconds * 1.6 + fish.behaviorPhase) * 0.22;
                vx += (initialVx > 0 ? CONGA_SPEED : -CONGA_SPEED) * 0.12;
                const leaderSpd = Math.sqrt(vx * vx + vy * vy);
                if (leaderSpd > CONGA_SPEED) {
                  vx = (vx / leaderSpd) * CONGA_SPEED;
                  vy = (vy / leaderSpd) * CONGA_SPEED;
                }
              } else {
                const pred = congaPredMap.get(`${fish.congaLeaderId}_${(fish.congaIndex ?? 1) - 1}`);
                if (pred) {
                  const predSpd = Math.sqrt(pred.vx * pred.vx + pred.vy * pred.vy);
                  const predAngle = Math.atan2(pred.vy, pred.vx);
                  const tx = pred.x - Math.cos(predAngle) * CONGA_GAP;
                  const ty = pred.y - Math.sin(predAngle) * CONGA_GAP;
                  const dx = tx - x;
                  const dy = ty - y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  vx += dx * 0.22;
                  vy += dy * 0.22;
                  const targetSpd = predSpd + (dist > CONGA_GAP * 1.5 ? 1.2 : 0);
                  const mySpd = Math.sqrt(vx * vx + vy * vy);
                  if (mySpd > 0.001) {
                    vx = (vx / mySpd) * targetSpd;
                    vy = (vy / mySpd) * targetSpd;
                  }
                } else {
                  newBehavior = 'cruise';
                }
              }
            } else if (fish.behavior === 'dart') {
              const DART_PERIOD = 3.5;
              const dartPhase = (frameTimeSeconds * (1 / DART_PERIOD) + fish.behaviorPhase) % 1;
              if (dartPhase < 0.12) {
                const burstStrength = Math.sin(dartPhase * (Math.PI / 0.12)) * 0.55;
                const spd = Math.sqrt(vx * vx + vy * vy);
                if (spd > 0.001) {
                  vx += (vx / spd) * burstStrength;
                  vy += (vy / spd) * burstStrength;
                }
              }
              vy += Math.sin(frameTimeSeconds * 2.2 + fish.behaviorPhase) * 0.04;
              vx += (initialVx - vx) * RETURN_TO_HORIZONTAL_STRENGTH;
              vy += (0 - vy) * RETURN_TO_HORIZONTAL_STRENGTH * 0.6;
              const dartSpd = Math.sqrt(vx * vx + vy * vy);
              if (dartSpd > 4.5) {
                vx = (vx / dartSpd) * 4.5;
                vy = (vy / dartSpd) * 4.5;
              }
            } else if (fish.behavior === 'loiter') {
              vx += Math.cos(frameTimeSeconds * 0.35 + fish.behaviorPhase) * 0.08;
              vy += Math.sin(frameTimeSeconds * 0.70 + fish.behaviorPhase) * 0.12;
              vx += (initialVx > 0 ? 0.12 : -0.12 - vx) * 0.08;
              const loiterSpd = Math.sqrt(vx * vx + vy * vy);
              if (loiterSpd > 1.4) {
                vx = (vx / loiterSpd) * 1.4;
                vy = (vy / loiterSpd) * 1.4;
              }
            } else if (fish.behavior === 'curious') {
              if (distanceMouse < 320) {
                const angleToward = Math.atan2(-dyMouse, -dxMouse);
                vx += Math.cos(angleToward) * 0.18;
                vy += Math.sin(angleToward) * 0.18;
                newCuriousTimer++;
              } else {
                vx += (initialVx - vx) * RETURN_TO_HORIZONTAL_STRENGTH;
                vy += (0 - vy) * RETURN_TO_HORIZONTAL_STRENGTH;
                vy += (Math.random() - 0.5) * WANDER_STRENGTH;
                if (newCuriousTimer > 0) newCuriousTimer--;
              }
              if (newCuriousTimer > 300) {
                newBehavior = 'cruise';
                newCuriousTimer = 0;
              }
              const curiousSpd = Math.sqrt(vx * vx + vy * vy);
              if (curiousSpd > 3.8) {
                vx = (vx / curiousSpd) * 3.8;
                vy = (vy / curiousSpd) * 3.8;
              }
            } else {
              // Cruise (schooling)
              vx += (initialVx - vx) * RETURN_TO_HORIZONTAL_STRENGTH;
              vy += (0 - vy) * RETURN_TO_HORIZONTAL_STRENGTH;
              vy += (Math.random() - 0.5) * WANDER_STRENGTH;

              const fishDisplayY = y - scrollYRef.current * SCROLL_PARALLAX;
              const isOffscreen = fishDisplayY < -400 || fishDisplayY > window.innerHeight + 400;

              let neighborCount = 0;
              let alignX = 0, alignY = 0, centerX = 0, centerY = 0, separationX = 0, separationY = 0;

              if (!isOffscreen) {
                const fcx = Math.floor(x / CELL_SIZE);
                const fcy = Math.floor(y / CELL_SIZE);
                neighborScan:
                for (let dcx = -1; dcx <= 1; dcx++) {
                  for (let dcy = -1; dcy <= 1; dcy++) {
                    const neighbors = spatialGrid.get(`${fcx + dcx},${fcy + dcy}`);
                    if (!neighbors) continue;
                    for (const other of neighbors) {
                      if (other.id === fish.id) continue;
                      const dx = other.x - x;
                      const dy = other.y - y;
                      const distSq = dx * dx + dy * dy;
                      if (distSq > SCHOOL_RADIUS * SCHOOL_RADIUS) continue;
                      const dist = Math.sqrt(distSq);
                      if (dist < SEPARATION_RADIUS && dist > 0.001) {
                        separationX -= dx / dist;
                        separationY -= dy / dist;
                      }
                      if (other.schoolId === fish.schoolId) {
                        neighborCount++;
                        alignX += other.vx; alignY += other.vy;
                        centerX += other.x; centerY += other.y;
                        if (neighborCount >= MAX_NEIGHBORS_CONSIDERED) break neighborScan;
                      }
                    }
                  }
                }
              }

              vx += separationX * SEPARATION_STRENGTH;
              vy += separationY * SEPARATION_STRENGTH;

              if (neighborCount > 0) {
                alignX = alignX / neighborCount - vx;
                alignY = alignY / neighborCount - vy;
                vx += alignX * ALIGN_STRENGTH;
                vy += alignY * ALIGN_STRENGTH;
                centerX /= neighborCount;
                centerY /= neighborCount;
                vx += (centerX - x) * COHESION_STRENGTH;
                vy += (centerY - y) * COHESION_STRENGTH;

                const pattern = fish.schoolId % 3;
                if (pattern === 0) vy += Math.sin(frameTimeSeconds * 0.6 + fish.schoolId * 1.3) * 0.06;
                else if (pattern === 1) {
                  const surgePhase = (frameTimeSeconds * 0.25 + fish.schoolId * 0.7) % 1;
                  if (surgePhase < 0.18) {
                    const surgeStrength = Math.sin(surgePhase * (Math.PI / 0.18)) * 0.18;
                    const spd = Math.sqrt(vx * vx + vy * vy);
                    if (spd > 0.001) { vx += (vx / spd) * surgeStrength; vy += (vy / spd) * surgeStrength; }
                  }
                } else {
                  vy += Math.sin(frameTimeSeconds * 1.4 + fish.schoolId * 2.1) * 0.09;
                  vx += Math.cos(frameTimeSeconds * 0.9 + fish.schoolId * 1.7) * 0.025;
                }

                const speed = Math.sqrt(vx * vx + vy * vy);
                const schoolTargetSpeed = Math.min(MAX_SPEED_CRUISE + SCHOOL_SPEED_BOOST, MAX_SPEED_SCHOOL);
                if (speed > 0.001 && speed < schoolTargetSpeed) {
                  vx += (vx / speed) * 0.12; vy += (vy / speed) * 0.12;
                }
                const finalSpeed = Math.sqrt(vx * vx + vy * vy);
                if (finalSpeed > MAX_SPEED_SCHOOL) {
                  vx = (vx / finalSpeed) * MAX_SPEED_SCHOOL;
                  vy = (vy / finalSpeed) * MAX_SPEED_SCHOOL;
                }
              } else {
                const currentSpeed = Math.sqrt(vx * vx + vy * vy);
                if (currentSpeed > MAX_SPEED_CRUISE) {
                  vx = (vx / currentSpeed) * MAX_SPEED_CRUISE;
                  vy = (vy / currentSpeed) * MAX_SPEED_CRUISE;
                }
              }
            }
          }

          if (newIsPuffed) {
            vx *= 0.15;
            vy = (vy * 0.15) - 0.12;
          }

          x += vx;
          y += vy;

          // Keep puffer fish persistent by wrapping it around the screen instead of letting it swim off and respawning.
          // This prevents the 'teleportation' effect when a new fish is randomly chosen to be the puffer.
          if (fish.variant === 'puffer') {
            if (vx > 0 && x > window.innerWidth + 200) x = -200;
            else if (vx < 0 && x < -200) x = window.innerWidth + 200;
          }

          let delta = 0;
          if (newBehavior !== 'mating' || (fish as any).isPreamble) {
            const targetRotation = Math.atan2(vy, vx) * (180 / Math.PI);
            delta = targetRotation - rotation;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            rotation += delta * TURN_SPEED;
          }

          // Leave tiny bubble trails when fish sharply turn or accelerate.
          const accelMagnitude = Math.hypot(vx - prevVx, vy - prevVy);
          const turnMagnitude = Math.abs(delta);
          const now = timestamp;
          const lastEmit = trailEmitRef.current[fish.id] ?? 0;
          if (theme === 'underwater' && (accelMagnitude > 0.14 || turnMagnitude > 7.5) && now - lastEmit > 170 && Math.random() > 0.4) {
            trailEmitRef.current[fish.id] = now;
            const direction = vx === 0 ? (isFlipped ? -1 : 1) : Math.sign(vx);
            emitTrailBubble(x - direction * (26 * fish.scale), y + (Math.random() - 0.5) * 6);
          }

          const fishDisplayY = fish.variant === 'puffer' 
            ? y - scrollYRef.current * SCROLL_PARALLAX 
            : y;

          return { 
            ...fish, 
            behavior: newBehavior, 
            curiousTimer: newCuriousTimer, 
            x, y, displayY: fishDisplayY, vx, vy, rotation,
            matingStartTime: newMatingStartTime,
            matingPartnerId: newMatingPartnerId,
            matingCenter: newMatingCenter,
            matingSpiralStartTime: newMatingSpiralStartTime,
            readyToSpiral: newReadyToSpiral,
            isPuffed: newIsPuffed,
            puffStartTime: newPuffStartTime,
          };
        })
          .filter(fish =>
            fish.x > -200 && fish.x < window.innerWidth + 200
          );

        // Keep clown/puffer guarantees in underwater only.
        if (theme === 'underwater' && next.length > 0 && !next.some(f => f.variant === 'clown')) {
          const idx = Math.floor(Math.random() * next.length);
          next[idx] = { ...next[idx], variant: 'clown' };
        }

        if (theme === 'underwater' && next.length > 0 && !next.some(f => f.variant === 'puffer')) {
          // Prefer non-clown fish for puffer
          const availableIdxs = next.map((f, i) => f.variant !== 'clown' ? i : -1).filter(i => i !== -1);
          const targetIdx = availableIdxs.length > 0 ? availableIdxs[Math.floor(Math.random() * availableIdxs.length)] : Math.floor(Math.random() * next.length);
          next[targetIdx] = { ...next[targetIdx], variant: 'puffer' };
        }

        return next;
      }
      );

      if (eatenFoodIds.size > 0) {
        setFishFoods(prev => {
          const next = prev.filter(f => !eatenFoodIds.has(f.id));
          fishFoodsRef.current = next; // Sync ref immediately
          return next;
        });
      }

      if (nibbleTriggers.size > 0) {
        const ids = Array.from(nibbleTriggers);
        setNibblingFishIds(prev => {
          const next = { ...prev };
          ids.forEach(id => {
            next[id] = true;
          });
          return next;
        });

        ids.forEach(id => {
          setTimeout(() => {
            setNibblingFishIds(prev => {
              if (!prev[id]) return prev;
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }, 280);
        });
      }

      if (crumbBursts.length > 0) {
        crumbBursts.forEach(burst => emitFoodCrumbs(burst.x, burst.worldY, (burst as any).isLove));
      }

      // Cleanup old shockwaves
      shockwavesRef.current = shockwavesRef.current.filter(w => timestamp - w.timestamp < 1000);

      if (particleCanvasRef.current) {
        particleCanvasRef.current.setScrollY(scrollYRef.current);
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    if (theme === 'underwater' || theme === 'deepsea') {
      animationFrameId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [theme, emitTrailBubble, emitFoodCrumbs]);

  useEffect(() => {
    if (theme === 'underwater') {
      // --- Accelerating burst for first 3.5 seconds ---
      const BURST_DURATION_MS = 3500;
      const BURST_FISH_INTERVAL_MS = 45;
      const BURST_BUBBLE_INTERVAL_MS = 75;

      const burstFishInterval = setInterval(createFish, BURST_FISH_INTERVAL_MS);
      const burstBubbleInterval = setInterval(createBubble, BURST_BUBBLE_INTERVAL_MS);

      let steadyFishInterval: ReturnType<typeof setInterval>;
      let steadyBubbleInterval: ReturnType<typeof setInterval>;

      const burstTimeout = setTimeout(() => {
        clearInterval(burstFishInterval);
        clearInterval(burstBubbleInterval);
        // Transition to normal steady-state intervals
        steadyFishInterval = setInterval(createFish, FISH_SPAWN_INTERVAL_MS);
        steadyBubbleInterval = setInterval(createBubble, 500);
      }, BURST_DURATION_MS);

      return () => {
        clearTimeout(burstTimeout);
        clearInterval(burstFishInterval);
        clearInterval(burstBubbleInterval);
        clearInterval(steadyFishInterval);
        clearInterval(steadyBubbleInterval);
      };
    } else if (theme === 'deepsea') {
      setBubbles([]);
      // Burst of fish into the abyss, then steady trickle — no bubbles in deep sea
      const BURST_DURATION_MS = 3500;
      const BURST_FISH_INTERVAL_MS = 45;
      const burstFishInterval = setInterval(createFish, BURST_FISH_INTERVAL_MS);
      let steadyFishInterval: ReturnType<typeof setInterval>;
      const burstTimeout = setTimeout(() => {
        clearInterval(burstFishInterval);
        steadyFishInterval = setInterval(createFish, FISH_SPAWN_INTERVAL_MS);
      }, BURST_DURATION_MS);
      return () => {
        clearTimeout(burstTimeout);
        clearInterval(burstFishInterval);
        clearInterval(steadyFishInterval);
      };
    }
  }, [theme, createBubble, createFish]);

  useEffect(() => {
    if (fishesRef.current.length <= fishLimit) return;
    setFishes(prev => prev.slice(0, fishLimit));
  }, [fishLimit]);

  const DEEPSEA_ORB_COLORS = ['#00ff9f', '#ff006e', '#7b2fff', '#00e5ff', '#39ff14', '#ff4d6d', '#00b4d8', '#f72585'];
  useEffect(() => {
    if (theme === 'deepsea') {
      const orbs = Array.from({ length: 28 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}vw`,
        top: `${Math.random() * 100}vh`,
        size: `${Math.random() * 6 + 2}px`,
        color: DEEPSEA_ORB_COLORS[Math.floor(Math.random() * DEEPSEA_ORB_COLORS.length)],
        duration: `${Math.random() * 5 + 4}s`,
        delay: `${-Math.random() * 8}s`,
      }));
      setDeepSeaOrbs(orbs);
    } else {
      setDeepSeaOrbs([]);
    }
  }, [theme]);

  useEffect(() => {
    let animationFrameId: number;

    const randomWhaleDelay = () => randomInRange(WHALE_RESPAWN_DELAY_MIN_MS, WHALE_RESPAWN_DELAY_MAX_MS);
    if (nextWhaleSpawnRef.current === 0) {
      nextWhaleSpawnRef.current = performance.now() + randomInRange(WHALE_INITIAL_DELAY_MIN_MS, WHALE_INITIAL_DELAY_MAX_MS);
    }

    const animateWhale = (timestamp: number) => {
      if (isPageHiddenRef.current) { animationFrameId = requestAnimationFrame(animateWhale); return; }
      if (timestamp - whaleLastFrameTimeRef.current < FISH_SIMULATION_FRAME_MS) { animationFrameId = requestAnimationFrame(animateWhale); return; }
      whaleLastFrameTimeRef.current = timestamp;
      if (theme !== 'underwater') {
        setWhale(null);
        nextWhaleSpawnRef.current = timestamp + randomInRange(WHALE_INITIAL_DELAY_MIN_MS, WHALE_INITIAL_DELAY_MAX_MS);
        return;
      }

      setWhale(current => {
        if (!current) {
          if (timestamp < nextWhaleSpawnRef.current) return null;

          let fromLeft = Math.random() > 0.5;
          if (!whaleHasSpawnedRef.current) {
            if (turtleHasSpawnedRef.current && firstLargeCreatureSideRef.current) {
              fromLeft = firstLargeCreatureSideRef.current === 'left' ? false : true;
            } else {
              firstLargeCreatureSideRef.current = fromLeft ? 'left' : 'right';
            }
          }
          const scale = 1.0 + Math.random() * 0.5;
          const speed = 0.4 + Math.random() * 0.35;
          const x = fromLeft ? -420 : window.innerWidth + 420;
          const viewportWorldTop = scrollYRef.current * SCROLL_PARALLAX;
          const minSpawnY = viewportWorldTop + window.innerHeight * 0.12;
          const maxSpawnY = viewportWorldTop + window.innerHeight * 0.88;
          let baseY = viewportWorldTop + window.innerHeight * (0.15 + Math.random() * 0.65);
          const turtleY = turtleRef.current?.y;
          if (typeof turtleY === 'number' && Math.abs(baseY - turtleY) < LARGE_CREATURE_MIN_SEPARATION) {
            const shifted = turtleY + (baseY < turtleY ? -LARGE_CREATURE_MIN_SEPARATION : LARGE_CREATURE_MIN_SEPARATION);
            baseY = Math.max(minSpawnY, Math.min(maxSpawnY, shifted));
            if (Math.abs(baseY - turtleY) < LARGE_CREATURE_MIN_SEPARATION) {
              nextWhaleSpawnRef.current = timestamp + 900;
              return null;
            }
          }
          const y = baseY;

          whaleHasSpawnedRef.current = true;
          if (!firstLargeCreatureSideRef.current) {
            firstLargeCreatureSideRef.current = fromLeft ? 'left' : 'right';
          }

          return {
            id: getNextEntityId(),
            x,
            y,
            baseY,
            displayY: y - scrollYRef.current * SCROLL_PARALLAX,
            vx: fromLeft ? speed : -speed,
            scale,
            isFlipped: !fromLeft,
            phase: Math.random() * Math.PI * 2,
          };
        }

        const x = current.x + current.vx;
        const y = current.baseY + Math.sin(timestamp / 1400 + current.phase) * 12;
        const displayY = y - scrollYRef.current * SCROLL_PARALLAX;

        if (x < -520 || x > window.innerWidth + 520) {
          nextWhaleSpawnRef.current = timestamp + randomWhaleDelay();
          return null;
        }

        return { ...current, x, y, displayY };
      });

      animationFrameId = requestAnimationFrame(animateWhale);
    };

    if (theme === 'underwater') {
      animationFrameId = requestAnimationFrame(animateWhale);
    } else {
      setWhale(null);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [theme, getNextEntityId]);

  useEffect(() => {
    let animationFrameId: number;

    const randomTurtleDelay = () => randomInRange(TURTLE_RESPAWN_DELAY_MIN_MS, TURTLE_RESPAWN_DELAY_MAX_MS);
    if (nextTurtleSpawnRef.current === 0) {
      nextTurtleSpawnRef.current = performance.now() + randomInRange(TURTLE_INITIAL_DELAY_MIN_MS, TURTLE_INITIAL_DELAY_MAX_MS);
    }

    const animateTurtle = (timestamp: number) => {
      if (isPageHiddenRef.current) { animationFrameId = requestAnimationFrame(animateTurtle); return; }
      if (timestamp - turtleLastFrameTimeRef.current < FISH_SIMULATION_FRAME_MS) { animationFrameId = requestAnimationFrame(animateTurtle); return; }
      turtleLastFrameTimeRef.current = timestamp;
      if (theme !== 'underwater') {
        setTurtle(null);
        nextTurtleSpawnRef.current = timestamp + randomInRange(TURTLE_INITIAL_DELAY_MIN_MS, TURTLE_INITIAL_DELAY_MAX_MS);
        return;
      }

      setTurtle(current => {
        if (!current) {
          if (timestamp < nextTurtleSpawnRef.current) return null;

          let fromLeft = Math.random() > 0.5;
          if (!turtleHasSpawnedRef.current) {
            if (whaleHasSpawnedRef.current && firstLargeCreatureSideRef.current) {
              fromLeft = firstLargeCreatureSideRef.current === 'left' ? false : true;
            } else {
              firstLargeCreatureSideRef.current = fromLeft ? 'left' : 'right';
            }
          }
          const scale = 0.8 + Math.random() * 0.45;
          const speed = 0.28 + Math.random() * 0.24;
          const x = fromLeft ? -260 : window.innerWidth + 260;
          const viewportWorldTop = scrollYRef.current * SCROLL_PARALLAX;
          const minSpawnY = viewportWorldTop + window.innerHeight * 0.14;
          const maxSpawnY = viewportWorldTop + window.innerHeight * 0.9;
          let baseY = viewportWorldTop + window.innerHeight * (0.2 + Math.random() * 0.65);
          const whaleY = whaleRef.current?.y;
          if (typeof whaleY === 'number' && Math.abs(baseY - whaleY) < LARGE_CREATURE_MIN_SEPARATION) {
            const shifted = whaleY + (baseY < whaleY ? -LARGE_CREATURE_MIN_SEPARATION : LARGE_CREATURE_MIN_SEPARATION);
            baseY = Math.max(minSpawnY, Math.min(maxSpawnY, shifted));
            if (Math.abs(baseY - whaleY) < LARGE_CREATURE_MIN_SEPARATION) {
              nextTurtleSpawnRef.current = timestamp + 900;
              return null;
            }
          }

          turtleHasSpawnedRef.current = true;
          if (!firstLargeCreatureSideRef.current) {
            firstLargeCreatureSideRef.current = fromLeft ? 'left' : 'right';
          }

          return {
            id: getNextEntityId(),
            x,
            y: baseY,
            baseY,
            displayY: baseY - scrollYRef.current * SCROLL_PARALLAX,
            vx: fromLeft ? speed : -speed,
            scale,
            isFlipped: !fromLeft,
            phase: Math.random() * Math.PI * 2,
          };
        }

        let vx = current.vx;
        let baseY = current.baseY; // world-space Y
        const jelly = jellyfishRef.current;

        if (jelly) {
          // Steer X toward jellyfish
          const dx = jelly.x - current.x;
          const desiredDirection = dx >= 0 ? 1 : -1;
          const desiredSpeed = Math.min(1.2, Math.max(0.42, Math.abs(dx) * 0.004 + 0.35));
          vx += (desiredDirection * desiredSpeed - vx) * 0.075;
          // Steer Y toward jellyfish world Y
          baseY += (jelly.y - baseY) * 0.025;
        }

        // No viewport clamping — turtle lives at a fixed world position
        // and disappears naturally when you scroll away from it

        const x = current.x + vx;
        const y = baseY + Math.sin(timestamp / 1800 + current.phase) * 9;
        const displayY = y - scrollYRef.current * SCROLL_PARALLAX;

        if (x < -320 || x > window.innerWidth + 320) {
          nextTurtleSpawnRef.current = timestamp + randomTurtleDelay();
          return null;
        }

        return { ...current, x, y, baseY, displayY, vx, isFlipped: vx < 0 };
      });

      animationFrameId = requestAnimationFrame(animateTurtle);
    };

    if (theme === 'underwater') {
      animationFrameId = requestAnimationFrame(animateTurtle);
    } else {
      setTurtle(null);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [theme, getNextEntityId]);

  useEffect(() => {
    let animationFrameId: number;

    const randomJellyfishDelay = () => randomInRange(JELLYFISH_RESPAWN_DELAY_MIN_MS, JELLYFISH_RESPAWN_DELAY_MAX_MS);
    if (nextJellyfishSpawnRef.current === 0) {
      nextJellyfishSpawnRef.current = performance.now() + randomInRange(JELLYFISH_INITIAL_DELAY_MIN_MS, JELLYFISH_INITIAL_DELAY_MAX_MS);
    }

    const animateJellyfish = (timestamp: number) => {
      if (isPageHiddenRef.current) { animationFrameId = requestAnimationFrame(animateJellyfish); return; }
      if (timestamp - jellyfishLastFrameTimeRef.current < FISH_SIMULATION_FRAME_MS) { animationFrameId = requestAnimationFrame(animateJellyfish); return; }
      jellyfishLastFrameTimeRef.current = timestamp;
      if (theme !== 'underwater') {
        setJellyfish(null);
        nextJellyfishSpawnRef.current = timestamp + randomInRange(JELLYFISH_INITIAL_DELAY_MIN_MS, JELLYFISH_INITIAL_DELAY_MAX_MS);
        return;
      }

      setJellyfish(current => {
        if (!current) {
          if (timestamp < nextJellyfishSpawnRef.current) return null;

          const fromLeft = Math.random() > 0.5;
          const scale = 0.9 + Math.random() * 0.55;
          const speed = 0.18 + Math.random() * 0.17;
          const x = fromLeft ? -120 : window.innerWidth + 120;
          const viewportWorldTop = scrollYRef.current * SCROLL_PARALLAX;
          const baseY = viewportWorldTop + window.innerHeight * (0.15 + Math.random() * 0.65);
          const [color1, color2] = JELLYFISH_COLORS[Math.floor(Math.random() * JELLYFISH_COLORS.length)];

          return {
            id: getNextEntityId(),
            x,
            y: baseY,
            baseY,
            displayY: baseY - scrollYRef.current * SCROLL_PARALLAX,
            vx: fromLeft ? speed : -speed,
            scale,
            isFlipped: !fromLeft,
            phase: Math.random() * Math.PI * 2,
            color1,
            color2,
          };
        }

        const turtle = turtleRef.current;
        if (turtle) {
          const dx = turtle.x - current.x;
          const dy = turtle.y - current.y;
          const eatRadius = (45 * turtle.scale) + (28 * current.scale);
          if ((dx * dx + dy * dy) < (eatRadius * eatRadius)) {
            const scrollWorldOffset = scrollYRef.current * SCROLL_PARALLAX;
            const turtleCenterX = turtle.x + 90 * turtle.scale;
            const turtleCenterY = (turtle.y - scrollWorldOffset) + 55 * turtle.scale;
            const jellyCenterX = current.x + 40 * current.scale;
            const jellyCenterY = (current.y - scrollWorldOffset) + 50 * current.scale;
            const popX = (turtleCenterX + jellyCenterX) * 0.5;
            const popY = (turtleCenterY + jellyCenterY) * 0.5;
            emitJellyfishPop(popX, popY, current.scale);
            nextJellyfishSpawnRef.current = timestamp + randomJellyfishDelay();
            return null;
          }
        }

        const x = current.x + current.vx;
        const y = current.baseY + Math.sin(timestamp / 2200 + current.phase) * 20;
        const displayY = y - scrollYRef.current * SCROLL_PARALLAX;

        if (x < -160 || x > window.innerWidth + 160) {
          nextJellyfishSpawnRef.current = timestamp + randomJellyfishDelay();
          return null;
        }

        return { ...current, x, y, displayY };
      });

      animationFrameId = requestAnimationFrame(animateJellyfish);
    };

    if (theme === 'underwater') {
      animationFrameId = requestAnimationFrame(animateJellyfish);
    } else {
      setJellyfish(null);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [theme, getNextEntityId, emitJellyfishPop]);

  const colors = theme === 'underwater' ? {
    text: 'text-cyan-100', textLighter: 'text-cyan-100/90', highlight: 'text-cyan-300',
    highlightStrong: 'text-cyan-200', border: 'border-cyan-400/20', timeline: 'bg-cyan-400/30',
    timelineDot: 'bg-cyan-500', timelineDotBorder: 'border-[#002851]', cardBg: 'bg-black/20',
    tagBg: 'bg-cyan-900/50', tagHoverBg: 'hover:bg-cyan-800/70', toolTagBg: 'bg-slate-800/50',
    toolTagHoverBg: 'hover:bg-slate-700/70', searchBg: 'bg-slate-900/50', searchBorder: 'border-cyan-400/30',
    searchRing: 'focus:ring-cyan-400', searchPlaceholder: 'placeholder-cyan-200/50', periodBg: 'bg-[#004e92]',
    heroGradient: 'from-cyan-300 to-blue-400', contactIcon: 'text-cyan-300'
  } : {
    text: 'text-emerald-100', textLighter: 'text-emerald-100/80', highlight: 'text-emerald-300',
    highlightStrong: 'text-emerald-200', border: 'border-emerald-400/15', timeline: 'bg-emerald-400/25',
    timelineDot: 'bg-emerald-400', timelineDotBorder: 'border-black', cardBg: 'bg-black/50',
    tagBg: 'bg-emerald-900/40', tagHoverBg: 'hover:bg-emerald-800/60', toolTagBg: 'bg-slate-900/60',
    toolTagHoverBg: 'hover:bg-slate-800/70', searchBg: 'bg-black/60', searchBorder: 'border-emerald-400/25',
    searchRing: 'focus:ring-emerald-400', searchPlaceholder: 'placeholder-emerald-200/40', periodBg: 'bg-[#001208]',
    heroGradient: 'from-emerald-300 to-cyan-400', contactIcon: 'text-emerald-300'
  };


  const worldTransitionClass = isThemeTransitionActive
    ? (themeTransitionDirection === 'dive' ? 'theme-transition-world-dive' : 'theme-transition-world-surface')
    : '';
  const fishEnterClass = isThemeTransitionActive ? 'theme-fish-enter' : '';

  return (
    <div className={`relative min-h-screen text-white overflow-x-hidden transition-colors duration-1000 ${
      grabbedFish ? 'select-none cursor-grabbing' : ''
    } ${theme === 'underwater'
      ? 'bg-gradient-to-br from-[#000428] via-[#004e92] to-[#1CB5E0]'
      : 'bg-gradient-to-b from-[#000000] via-[#000508] to-[#000c14]'
      }`}>
      <style>{`
      `}</style>
      <ParticleCanvas ref={particleCanvasRef} />
      {/* Background Aquarium Layer: Environment and Large Creatures */}
      <div className={`fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none ${worldTransitionClass}`}>
        {theme === 'underwater' ? (
          <>
            <GodRays />
            {bubbles.map(bubble => (
              <Bubble key={bubble.id} {...bubble} />
            ))}
            {whale && <Whale x={whale.x} displayY={whale.displayY} scale={whale.scale} isFlipped={whale.isFlipped} />}
            {turtle && <Turtle x={turtle.x} displayY={turtle.displayY} scale={turtle.scale} isFlipped={turtle.isFlipped} />}
          </>
        ) : (
          // Deep Sea: bioluminescent plankton orbs only.
          <>
            {deepSeaOrbs.map(orb => (
              <div
                key={orb.id}
                className="bio-orb"
                style={{
                  left: orb.left,
                  top: orb.top,
                  width: orb.size,
                  height: orb.size,
                  backgroundColor: orb.color,
                  boxShadow: `0 0 ${parseInt(orb.size) * 3}px ${parseInt(orb.size) * 2}px ${orb.color}55`,
                  '--orb-duration': orb.duration,
                  '--orb-delay': orb.delay,
                } as React.CSSProperties}
              />
            ))}
          </>
        )}
      </div>
      {isThemeTransitionActive && (
        <div
          className={`fixed inset-0 pointer-events-none z-[5] ${themeTransitionDirection === 'dive' ? 'theme-transition-sweep-dive' : 'theme-transition-sweep-surface'}`}
        />
      )}

      {isThemeTransitionActive && showSilhouetteFishes && silhouetteFishes.length > 0 && (
        <div className={`fixed inset-0 w-full h-full pointer-events-none z-[25] ${themeTransitionDirection === 'dive' ? 'theme-fish-silhouette-out' : 'theme-fish-silhouette-out'}`}>
          {silhouetteFishes.map((fish) => {
            const viewportY = fish.y - scrollYRef.current * SCROLL_PARALLAX;
            if (viewportY < -220 || viewportY > window.innerHeight + 220) return null;
            return (
              <Fish
                key={`silhouette-${fish.id}`}
                {...fish}
                displayY={viewportY}
                isSilhouette
              />
            );
          })}
        </div>
      )}

      {/* Interaction Layer: Fish, Food, and Grab Mechanics */}
      <div
        className={`fixed inset-0 w-full h-full pointer-events-none ${worldTransitionClass} ${fishEnterClass} ${isGrabMode ? 'z-[50]' : 'z-20'}`}
      >
        {(theme === 'underwater' || theme === 'deepsea') && (() => {
          // Optimization: Partition and cull fish in a single pass to avoid multiple filter/map operations in render
          const viewportTop = scrollYRef.current * SCROLL_PARALLAX;
          const bgFishes: JSX.Element[] = [];
          const fgFishes: JSX.Element[] = [];
          const isDeepSea = theme === 'deepsea';

          fishes.forEach(fish => {
            const worldY = fish.y - viewportTop;
            if (worldY < -400 || worldY > window.innerHeight + 400) return;

            const element = (
              <Fish
                key={fish.id}
                {...fish}
                isNibbling={Boolean(nibblingFishIds[fish.id])}
                isFaded={highlightedBehavior !== null && fish.behavior !== highlightedBehavior}
                isHighlighted={highlightedBehavior !== null && fish.behavior === highlightedBehavior}
                isGrabMode={isGrabMode}
                isDeepSea={isDeepSea}
                onMouseDown={handleGrabFish}
              />
            );

            if (fish.variant === 'clown' || fish.variant === 'puffer' || fish.variant === 'rainbow') {
              fgFishes.push(element);
            } else {
              bgFishes.push(element);
            }
          });

          return (
            <>
              {/* Background World Layer: Regular fish swimming behind the content */}
              <div
                ref={worldLayerRef}
                style={{ 
                  position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', 
                  willChange: 'transform', zIndex: 0
                }}
              >
                {bgFishes}
                {fishFoods.filter(f => f.type !== 'love').map(food => (
                  <div
                    key={food.id}
                    className="absolute w-3 h-3 bg-amber-400 rounded-full blur-[1px] animate-bounce"
                    style={{
                      left: food.x,
                      top: food.worldY,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 1
                    }}
                  />
                ))}
              </div>

              {/* Foreground World Layer: Clown and Puffer fish swimming above the content */}
              <div
                ref={worldLayerForegroundRef}
                style={{ 
                  position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', 
                  willChange: 'transform', zIndex: isGrabMode ? 50 : 20
                }}
              >
                {fgFishes}
                {fishFoods.filter(f => f.type === 'love').map(food => (
                  <div
                    key={food.id}
                    className="absolute w-6 h-6 text-pink-400 drop-shadow-[0_0_10px_rgba(244,114,182,0.8)] rounded-full blur-[1px] animate-bounce flex items-center justify-center"
                    style={{
                      left: food.x,
                      top: food.worldY,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 1
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>

      {theme === 'underwater' && (
        <div className={`fixed inset-0 z-20 pointer-events-none ${worldTransitionClass}`}>
          {jellyfish && (
            <Jellyfish
              id={jellyfish.id}
              x={jellyfish.x}
              displayY={jellyfish.displayY}
              scale={jellyfish.scale}
              isFlipped={jellyfish.isFlipped}
              color1={jellyfish.color1}
              color2={jellyfish.color2}
            />
          )}
        </div>
      )}


      <PortfolioContent
        theme={theme}
        colors={colors}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filteredProjects={filteredProjects}
        experiences={experiences}
        education={education}
        skills={skills}
      />
      <BackToTopButton />
      <ThemeToggleButton />
      {(theme === 'underwater' || theme === 'deepsea') && (
        <>
          <div className="fixed bottom-8 left-24 z-40 w-56 px-1 opacity-50">
            <div className="mb-1 flex items-center justify-between text-xs text-cyan-100/90">
              <span className="font-semibold tracking-wide">Fish Count</span>
              <span className="font-semibold">{fishLimit}</span>
            </div>
            <input
              type="range"
              min={MIN_FISH_LIMIT}
              max={MAX_FISH_LIMIT}
              value={fishLimit}
              onChange={(e) => setFishLimit(Number(e.target.value))}
              className="w-full accent-cyan-400 opacity-90 hover:opacity-100 transition-opacity"
              aria-label="Fish spawn limit"
            />
          </div>
          <FishCensus 
            fishes={fishes} 
            highlightedBehavior={highlightedBehavior} 
            onHighlightBehavior={setHighlightedBehavior} 
          />
          <LoveModeButton 
            isActive={isLoveMode} 
            onToggle={() => {
              if (isLoveMode) {
                setIsLoveMode(false);
                setIsFishFoodMode(false);
              } else {
                setIsLoveMode(true);
                setIsFishFoodMode(true);
              }
            }} 
          />
        </>
      )}
      <FishFoodButton isActive={isFishFoodMode && !isLoveMode} onToggle={() => {
        if (isFishFoodMode && !isLoveMode) {
          setIsFishFoodMode(false);
        } else {
          setIsFishFoodMode(true);
          setIsLoveMode(false);
          setIsGrabMode(false);
        }
      }} />

      <GrabModeButton isActive={isGrabMode} onToggle={() => {
        const nextMode = !isGrabMode;
        setIsGrabMode(nextMode);
        if (nextMode) {
          setIsTankOpen(true); // Open tank when entering grab mode
          setIsFishFoodMode(false);
          setIsLoveMode(false);
        }
      }} />

      <TankToggleButton 
        isActive={isTankOpen} 
        onToggle={() => setIsTankOpen(!isTankOpen)} 
        count={tankFishes.length}
      />

      <FishTank 
        isOpen={isTankOpen} 
        onClose={() => setIsTankOpen(false)} 
        tankFishes={tankFishes}
        onDropFish={handleDropFish}
        onGrabFishFromTank={handleGrabFishFromTank}
        onFishBreed={handleFishBreed}
        isGrabMode={isGrabMode}
        hasGrabbedFish={!!grabbedFish}
        isFishFoodMode={isFishFoodMode}
        isLoveMode={isLoveMode}
      />

      {grabbedFish && (
        <div 
          ref={grabbedFishRef}
          className="fixed pointer-events-none z-[100]"
          style={{ 
            left: 0, 
            top: 0,
            transform: `translate(${mousePosRef.current.x}px, ${mousePosRef.current.y}px) translate(-50%, -50%) rotate(15deg)`
          }}
        >
          <Fish {...grabbedFish} x={0} displayY={0} rotation={0} />
          {/* Net visual under the fish */}
          <div className="absolute inset-0 bg-white/20 rounded-full blur-xl -z-10 scale-150"></div>
        </div>
      )}
    </div>
  );
};

export default App;