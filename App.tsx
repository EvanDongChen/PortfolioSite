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
import BackToTopButton from './components/BackToTopButton';
import FishFoodButton from './components/FishFoodButton';
import Star from './components/Star';
import ShootingStar from './components/ShootingStar';
import CursorNebula from './components/CursorNebula';

const BASE_URL = import.meta.env.BASE_URL;
import ThemeToggleButton from './components/ThemeToggleButton';
import { GitHubIcon, LinkedInIcon, MailIcon, SearchIcon } from './components/Icons';
import { Project, Bubble as BubbleType, Experience, Fish as FishType, FishFood as FishFoodType, Education, Star as StarType, ShootingStar as ShootingStarType } from './types';
import { useTheme } from './contexts/ThemeContext';

const SCROLL_PARALLAX = 1.0;
const DEFAULT_FISH_LIMIT = 50;
const MIN_FISH_LIMIT = 5;
const MAX_FISH_LIMIT = 150;
const LARGE_CREATURE_MIN_SEPARATION = 220;
const FISH_SPAWN_INTERVAL_MS = 600;
const CLOWN_FISH_CHANCE = 0.12;
const SCROLL_ACTIVE_WINDOW_MS = 140;
const FISH_SIMULATION_FPS = 30;
const FISH_SIMULATION_FRAME_MS = 1000 / FISH_SIMULATION_FPS;
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

interface FishTrailParticle {
  id: number;
  x: number;
  worldY: number;
  size: number;
  durationMs: number;
  driftX: number;
}

interface FoodCrumbParticle {
  id: number;
  x: number;
  worldY: number;
  size: number;
  durationMs: number;
  driftX: number;
  driftY: number;
}

interface JellyPopParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  durationMs: number;
  driftX: number;
  driftY: number;
}

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
  const [whale, setWhale] = useState<WhaleState | null>(null);
  const [turtle, setTurtle] = useState<TurtleState | null>(null);
  const [jellyfish, setJellyfish] = useState<JellyfishState | null>(null);
  const [fishFoods, setFishFoods] = useState<FishFoodType[]>([]);
  const [trailParticles, setTrailParticles] = useState<FishTrailParticle[]>([]);
  const [foodCrumbs, setFoodCrumbs] = useState<FoodCrumbParticle[]>([]);
  const [jellyPopParticles, setJellyPopParticles] = useState<JellyPopParticle[]>([]);
  const [jellyPopRings, setJellyPopRings] = useState<JellyPopRing[]>([]);
  const [nibblingFishIds, setNibblingFishIds] = useState<Record<number, boolean>>({});
  const [fishLimit, setFishLimit] = useState(DEFAULT_FISH_LIMIT);
  const [isFishFoodMode, setIsFishFoodMode] = useState(false);
  const [stars, setStars] = useState<StarType[]>([]);
  const [shootingStars, setShootingStars] = useState<ShootingStarType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollYRef = useRef(0);
  const worldLayerRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const mousePosRef = useRef({ x: -1000, y: -1000 });
  const fishesRef = useRef<FishType[]>([]);
  const fishFoodsRef = useRef<FishFoodType[]>([]);
  const trailEmitRef = useRef<Record<number, number>>({});
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
  const lastScrollTimestampRef = useRef(0);

  const getNextEntityId = useCallback(() => {
    const id = nextEntityIdRef.current;
    nextEntityIdRef.current += 1;
    return id;
  }, []);

  // Spinnable profile photo
  const [photoRotation, setPhotoRotation] = useState(0);
  const photoSpinRef = useRef({ isDragging: false, lastX: 0, velocity: 0, rotation: 0, idleFrames: 0 });
  const photoAnimRef = useRef<number>(0);

  useEffect(() => {
    const spin = photoSpinRef.current;
    const animate = () => {
      if (!spin.isDragging && Math.abs(spin.velocity) > 0.1) {
        spin.velocity *= 0.97;
        spin.rotation += spin.velocity;
        spin.idleFrames = 0;
        setPhotoRotation(spin.rotation);
      } else if (!spin.isDragging) {
        spin.velocity = 0;
        spin.idleFrames++;

        // After ~1 second of idle (60 frames), smoothly return to 0
        if (spin.idleFrames > 60 && Math.abs(spin.rotation % 360) > 0.5) {
          // Normalize rotation to nearest equivalent within [-180, 180]
          let target = spin.rotation % 360;
          if (target > 180) target -= 360;
          if (target < -180) target += 360;
          spin.rotation -= target * 0.06;
          // Snap when close enough
          if (Math.abs(spin.rotation % 360) < 0.5) {
            spin.rotation = 0;
          }
          setPhotoRotation(spin.rotation);
        }
      }
      photoAnimRef.current = requestAnimationFrame(animate);
    };
    photoAnimRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(photoAnimRef.current);
  }, []);

  const handlePhotoPointerDown = useCallback((e: React.PointerEvent) => {
    const spin = photoSpinRef.current;
    spin.isDragging = true;
    spin.lastX = e.clientX;
    spin.velocity = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePhotoPointerMove = useCallback((e: React.PointerEvent) => {
    const spin = photoSpinRef.current;
    if (!spin.isDragging) return;
    const deltaX = e.clientX - spin.lastX;
    spin.velocity = deltaX * 2;
    spin.rotation += deltaX * 2;
    spin.lastX = e.clientX;
    setPhotoRotation(spin.rotation);
  }, []);

  const handlePhotoPointerUp = useCallback(() => {
    photoSpinRef.current.isDragging = false;
  }, []);



  const projects = useMemo<Project[]>(() => [
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
    const initialVx = vx;

    const colors = [
      ['#4facfe', '#00f2fe'],
      ['#89f7fe', '#66a6ff'],
      ['#DA22FF', '#9733EE'],
      ['#00dbde', '#fc00ff'],
      ['#5433FF', '#20BDFF'],
      ['#48c6ef', '#6f86d6'],
      ['#a779e9', '#4facfe'],
    ];

    setFishes(prev => {
      if (prev.length >= fishLimit) {
        return prev;
      }

      const alreadyHasClown = prev.some(f => f.variant === 'clown');
      const variant: FishType['variant'] = !alreadyHasClown
        ? 'clown'
        : 'default';
      const [color1, color2] = colors[Math.floor(Math.random() * colors.length)];

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
      };

      return [...prev, newFish];
    });
  }, [fishLimit, getNextEntityId]);

  const createShootingStar = useCallback(() => {
    const id = getNextEntityId();
    const duration = Math.random() * 3 + 2;
    const newShootingStar: ShootingStarType = {
      id,
      top: `${Math.random() * 100}%`,
      left: '-200px',
      duration: `${duration}s`,
      delay: `${Math.random() * 10}s`,
      rotation: Math.random() * 45 + 10,
    };
    setShootingStars(prev => [...prev, newShootingStar]);
    setTimeout(() => {
      setShootingStars(prev => prev.filter(s => s.id !== id));
    }, (duration + 10) * 1000);
  }, [getNextEntityId]);

  // Keep fishFoodsRef in sync so animation loop can read it without stale closure
  useEffect(() => {
    fishFoodsRef.current = fishFoods;
  }, [fishFoods]);

  useEffect(() => {
    fishesRef.current = fishes;
  }, [fishes]);

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
    const id = getNextEntityId();
    const durationMs = 650 + Math.random() * 450;
    const newParticle: FishTrailParticle = {
      id,
      x,
      worldY,
      size: 3 + Math.random() * 4,
      durationMs,
      driftX: (Math.random() - 0.5) * 20,
    };

    setTrailParticles(prev => {
      const next = [...prev, newParticle];
      return next.length > 160 ? next.slice(next.length - 160) : next;
    });

    setTimeout(() => {
      setTrailParticles(prev => prev.filter(p => p.id !== id));
    }, durationMs + 100);
  }, [getNextEntityId]);

  const emitFoodCrumbs = useCallback((x: number, worldY: number) => {
    const particles = Array.from({ length: 6 }, () => {
      const id = getNextEntityId();
      const durationMs = 280 + Math.random() * 220;
      const crumb: FoodCrumbParticle = {
        id,
        x: x + (Math.random() - 0.5) * 12,
        worldY: worldY + (Math.random() - 0.5) * 8,
        size: 2 + Math.random() * 2.5,
        durationMs,
        driftX: (Math.random() - 0.5) * 26,
        driftY: -10 - Math.random() * 20,
      };

      setTimeout(() => {
        setFoodCrumbs(prev => prev.filter(p => p.id !== id));
      }, durationMs + 60);

      return crumb;
    });

    setFoodCrumbs(prev => {
      const next = [...prev, ...particles];
      return next.length > 140 ? next.slice(next.length - 140) : next;
    });
  }, [getNextEntityId]);

  const emitJellyfishPop = useCallback((x: number, y: number, scale: number) => {
    const ringId = getNextEntityId();
    const ringDurationMs = 420;
    const ringSize = 26 + scale * 26;

    setJellyPopRings(prev => {
      const next = [...prev, { id: ringId, x, y, size: ringSize, durationMs: ringDurationMs }];
      return next.length > 10 ? next.slice(next.length - 10) : next;
    });

    setTimeout(() => {
      setJellyPopRings(prev => prev.filter(ring => ring.id !== ringId));
    }, ringDurationMs + 60);

    const particles = Array.from({ length: 12 }, () => {
      const id = getNextEntityId();
      const angle = Math.random() * Math.PI * 2;
      const speed = 12 + Math.random() * 22;
      const durationMs = 360 + Math.random() * 260;
      const particle: JellyPopParticle = {
        id,
        x,
        y,
        size: 4 + Math.random() * 4,
        durationMs,
        driftX: Math.cos(angle) * speed,
        driftY: Math.sin(angle) * speed - 12,
      };

      setTimeout(() => {
        setJellyPopParticles(prev => prev.filter(p => p.id !== id));
      }, durationMs + 60);

      return particle;
    });

    setJellyPopParticles(prev => {
      const next = [...prev, ...particles];
      return next.length > 80 ? next.slice(next.length - 80) : next;
    });
  }, [getNextEntityId]);

  // Place fish food on click when food mode is active
  useEffect(() => {
    if (!isFishFoodMode) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input')) return;
      const id = getNextEntityId();
      const newFood: FishFoodType = {
        id,
        x: e.clientX,
        worldY: e.clientY + scrollYRef.current * SCROLL_PARALLAX,
      };
      setFishFoods(prev => prev.length >= 10 ? prev : [...prev, newFood]);
      // Auto-decay after 15 seconds if uneaten
      setTimeout(() => {
        setFishFoods(prev => prev.filter(f => f.id !== id));
      }, 15000);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isFishFoodMode, getNextEntityId]);

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

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mousePosRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    fishLastFrameTimeRef.current = 0;

    const animate = (timestamp: number) => {
      if (timestamp - lastScrollTimestampRef.current < SCROLL_ACTIVE_WINDOW_MS) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      if (fishLastFrameTimeRef.current !== 0 && timestamp - fishLastFrameTimeRef.current < FISH_SIMULATION_FRAME_MS) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      fishLastFrameTimeRef.current = timestamp;

      const eatenFoodIds = new Set<number>();
      const nibbleTriggers = new Set<number>();
      const crumbBursts: Array<{ x: number; worldY: number }> = [];
      const frameTimeSeconds = timestamp * 0.001;

      setFishes(currentFishes =>
        {
          return currentFishes.map(fish => {
          const SCARE_RADIUS = 150;
          const FLEE_STRENGTH = 6;
          const MAX_SPEED_FLEE = 5;
          const MAX_SPEED_CRUISE = 2;
          const FOOD_ATTRACT_RADIUS = 500;
          const FOOD_ATTRACT_STRENGTH = 0.25;
          const MAX_SPEED_FOOD = 3.5;
          const EAT_RADIUS = 30;
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

          let { x, y, vx, vy, rotation, initialVx, isFlipped } = fish;
          const prevVx = vx;
          const prevVy = vy;

          const screenY = y - scrollYRef.current * SCROLL_PARALLAX;
          const dxMouse = x - mousePosRef.current.x;
          const dyMouse = screenY - mousePosRef.current.y;
          const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

          let isFleeing = false;

          if (distanceMouse < SCARE_RADIUS) {
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
            // Check for nearby food
            const foods = fishFoodsRef.current;
            let closestFood: FishFoodType | null = null;
            let closestDist = Infinity;
            for (const food of foods) {
              const fdx = food.x - x;
              const fdy = food.worldY - y;
              const dist = Math.sqrt(fdx * fdx + fdy * fdy);
              if (dist < closestDist) {
                closestDist = dist;
                closestFood = food;
              }
            }

            if (closestFood && closestDist < FOOD_ATTRACT_RADIUS) {
              // Swim toward food
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

              if (closestDist < EAT_RADIUS) {
                eatenFoodIds.add(closestFood.id);
                nibbleTriggers.add(fish.id);
                crumbBursts.push({ x: closestFood.x, worldY: closestFood.worldY });
              }
            } else {
              // Normal cruising
              vx += (initialVx - vx) * RETURN_TO_HORIZONTAL_STRENGTH;
              vy += (0 - vy) * RETURN_TO_HORIZONTAL_STRENGTH;
              vy += (Math.random() - 0.5) * WANDER_STRENGTH;

              // Fish schooling: alignment + cohesion + separation.
              // Viewport culling: skip costly schooling for off-screen fish.
              const fishDisplayY = y - scrollYRef.current * SCROLL_PARALLAX;
              const isOffscreen = fishDisplayY < -400 || fishDisplayY > window.innerHeight + 400;

              let neighborCount = 0;
              let alignX = 0;
              let alignY = 0;
              let centerX = 0;
              let centerY = 0;
              let separationX = 0;
              let separationY = 0;

              if (!isOffscreen) for (const other of currentFishes) {
                if (other.id === fish.id) continue;
                const dx = other.x - x;
                const dy = other.y - y;
                const distSq = dx * dx + dy * dy;
                if (distSq > SCHOOL_RADIUS * SCHOOL_RADIUS) continue;

                const dist = Math.sqrt(distSq);

                // Separation applies to all fish regardless of school
                if (dist < SEPARATION_RADIUS && dist > 0.001) {
                  separationX -= dx / dist;
                  separationY -= dy / dist;
                }

                // Cohesion and alignment only within the same mini-school
                if (other.schoolId !== fish.schoolId) continue;

                neighborCount++;
                alignX += other.vx;
                alignY += other.vy;
                centerX += other.x;
                centerY += other.y;

                if (neighborCount >= MAX_NEIGHBORS_CONSIDERED) break;
              } // end schooling loop

              // Separation applies globally (all nearby fish push apart)
              vx += separationX * SEPARATION_STRENGTH;
              vy += separationY * SEPARATION_STRENGTH;

              if (neighborCount > 0) {
                // Alignment + cohesion only within same mini-school
                alignX = alignX / neighborCount - vx;
                alignY = alignY / neighborCount - vy;
                vx += alignX * ALIGN_STRENGTH;
                vy += alignY * ALIGN_STRENGTH;

                centerX /= neighborCount;
                centerY /= neighborCount;
                vx += (centerX - x) * COHESION_STRENGTH;
                vy += (centerY - y) * COHESION_STRENGTH;

                // Pattern-based movement: each school group has a distinct style
                const t = frameTimeSeconds;
                const pattern = fish.schoolId % 3;
                if (pattern === 0) {
                  // Sweep: wide lazy arcs up and down
                  vy += Math.sin(t * 0.6 + fish.schoolId * 1.3) * 0.06;
                } else if (pattern === 1) {
                  // Surge: periodic speed bursts every ~4s
                  const surgePhase = (t * 0.25 + fish.schoolId * 0.7) % 1;
                  if (surgePhase < 0.18) {
                    const surgeStrength = Math.sin(surgePhase * (Math.PI / 0.18)) * 0.18;
                    const speed = Math.sqrt(vx * vx + vy * vy);
                    if (speed > 0.001) {
                      vx += (vx / speed) * surgeStrength;
                      vy += (vy / speed) * surgeStrength;
                    }
                  }
                } else {
                  // Spiral: tighter oscillation, school weaves in a corkscrew
                  vy += Math.sin(t * 1.4 + fish.schoolId * 2.1) * 0.09;
                  vx += Math.cos(t * 0.9 + fish.schoolId * 1.7) * 0.025;
                }

                // Schooled fish move faster — use a higher speed cap than solo fish
                const speed = Math.sqrt(vx * vx + vy * vy);
                const schoolTargetSpeed = Math.min(MAX_SPEED_CRUISE + SCHOOL_SPEED_BOOST, MAX_SPEED_SCHOOL);
                if (speed > 0.001 && speed < schoolTargetSpeed) {
                  const boost = 0.12;
                  vx += (vx / speed) * boost;
                  vy += (vy / speed) * boost;
                }

                // School speed cap is higher than solo cruise cap
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

          x += vx;
          y += vy;

          const targetRotation = Math.atan2(vy, vx) * (180 / Math.PI);
          let delta = targetRotation - rotation;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          rotation += delta * TURN_SPEED;

          // Leave tiny bubble trails when fish sharply turn or accelerate.
          const accelMagnitude = Math.hypot(vx - prevVx, vy - prevVy);
          const turnMagnitude = Math.abs(delta);
          const now = timestamp;
          const lastEmit = trailEmitRef.current[fish.id] ?? 0;
          if ((accelMagnitude > 0.14 || turnMagnitude > 7.5) && now - lastEmit > 170 && Math.random() > 0.4) {
            trailEmitRef.current[fish.id] = now;
            const direction = vx === 0 ? (isFlipped ? -1 : 1) : Math.sign(vx);
            emitTrailBubble(x - direction * (26 * fish.scale), y + (Math.random() - 0.5) * 6);
          }

          return { ...fish, x, y, displayY: y, vx, vy, rotation };
        })
          .filter(fish =>
            fish.x > -200 && fish.x < window.innerWidth + 200
          );

        // Always keep exactly 1 clown fish alive.
        if (next.length > 0 && !next.some(f => f.variant === 'clown')) {
          const idx = Math.floor(Math.random() * next.length);
          next[idx] = { ...next[idx], variant: 'clown' };
        }

        return next;
      }
      );

      if (eatenFoodIds.size > 0) {
        setFishFoods(prev => prev.filter(f => !eatenFoodIds.has(f.id)));
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
        crumbBursts.forEach(burst => emitFoodCrumbs(burst.x, burst.worldY));
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    if (theme === 'underwater') {
      animationFrameId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [theme, emitTrailBubble, emitFoodCrumbs]);

  useEffect(() => {
    if (theme === 'underwater') {
      // --- Accelerating burst for first 2.5 seconds ---
      const BURST_DURATION_MS = 2500;
      const BURST_FISH_INTERVAL_MS = 80;
      const BURST_BUBBLE_INTERVAL_MS = 120;

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
    } else {
      setBubbles([]);
      setFishes([]);
    }
  }, [theme, createBubble, createFish]);

  useEffect(() => {
    if (fishes.length <= fishLimit) return;
    setFishes(prev => prev.slice(0, fishLimit));
  }, [fishLimit, fishes.length]);

  useEffect(() => {
    if (theme === 'space') {
      const newStars: StarType[] = Array.from({ length: 150 }).map(() => ({
        id: getNextEntityId(),
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: `${Math.random() * 2 + 1}px`,
        duration: `${Math.random() * 2 + 1}s`,
      }));
      setStars(newStars);

      const shootingStarInterval = setInterval(createShootingStar, 2000);

      return () => {
        clearInterval(shootingStarInterval);
      };
    } else {
      setStars([]);
      setShootingStars([]);
    }
  }, [theme, createShootingStar, getNextEntityId]);

  useEffect(() => {
    let animationFrameId: number;

    const randomWhaleDelay = () => randomInRange(WHALE_RESPAWN_DELAY_MIN_MS, WHALE_RESPAWN_DELAY_MAX_MS);
    if (nextWhaleSpawnRef.current === 0) {
      nextWhaleSpawnRef.current = performance.now() + randomInRange(WHALE_INITIAL_DELAY_MIN_MS, WHALE_INITIAL_DELAY_MAX_MS);
    }

    const animateWhale = (timestamp: number) => {
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
        let baseY = current.baseY;
        const jelly = jellyfishRef.current;

        if (jelly) {
          const dx = jelly.x - current.x;
          const desiredDirection = dx >= 0 ? 1 : -1;
          const desiredSpeed = Math.min(1.2, Math.max(0.42, Math.abs(dx) * 0.004 + 0.35));
          const desiredVx = desiredDirection * desiredSpeed;
          vx += (desiredVx - vx) * 0.075;
          baseY += (jelly.y - baseY) * 0.03;
        }

        const viewportWorldTop = scrollYRef.current * SCROLL_PARALLAX;
        const minY = viewportWorldTop + window.innerHeight * 0.14;
        const maxY = viewportWorldTop + window.innerHeight * 0.9;
        baseY = Math.max(minY, Math.min(maxY, baseY));

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
    text: 'text-slate-300', textLighter: 'text-slate-300/90', highlight: 'text-indigo-300',
    highlightStrong: 'text-indigo-200', border: 'border-indigo-400/20', timeline: 'bg-indigo-400/30',
    timelineDot: 'bg-indigo-500', timelineDotBorder: 'border-slate-900', cardBg: 'bg-black/30',
    tagBg: 'bg-indigo-900/50', tagHoverBg: 'hover:bg-indigo-800/70', toolTagBg: 'bg-slate-800/50',
    toolTagHoverBg: 'hover:bg-slate-700/70', searchBg: 'bg-slate-900/70', searchBorder: 'border-indigo-400/30',
    searchRing: 'focus:ring-indigo-400', searchPlaceholder: 'placeholder-indigo-200/50', periodBg: 'bg-[#1b263b]',
    heroGradient: 'from-purple-400 to-indigo-400', contactIcon: 'text-indigo-300'
  };


  return (
    <div className={`relative min-h-screen text-white overflow-x-hidden transition-colors duration-1000 ${theme === 'underwater'
      ? 'bg-gradient-to-br from-[#000428] via-[#004e92] to-[#1CB5E0]'
      : 'bg-gradient-to-br from-[#020111] via-[#0d1b2a] to-[#1b263b]'
      }`}>
      <style>{`
        @keyframes fishTrailRise {
          0% {
            opacity: 0.95;
            transform: translate(0px, 0px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--trail-dx), -42px) scale(0.45);
          }
        }

        @keyframes foodCrumbBurst {
          0% {
            opacity: 1;
            transform: translate(0px, 0px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--crumb-dx), var(--crumb-dy)) scale(0.35);
          }
        }

        @keyframes jellyPopParticle {
          0% {
            opacity: 0.95;
            transform: translate(0px, 0px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--pop-dx), var(--pop-dy)) scale(0.25);
          }
        }

        @keyframes jellyPopRing {
          0% {
            opacity: 0.9;
            transform: scale(0.45);
          }
          100% {
            opacity: 0;
            transform: scale(1.8);
          }
        }
      `}</style>
      <div
        className="fixed inset-0 w-full h-full z-0"
      >
        {theme === 'underwater' ? (
          <>
            {bubbles.map(bubble => (
              <Bubble key={bubble.id} {...bubble} />
            ))}
            {whale && <Whale x={whale.x} displayY={whale.displayY} scale={whale.scale} isFlipped={whale.isFlipped} />}
            {turtle && <Turtle x={turtle.x} displayY={turtle.displayY} scale={turtle.scale} isFlipped={turtle.isFlipped} />}
            {/* World-layer: fish + food + particles all in world coords.
                translateY(-scrollY) is applied directly on scroll — zero React re-renders for scroll. */}
            <div
              ref={worldLayerRef}
              style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', willChange: 'transform' }}
            >
            {fishes.map(fish => (
              <Fish key={fish.id} {...fish} isNibbling={Boolean(nibblingFishIds[fish.id])} />
            ))}
            {fishFoods.map(food => (
              <div
                key={food.id}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  transform: `translate(${food.x - 7}px, ${food.worldY - 7}px)`,
                  background: 'radial-gradient(circle at 35% 35%, #fde68a, #f59e0b)',
                  boxShadow: '0 0 6px 2px rgba(251,191,36,0.7), 0 0 14px 4px rgba(245,158,11,0.4)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            ))}
            {trailParticles.map(particle => {
              const wrapperStyle: React.CSSProperties = {
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${particle.x}px, ${particle.worldY}px)`,
                pointerEvents: 'none',
              };
              const particleStyle: React.CSSProperties = {
                width: particle.size,
                height: particle.size,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.98), rgba(125,211,252,0.88))',
                boxShadow: '0 0 7px rgba(125,211,252,0.95)',
                animation: `fishTrailRise ${particle.durationMs}ms ease-out forwards`,
                ['--trail-dx' as any]: `${particle.driftX}px`,
              };

              return (
                <div key={particle.id} style={wrapperStyle}>
                  <div style={particleStyle} />
                </div>
              );
            })}
            {foodCrumbs.map(crumb => {
              const wrapperStyle: React.CSSProperties = {
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${crumb.x}px, ${crumb.worldY}px)`,
                pointerEvents: 'none',
              };
              const crumbStyle: React.CSSProperties = {
                width: crumb.size,
                height: crumb.size,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, rgba(255,243,182,0.98), rgba(245,158,11,0.9))',
                boxShadow: '0 0 6px rgba(251,191,36,0.95)',
                animation: `foodCrumbBurst ${crumb.durationMs}ms ease-out forwards`,
                ['--crumb-dx' as any]: `${crumb.driftX}px`,
                ['--crumb-dy' as any]: `${crumb.driftY}px`,
              };

              return (
                <div key={crumb.id} style={wrapperStyle}>
                  <div style={crumbStyle} />
                </div>
              );
            })}
            </div>
          </>
        ) : (
          <>
            <CursorNebula />
            {stars.map(star => <Star key={star.id} {...star} />)}
            {shootingStars.map(star => <ShootingStar key={star.id} {...star} />)}
          </>
        )}
      </div>

      {theme === 'underwater' && (
        <div className="fixed inset-0 z-20 pointer-events-none">
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
          {jellyPopParticles.map(particle => {
            const wrapperStyle: React.CSSProperties = {
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${particle.x}px, ${particle.y}px)`,
              pointerEvents: 'none',
            };
            const particleStyle: React.CSSProperties = {
              width: particle.size,
              height: particle.size,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(244,114,182,0.92))',
              boxShadow: '0 0 10px rgba(236,72,153,0.9)',
              animation: `jellyPopParticle ${particle.durationMs}ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards`,
              ['--pop-dx' as any]: `${particle.driftX}px`,
              ['--pop-dy' as any]: `${particle.driftY}px`,
            };

            return (
              <div key={particle.id} style={wrapperStyle}>
                <div style={particleStyle} />
              </div>
            );
          })}
          {jellyPopRings.map(ring => {
            const ringWrapperStyle: React.CSSProperties = {
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${ring.x - ring.size / 2}px, ${ring.y - ring.size / 2}px)`,
              pointerEvents: 'none',
            };
            const ringStyle: React.CSSProperties = {
              width: ring.size,
              height: ring.size,
              borderRadius: '50%',
              border: '2px solid rgba(251,113,133,0.85)',
              boxShadow: '0 0 14px rgba(244,114,182,0.8)',
              animation: `jellyPopRing ${ring.durationMs}ms ease-out forwards`,
            };

            return (
              <div key={ring.id} style={ringWrapperStyle}>
                <div style={ringStyle} />
              </div>
            );
          })}
        </div>
      )}

      <div className="relative z-10">
        <Header />
        <main className="container mx-auto px-6 md:px-10">
          <Section id="home" className="min-h-screen flex flex-col justify-center items-center text-center">
            <div
              className={`w-48 h-48 md:w-64 md:h-64 mb-8 cursor-grab active:cursor-grabbing select-none`}
              style={{ perspective: '800px' }}
              onPointerDown={handlePhotoPointerDown}
              onPointerMove={handlePhotoPointerMove}
              onPointerUp={handlePhotoPointerUp}
              onPointerCancel={handlePhotoPointerUp}
            >
              <div
                className={`w-full h-full rounded-full shadow-2xl border-4 ${theme === 'underwater' ? 'border-cyan-400/50' : 'border-indigo-400/50'} overflow-hidden`}
                style={{
                  transform: `rotateY(${photoRotation}deg)`,
                  transition: photoSpinRef.current.isDragging ? 'none' : 'transform 0.05s linear',
                  transformStyle: 'preserve-3d',
                }}
              >
                <img
                  src={`${BASE_URL}images/profile.jpg`}
                  alt="Evan Chen"
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              </div>
            </div>
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${colors.heroGradient} animate-fade-in-down`}>
              Evan Chen
            </h1>
            <p className={`mt-4 text-xl md:text-2xl lg:text-3xl ${colors.highlightStrong} max-w-3xl animate-fade-in-up`}>
              Computer Science Student & Developer
            </p>
            <p className={`mt-6 text-lg ${colors.textLighter} max-w-3xl animate-fade-in-up delay-200`}>
              A passionate CS student with experience in full-stack development, object-oriented programming, and game development. Check out my projects to see how I'm growing as a developer!
            </p>
            <div className={`mt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-4 ${colors.highlightStrong}`}>
              <a href="https://github.com/evandongchen" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                <GitHubIcon className="w-6 h-6" /> GitHub
              </a>
              <span className={`${theme === 'underwater' ? 'text-cyan-400/50' : 'text-indigo-400/50'}`}>•</span>
              <a href="https://www.linkedin.com/in/evandongchen/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                <LinkedInIcon className="w-6 h-6" /> LinkedIn
              </a>
              <span className={`${theme === 'underwater' ? 'text-cyan-400/50' : 'text-indigo-400/50'}`}>•</span>
              <a href="mailto:evanchen0609@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <MailIcon className="w-6 h-6" /> evanchen0609@gmail.com
              </a>
            </div>
          </Section>

          <Section id="experience" className="py-20">
            <h2 className="text-4xl font-bold text-center mb-12">Experience</h2>
            <div className="relative max-w-3xl mx-auto px-4">
              <div className={`absolute h-full w-1 ${colors.timeline} left-4 transform -translate-x-1/2`}></div>
              {experiences.map((exp, index) => (
                <div key={index} className="mb-12 pl-10 relative">
                  <div className={`absolute -left-2 top-1 w-5 h-5 ${colors.timelineDot} rounded-full border-4 ${colors.timelineDotBorder}`}></div>
                  <div className={`${colors.cardBg} backdrop-blur-md rounded-xl shadow-lg border ${colors.border} p-6`}>
                    <p className={`absolute -top-4 left-12 ${colors.periodBg} px-3 py-1 text-sm font-semibold ${colors.highlightStrong} rounded-full`}>{exp.period}</p>
                    <h3 className={`text-xl font-bold ${colors.highlightStrong} mb-1`}>{exp.role}</h3>
                    <p className={`font-semibold ${colors.highlight} mb-3`}>{exp.company}</p>
                    <ul className={`list-disc list-inside ${colors.textLighter} space-y-1`}>
                      {exp.description.map((desc, i) => (
                        <li key={i} className="text-sm leading-relaxed">{desc}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="education" className="py-20">
            <h2 className="text-4xl font-bold text-center mb-12">Education</h2>
            <div className={`${colors.cardBg} backdrop-blur-md rounded-xl shadow-lg border ${colors.border} p-8 text-center max-w-3xl mx-auto`}>
              <h3 className={`text-2xl font-bold ${colors.highlightStrong}`}>{education.degree}</h3>
              <p className={`text-xl ${colors.highlight} mt-1`}>{education.program}</p>
              <p className={`text-lg ${colors.textLighter} mt-4`}>{education.university}</p>
              <div className={`flex justify-center items-center gap-6 mt-4 ${colors.highlightStrong}/80`}>
                <span>{education.period}</span>
                <span className={`${theme === 'underwater' ? 'text-cyan-400/50' : 'text-indigo-400/50'}`}>•</span>
                <span>{education.gpa}</span>
              </div>
            </div>
          </Section>

          <Section id="skills" className="py-20">
            <h2 className="text-4xl font-bold text-center mb-12">Technical Skills</h2>
            <div className={`${colors.cardBg} backdrop-blur-md rounded-xl shadow-lg border ${colors.border} p-8 max-w-4xl mx-auto`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                <div>
                  <h3 className={`text-xl font-semibold ${colors.highlightStrong} mb-4 text-center border-b ${colors.border} pb-2`}>Languages</h3>
                  <div className="flex flex-wrap justify-center gap-3">
                    {skills.languages.map(lang => (
                      <span key={lang} className={`${colors.tagBg} ${colors.highlightStrong} font-medium px-3 py-1 text-sm rounded-full transition-all duration-300 ${colors.tagHoverBg} hover:scale-105`}>
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className={`text-xl font-semibold ${colors.highlightStrong} mb-4 text-center border-b ${colors.border} pb-2`}>Frameworks & Tools</h3>
                  <div className="flex flex-wrap justify-center gap-3">
                    {skills.frameworksAndTools.map(tool => (
                      <span key={tool} className={`${colors.toolTagBg} ${colors.highlightStrong} font-medium px-3 py-1 text-sm rounded-full transition-all duration-300 ${colors.toolTagHoverBg} hover:scale-105`}>
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section id="projects" className="py-20">
            <h2 className="text-4xl font-bold text-center mb-12">Projects</h2>
            <div className="max-w-xl mx-auto mb-10 px-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search projects by title, tag, or technology..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full ${colors.searchBg} border ${colors.searchBorder} rounded-full py-3 pl-5 pr-12 text-white ${colors.searchPlaceholder} focus:outline-none focus:ring-2 ${colors.searchRing} transition-all`}
                  aria-label="Search projects"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-5 pointer-events-none">
                  <SearchIcon className={`w-5 h-5 ${colors.highlightStrong}/70`} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project, index) => (
                  <ProjectCard key={index} project={project} />
                ))
              ) : (
                <p className={`text-center ${colors.highlightStrong} md:col-span-3`}>No projects found matching your search.</p>
              )}
            </div>
          </Section>

          <Section id="contact" className="py-20 text-center">
            <h2 className="text-4xl font-bold mb-4">Get In Touch</h2>
            <p className={`text-xl ${colors.text} mb-8 max-w-2xl mx-auto`}>
              I'm always open to new opportunities and collaborations. Feel free to reach out!
            </p>
            <div className="flex justify-center items-center space-x-8">
              <a href="mailto:evanchen0609@gmail.com" className={`${colors.contactIcon} hover:text-white transition-colors duration-300 transform hover:scale-110`}>
                <MailIcon className="w-10 h-10" />
              </a>
              <a href="https://github.com/evandongchen" target="_blank" rel="noopener noreferrer" className={`${colors.contactIcon} hover:text-white transition-colors duration-300 transform hover:scale-110`}>
                <GitHubIcon className="w-10 h-10" />
              </a>
              <a href="https://www.linkedin.com/in/evandongchen/" target="_blank" rel="noopener noreferrer" className={`${colors.contactIcon} hover:text-white transition-colors duration-300 transform hover:scale-110`}>
                <LinkedInIcon className="w-10 h-10" />
              </a>
            </div>
          </Section>
        </main>

        <footer className="relative text-center pt-20 pb-6 overflow-hidden">
          {theme === 'underwater' && <SandDune />}
          <div className="relative z-10">
            <p className="text-white">&copy; 2026 Evan Chen. All rights reserved.</p>
          </div>
        </footer>
      </div>
      <BackToTopButton />
      <ThemeToggleButton />
      {theme === 'underwater' && (
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
      )}
      <FishFoodButton isActive={isFishFoodMode} onToggle={() => setIsFishFoodMode(prev => !prev)} />
    </div>
  );
};

export default App;