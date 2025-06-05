import { useState, useMemo } from 'react'
import ProjectCard from './ProjectCard'
import './Projects.css'

const Projects = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const projects = [
    {
      title: "Library Database Application",
      description: "Full-stack library platform with Flask and SQL. Automated 50% of manual tasks with complex database schema.",
      image: "https://via.placeholder.com/400",
      tags: ["Flask", "SQL", "JavaScript", "HTML/CSS"],
      link: "https://github.com/EvanDongChen/CMPT354-LibraryDataBase",
      period: "Mar 2025 – Apr 2025"
    },
    {
      title: "WanderWise",
      description: "AI-powered trip planner using React and Google APIs. Generates full-day plans in 5 seconds with real-time recommendations.",
      image: "https://via.placeholder.com/400",
      tags: ["React", "AWS Amplify", "Google APIs", "AI"],
      link: "https://www.youtube.com/watch?v=WI8YdPw-tSo",
      period: "Sep 2024 – Dec 2024"
    },
    {
      title: "Krill Krushers",
      description: "Unity 2D combat game inspired by vampire survivors. Created 50+ assets and won Best Entertainment Hack.",
      image: "https://via.placeholder.com/400",
      tags: ["Unity", "C#", "Game Development", "Team Leadership"],
      link: "https://devpost.com/software/krill-krushers",
      period: "Oct 2024"
    },
    {
      title: "Bird Game",
      description: "Unity 2D roguelike with custom level generation. Designed 30+ original assets and core gameplay mechanics.",
      image: "https://via.placeholder.com/400",
      tags: ["Unity", "C#", "Game Design", "Aseprite"],
      link: "https://github.com/EvanDongChen/Bird-Game",
      period: "Aug 2022 – Jan 2023"
    },
    {
      title: "Raccoon Game",
      description: "2.5D platformer game developed for Mountain Madness 2024. Won Most Mountainous award.",
      image: "https://via.placeholder.com/400",
      tags: ["Unity", "Game Development", "Hackathon", "Incomplete"],
      link: "https://github.com/emmyfong/racoongame",
      period: "2024"
    },
    {
      title: "Dream On, Sing On",
      description: "Web app for vocal/instrumental track separation with karaoke features. Displays synchronized lyrics for songs.",
      image: "https://via.placeholder.com/400",
      tags: ["React", "Python", "Spleeter", "Audio Processing", "Hackathon", "Incomplete"],
      link: "https://devpost.com/software/dream-on-sing-on",
      period: "2024"
    },
    {
      title: "SAM for Medical Segmentation",
      description: "Research project exploring Segment Anything Models for MRI brain tumor segmentation. Implemented fine-tuning and automated bounding box prompts.",
      image: "https://via.placeholder.com/400",
      tags: ["Python", "AI", "Research", "Medical Imaging"],
      link: "https://www.youtube.com/watch?v=DGHAxlcROsQ",
      period: "2024"
    },
    {
      title: "Pastry Panic",
      description: "Stack-based cake game with leaderboard. Built with Unity and integrated into a React website with SQL database.",
      image: "https://via.placeholder.com/400",
      tags: ["Unity", "C#", "React", "SQL", "JavaScript", "Hackathon", "Incomplete"],
      link: "https://devpost.com/software/pastry-panic",
      period: "2024"
    }
  ]

  // Get all unique tags from projects
  const allTags = useMemo(() => {
    const tags = new Set()
    projects.forEach(project => {
      project.tags.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [])

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTag = !selectedTag || project.tags.includes(selectedTag)

    return matchesSearch && matchesTag
  })

  return (
    <div className="projects-section">
      <h2 className="section-title">Projects</h2>
      
      <div className="filters-container">
        <div className="search-box-wrapper">
          <svg 
            className="search-icon" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-box"
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="tag-dropdown">
          <button 
            className="tag-dropdown-button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {selectedTag || "Filter by tag"}
            <svg 
              className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          {isDropdownOpen && (
            <div className="tag-dropdown-content">
              <button
                className={`tag-option ${!selectedTag ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTag('')
                  setIsDropdownOpen(false)
                }}
              >
                All Tags
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-option ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedTag(tag)
                    setIsDropdownOpen(false)
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="projects-grid">
        {filteredProjects.map((project, index) => (
          <ProjectCard
            key={index}
            title={project.title}
            description={project.description}
            image={project.image}
            tags={project.tags}
            link={project.link}
            period={project.period}
          />
        ))}
      </div>
    </div>
  )
}

export default Projects 