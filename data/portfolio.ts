import { Project, Experience, Education } from '../types';

const BASE_URL = import.meta.env.BASE_URL;

export const projects: Project[] = [
  {
    title: 'Gogh with the Flow',
    description: "An endless Starry Night, procedurally painted stroke by stroke. Wander an infinite night through regions borrowed from Van Gogh's paintings, with a live-generated soundtrack and postcards you can send.",
    image: `${BASE_URL}images/gogh_with_the_flow.webp`,
    tags: ['TypeScript', 'Vite', 'Canvas 2D', 'Web Audio', 'Procedural Generation', 'Generative Art'],
    codeUrl: 'https://evandongchen.github.io/GoghWithTheFlow/',
    linkLabel: 'Play',
    featured: true,
  },
  {
    title: 'Blade & Brush',
    description: 'Browser puzzle game set inside a procedurally generated Chinese ink landscape. Slash, burn, pour and push a falling-sand world until the painting matches the poem.',
    image: `${BASE_URL}images/blade_and_brush.webp`,
    tags: ['TypeScript', 'Vite', 'Canvas 2D', 'Procedural Generation', 'Game Development', 'Puzzle'],
    codeUrl: 'https://evandongchen.github.io/BladeAndBrush/',
    linkLabel: 'Play',
    featured: true,
  },
  {
    title: 'The Wishing Terminal',
    description: 'Adventure horror game built in Roblox for the SFU Summer Summit 2026 game jam.',
    image: `${BASE_URL}images/the_wishing_terminal.webp`,
    tags: ['Roblox', 'Lua', 'Adventure', 'Horror', 'Game Development', 'Hackathon'],
    codeUrl: 'https://matchabatcha.itch.io/thewishingterminal',
    featured: true,
  },
  {
    title: 'Cramsino',
    description: 'AI-powered study app that uses computer vision to detect focus and rewards studying with gacha-style card pulls. Won Best UI at JourneyHacks 2026.',
    image: `${BASE_URL}images/cramsino.webp`,
    tags: ['Next.js', 'FastAPI', 'OpenCV', 'PostgreSQL', 'Hackathon'],
    codeUrl: 'https://devpost.com/software/cramsino',
  },
  {
    title: 'WitchDog',
    description: 'Real-time multiplayer trivia game built in Unity with Socket.IO networking and custom multi-phase gameplay.',
    image: `${BASE_URL}images/witch_dog.webp`,
    tags: ['Unity', 'C#', 'Multiplayer', 'Hackathon'],
    codeUrl: 'https://devpost.com/software/witch-dog',
  },
  {
    title: 'Money Mango',
    description: 'Personal finance Android app prototype built with Android Studio and Kotlin. Features OCR receipt parsing, manual entry, tags, spending goals, reminders, and analytics.',
    image: `${BASE_URL}images/money_mango.webp`,
    tags: ['Android', 'Kotlin', 'ML Kit', 'OCR', 'Mobile', 'Finance', 'Notifications', 'Analytics'],
    codeUrl: 'https://github.com/EvanDongChen/MoneyMango',
  },
  {
    title: 'Chord Breakers',
    description: '2D action game built in Unity with modular architecture, elemental combat, and AI using finite state machines.',
    image: `${BASE_URL}images/chord_breakers.webp`,
    tags: ['Unity', 'C#', 'Game Development', 'Hackathon'],
    codeUrl: 'https://angrycow05.itch.io/chord-breaker',
  },
  {
    title: 'SAM for Medical Segmentation',
    description: 'Research project exploring Segment Anything Models for MRI brain tumor segmentation. Implemented fine-tuning and automated bounding box prompts.',
    image: `${BASE_URL}images/sam.webp`,
    tags: ['Python', 'AI', 'Research', 'Medical Imaging'],
    codeUrl: 'https://www.youtube.com/watch?v=DGHAxlcROsQ',
  },
  {
    title: 'Library Database Application',
    description: 'Full-stack library platform with Flask and SQL. Automated 50% of manual tasks with complex database schema.',
    image: `${BASE_URL}images/library_database.webp`,
    tags: ['Flask', 'SQL', 'JavaScript', 'HTML/CSS'],
    codeUrl: 'https://github.com/EvanDongChen/CMPT354-LibraryDataBase',
  },
  {
    title: 'WanderWise',
    description: 'AI-powered trip planner using React and Google APIs. Generates full-day plans in 5 seconds with real-time recommendations.',
    image: `${BASE_URL}images/wander_wise.webp`,
    tags: ['React', 'AWS Amplify', 'Google APIs', 'AI'],
    codeUrl: 'https://www.youtube.com/watch?v=WI8YdPw-tSo',
  },
  {
    title: 'Krill Krushers',
    description: 'Unity 2D combat game inspired by vampire survivors. Created 50+ assets and won Best Entertainment Hack.',
    image: `${BASE_URL}images/krill_krushers.webp`,
    tags: ['Unity', 'C#', 'Game Development', 'Team Leadership'],
    codeUrl: 'https://evandongchen.github.io/Krill-Krushers/',
  },
  {
    title: 'Lizard Wizard',
    description: '2D combat game where you combo elemental spells to defeat enemies. Built in Unity using C#.',
    image: `${BASE_URL}images/lizard_wizard.webp`,
    tags: ['Unity', 'C#', 'Game Development', '2D', 'Combat', 'Elemental'],
    codeUrl: 'https://github.com/cna52/LizardWizard',
  },
  {
    title: 'Bird Game',
    description: 'Unity 2D roguelike with custom level generation. Designed 30+ original assets and core gameplay mechanics.',
    image: `${BASE_URL}images/bird_game.webp`,
    tags: ['Unity', 'C#', 'Game Design', 'Aseprite'],
    codeUrl: 'https://evandongchen.github.io/Bird-Game/',
  },
  {
    title: 'Raccoon Game',
    description: '2.5D platformer game developed for Mountain Madness 2024. Won Most Mountainous award.',
    image: `${BASE_URL}images/racoon_game.webp`,
    tags: ['Unity', 'Game Development', 'Hackathon', 'Incomplete'],
    codeUrl: 'https://github.com/emmyfong/racoongame',
  },
  {
    title: 'Dream On, Sing On',
    description: 'Web app for vocal/instrumental track separation with karaoke features. Displays synchronized lyrics for songs.',
    image: `${BASE_URL}images/dream_on_sing_on.webp`,
    tags: ['React', 'Python', 'Spleeter', 'Audio Processing', 'Hackathon', 'Incomplete'],
    codeUrl: 'https://devpost.com/software/dream-on-sing-on',
  },
  {
    title: 'Pastry Panic',
    description: 'Stack-based cake game with leaderboard. Built with Unity and integrated into a React website with SQL database.',
    image: `${BASE_URL}images/pastry_panic.webp`,
    tags: ['Unity', 'C#', 'React', 'SQL', 'JavaScript', 'Hackathon', 'Incomplete'],
    codeUrl: 'https://devpost.com/software/pastry-panic',
  },
];

export const education: Education = {
  degree: 'Bachelor of Science, Computing Science',
  program: 'Zhejiang Dual Degree',
  university: 'Simon Fraser University, Burnaby, BC',
  period: 'Sep 2023 - Expected Jun 2027',
  gpa: '3.62 GPA'
};

export const experiences: Experience[] = [
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

export const skills = {
  languages: ['C', 'C#', 'C++', 'HTML/CSS', 'Java', 'JavaScript', 'Kotlin', 'Python', 'QML', 'SQL', 'TypeScript'],
  frameworksAndTools: ['CMake', 'Node.js', 'PyTorch', 'React.js', 'Unity', 'Android Studio', 'CI/CD', 'Figma', 'GitHub', 'GitLab', 'Linux', 'MongoDB', 'Plastic SCM', 'Visual Studio']
};

export const filterProjects = (searchTerm: string): Project[] => {
  const term = searchTerm.toLowerCase();
  return projects.filter(project =>
    project.title.toLowerCase().includes(term) ||
    project.description.toLowerCase().includes(term) ||
    project.tags.some(tag => tag.toLowerCase().includes(term))
  );
};
