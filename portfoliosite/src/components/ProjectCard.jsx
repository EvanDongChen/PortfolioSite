import './ProjectCard.css'

const ProjectCard = ({ title, description, image, tags, link, period }) => {
  return (
    <div className="project-card">
      <div className="project-image">
        <img src={image} alt={title} />
      </div>
      <div className="project-content">
        <div className="project-header">
        <h3>{title}</h3>
        </div>
        <span className="project-period">{period}</span>
        <p>{description}</p>
        <div className="project-tags">
          {tags.map((tag, index) => (
            <span key={index} className="tag">
              {tag}
            </span>
          ))}
        </div>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="project-link">
            View Project →
          </a>
        )}
      </div>
    </div>
  )
}

export default ProjectCard 