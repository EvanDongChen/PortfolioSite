import './Experience.css'

const Experience = () => {
  const skills = {
    languages: ["C", "C#", "C++", "Python", "JavaScript", "HTML/CSS", "QML", "SQLite"],
    tools: ["Unity", "Unity DevOps", "Visual Studio", "GitHub", "GitLab", "Linux", "Excel/Sheets"],
    practices: ["Agile Development", "Continuous Integration", "Git Version Control"]
  }

  const experiences = [
    {
      title: "Freelance Full-Stack Developer",
      company: "Whitebox Coworking Remote",
      period: "May 2025 – Present",
      description: [
        "Implemented React components for client website, enhancing UI consistency and responsiveness",
        "Developing admin dashboard with CRUD capabilities for 3+ coworking locations",
        "Building scalable backend database and APIs for real-time data flow"
      ]
    },
    {
      title: "Software Developer",
      company: "SFU Robot Soccer Club, Burnaby, BC",
      period: "Feb 2025 – Present",
      description: [
        "Implemented QML-based UI components for game state visualization",
        "Developed C++ path planning logic for robot navigation",
        "Collaborated with 30+ developers using Git and ticketing systems"
      ]
    }
  ]

  return (
    <div className="experience-section">
      <h2>Experience</h2>
      
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
    </div>
  )
}

export default Experience 