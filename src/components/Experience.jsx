import './Experience.css'

const Experience = () => {
  const skills = {
    languages: ["C", "C#", "C++", "HTML/CSS", "Java", "JavaScript", "Kotlin", "Python", "QML", "SQL", "TypeScript"],
    tools: ["CMake", "Node.js", "PyTorch", "React.js", "Unity", "Android Studio", "CI/CD", "Figma", "GitHub", "GitLab", "Linux", "MongoDB", "Plastic SCM", "Visual Studio"],
    practices: ["Agile Development", "Continuous Integration", "Git Version Control"]
  }

  const experiences = [
    {
      title: "Freelance Full-Stack Developer",
      company: "Whitebox Coworking Remote",
      period: "May 2025 – Present",
      description: [
        "Built a full-stack coworking website and admin dashboard using Next.js, FastAPI, and MongoDB to manage locations, spaces, and image galleries",
        "Architected a responsive, component-driven frontend with TypeScript and Tailwind CSS, including dynamic routing and robust loading/error handling",
        "Implemented RESTful APIs and scalable data models to support content management and efficient CRUD operations"
      ]
    },
    {
      title: "Software Developer",
      company: "SFU Robot Soccer Club, Burnaby, BC",
      period: "Feb 2025 – Present",
      description: [
        "Developed modular QML UI components to visualize robot state and performance metrics",
        "Wrote Boost.Test cases for pathfinding and grid modules to ensure stable robot behavior",
        "Built C++ data pipelines to propagate robot state across modules, improving real-time responsiveness and team collaboration"
      ]
    }
  ]

  return (
    <div className="experience-section">
      <h2>Experience</h2>
      
      <div className="experience-timeline">
        {experiences.map((exp, index) => (
          <div key={index} className="experience-card">
            <div className="experience-header">
              <h3>{exp.title}</h3>
              <span className="company">{exp.company}</span>
              <span className="period">{exp.period}</span>
            </div>
            <ul className="description-list">
              {exp.description.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="skills-section">
        <h3>Technical Skills</h3>
        <div className="skills-list">
          <div className="skill-category">
            <span className="skill-type">Languages:</span>
            <span className="skill-items">{skills.languages.join(", ")}</span>
          </div>
          <div className="skill-category">
            <span className="skill-type">Frameworks & Tools:</span>
            <span className="skill-items">{skills.tools.join(", ")}</span>
          </div>
          <div className="skill-category">
            <span className="skill-type">Practices:</span>
            <span className="skill-items">{skills.practices.join(", ")}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Experience 