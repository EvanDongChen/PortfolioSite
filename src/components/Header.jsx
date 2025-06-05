import { useState, useEffect } from 'react'
import './Header.css'

const Header = () => {
  const [activeSection, setActiveSection] = useState('home')

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'education', 'experience', 'projects']
      const scrollPosition = window.scrollY + 100 // Offset for header

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className="header">
      <nav className="nav">
        <button 
          className={`nav-link ${activeSection === 'home' ? 'active' : ''}`}
          onClick={() => scrollToSection('home')}
        >
          Home
        </button>
        <button 
          className={`nav-link ${activeSection === 'education' ? 'active' : ''}`}
          onClick={() => scrollToSection('education')}
        >
          Education
        </button>
        <button 
          className={`nav-link ${activeSection === 'experience' ? 'active' : ''}`}
          onClick={() => scrollToSection('experience')}
        >
          Experience
        </button>
        <button 
          className={`nav-link ${activeSection === 'projects' ? 'active' : ''}`}
          onClick={() => scrollToSection('projects')}
        >
          Projects
        </button>
      </nav>
    </header>
  )
}

export default Header 