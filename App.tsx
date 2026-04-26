import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Section from './components/Section';
import ProjectCard from './components/ProjectCard';
import Bubble from './components/Bubble';
import Fish from './components/Fish';
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

const App: React.FC = () => {
  const { theme } = useTheme();
  const [bubbles, setBubbles] = useState<BubbleType[]>([]);
  const [fishes, setFishes] = useState<FishType[]>([]);
  const [fishFoods, setFishFoods] = useState<FishFoodType[]>([]);
  const [isFishFoodMode, setIsFishFoodMode] = useState(false);
  const [stars, setStars] = useState<StarType[]>([]);
  const [shootingStars, setShootingStars] = useState<ShootingStarType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollYRef = useRef(0);
  const mousePosRef = useRef({ x: -1000, y: -1000 });
  const fishFoodsRef = useRef<FishFoodType[]>([]);

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



  const projects: Project[] = [
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
  ];

  const education: Education = {
    degree: 'Bachelor of Science, Computing Science',
    program: 'Zhejiang Dual Degree',
    university: 'Simon Fraser University, Burnaby, BC',
    period: 'Sep 2023 - Expected Jun 2027',
    gpa: '3.62 GPA'
  };

  const experiences: Experience[] = [
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
  ];

  const skills = {
    languages: ['C', 'C#', 'C++', 'HTML/CSS', 'Java', 'JavaScript', 'Kotlin', 'Python', 'QML', 'SQL', 'TypeScript'],
    frameworksAndTools: ['CMake', 'Node.js', 'PyTorch', 'React.js', 'Unity', 'Android Studio', 'CI/CD', 'Figma', 'GitHub', 'GitLab', 'Linux', 'MongoDB', 'Plastic SCM', 'Visual Studio']
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const createBubble = useCallback(() => {
    const id = Date.now() + Math.random();
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
  }, []);

  const createFish = useCallback(() => {
    const id = Date.now() + Math.random();
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

    y = Math.random() * document.documentElement.scrollHeight;
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
    const [color1, color2] = colors[Math.floor(Math.random() * colors.length)];

    const newFish: FishType = {
      id, x, y, displayY: y - scrollYRef.current * 0.8, vx, vy, initialVx,
      rotation: Math.atan2(vy, vx) * (180 / Math.PI),
      scale, color1, color2,
      isFlipped,
    };

    setFishes(prev => {
      if (prev.length >= 50) {
        return prev;
      }
      return [...prev, newFish];
    });
  }, []);

  const createShootingStar = useCallback(() => {
    const id = Date.now() + Math.random();
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
  }, []);

  // Keep fishFoodsRef in sync so animation loop can read it without stale closure
  useEffect(() => {
    fishFoodsRef.current = fishFoods;
  }, [fishFoods]);

  // Place fish food on click when food mode is active
  useEffect(() => {
    if (!isFishFoodMode) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input')) return;
      const id = Date.now() + Math.random();
      const newFood: FishFoodType = {
        id,
        x: e.clientX,
        worldY: e.clientY + scrollYRef.current * 0.8,
        displayY: e.clientY,
      };
      setFishFoods(prev => prev.length >= 10 ? prev : [...prev, newFood]);
      // Auto-decay after 15 seconds if uneaten
      setTimeout(() => {
        setFishFoods(prev => prev.filter(f => f.id !== id));
      }, 15000);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isFishFoodMode]);

  // Crosshair cursor when food mode is active
  useEffect(() => {
    document.body.style.cursor = isFishFoodMode ? 'crosshair' : '';
    return () => { document.body.style.cursor = ''; };
  }, [isFishFoodMode]);

  const handleScroll = useCallback(() => {
    scrollYRef.current = window.scrollY;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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

    const animate = () => {
      const eatenFoodIds = new Set<number>();

      setFishes(currentFishes =>
        currentFishes.map(fish => {
          const SCARE_RADIUS = 150;
          const FLEE_STRENGTH = 6;
          const MAX_SPEED_FLEE = 5;
          const MAX_SPEED_CRUISE = 2;
          const FOOD_ATTRACT_RADIUS = 500;
          const FOOD_ATTRACT_STRENGTH = 0.25;
          const MAX_SPEED_FOOD = 3.5;
          const EAT_RADIUS = 22;
          const TURN_SPEED = 0.1;
          const RETURN_TO_HORIZONTAL_STRENGTH = 0.05;
          const WANDER_STRENGTH = 0.1;

          let { x, y, vx, vy, rotation, initialVx } = fish;

          const screenY = y - scrollYRef.current * 0.8;
          const dxMouse = x - mousePosRef.current.x;
          const dyMouse = screenY - mousePosRef.current.y;
          const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

          const isFleeing = distanceMouse < SCARE_RADIUS;

          if (isFleeing) {
            const angle = Math.atan2(dyMouse, dxMouse);
            vx += Math.cos(angle) * FLEE_STRENGTH;
            vy += Math.sin(angle) * FLEE_STRENGTH;

            const currentSpeed = Math.sqrt(vx * vx + vy * vy);
            if (currentSpeed > MAX_SPEED_FLEE) {
              vx = (vx / currentSpeed) * MAX_SPEED_FLEE;
              vy = (vy / currentSpeed) * MAX_SPEED_FLEE;
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
              }
            } else {
              // Normal cruising
              vx += (initialVx - vx) * RETURN_TO_HORIZONTAL_STRENGTH;
              vy += (0 - vy) * RETURN_TO_HORIZONTAL_STRENGTH;
              vy += (Math.random() - 0.5) * WANDER_STRENGTH;

              const currentSpeed = Math.sqrt(vx * vx + vy * vy);
              if (currentSpeed > MAX_SPEED_CRUISE) {
                vx = (vx / currentSpeed) * MAX_SPEED_CRUISE;
                vy = (vy / currentSpeed) * MAX_SPEED_CRUISE;
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

          const displayY = y - scrollYRef.current * 0.8;
          return { ...fish, x, y, displayY, vx, vy, rotation };
        })
          .filter(fish =>
            fish.x > -200 && fish.x < window.innerWidth + 200
          )
      );

      // Update food displayY every frame (parallax) and remove eaten pellets
      setFishFoods(prev => {
        const next = prev
          .filter(f => !eatenFoodIds.has(f.id))
          .map(f => ({ ...f, displayY: f.worldY - scrollYRef.current * 0.8 }));
        // Skip state update if nothing changed (avoid re-render churn)
        if (next.length === prev.length && next.every((f, i) => f.displayY === prev[i].displayY)) return prev;
        return next;
      });

      animationFrameId = requestAnimationFrame(animate);
    };
    if (theme === 'underwater') {
      animate();
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [theme]);

  useEffect(() => {
    if (theme === 'underwater') {
      const bubbleInterval = setInterval(createBubble, 500);
      const fishInterval = setInterval(createFish, 250);
      return () => {
        clearInterval(bubbleInterval);
        clearInterval(fishInterval);
      };
    } else {
      setBubbles([]);
      setFishes([]);
    }
  }, [theme, createBubble, createFish]);

  useEffect(() => {
    if (theme === 'space') {
      const newStars: StarType[] = Array.from({ length: 150 }).map(() => ({
        id: Math.random(),
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
  }, [theme, createShootingStar]);

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
      <div
        className="fixed inset-0 w-full h-full z-0"
      >
        {theme === 'underwater' ? (
          <>
            {bubbles.map(bubble => (
              <Bubble key={bubble.id} {...bubble} />
            ))}
            {fishes.map(fish => (
              <Fish key={fish.id} {...fish} />
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
                  transform: `translate(${food.x - 7}px, ${food.displayY - 7}px)`,
                  background: 'radial-gradient(circle at 35% 35%, #fde68a, #f59e0b)',
                  boxShadow: '0 0 6px 2px rgba(251,191,36,0.7), 0 0 14px 4px rgba(245,158,11,0.4)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            ))}
          </>
        ) : (
          <>
            <CursorNebula />
            {stars.map(star => <Star key={star.id} {...star} />)}
            {shootingStars.map(star => <ShootingStar key={star.id} {...star} />)}
          </>
        )}
      </div>

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
      <FishFoodButton isActive={isFishFoodMode} onToggle={() => setIsFishFoodMode(prev => !prev)} />
    </div>
  );
};

export default App;