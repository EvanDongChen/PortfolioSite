import './Home.css'
import portrait from '../assets/images/portrait.jpg'

const Home = () => {
  return (
    <div className="home-section">
      <div className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Evan Chen</h1>
            <p className="subtitle">Computer Science Student & Developer</p>
            <p className="description">
              A passionate CS about with  experience in full-stack development, object-oriented programming, and game development. 
              Check out my projects to see how I'm growing as a developer!</p>
            <div className="contact-links">
              <a href="https://github.com/EvanDongChen" target="_blank" rel="noopener noreferrer">GitHub</a>
              <span className="separator">•</span>
              <a href="https://www.linkedin.com/in/evandongchen/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <span className="separator">•</span>
              <a href="mailto:evanchen0609@gmail.com">evanchen0609@gmail.com</a>
              <span className="separator">•</span>
              <a href="https://www.instagram.com/hangyodonevantures/" target="_blank" rel="noopener noreferrer">Art</a>
            </div>
            <div className="hero-buttons">
              <button className="primary-button" onClick={() => document.getElementById('projects').scrollIntoView({ behavior: 'smooth' })}>
                View Projects
              </button>
              <button className="secondary-button" onClick={() => document.getElementById('experience').scrollIntoView({ behavior: 'smooth' })}>
                See Experience
              </button>
            </div>
          </div>
          <div className="hero-image">
            <img src={portrait} alt="Evan Chen" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home 