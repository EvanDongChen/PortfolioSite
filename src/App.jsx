import './App.css'
import Header from './components/Header'
import Home from './components/Home'
import Experience from './components/Experience'
import Education from './components/Education'
import Projects from './components/Projects'

function App() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <section id="home">
          <Home />
        </section>
        <section id="education">
          <Education />
        </section>
        <section id="experience">
          <Experience />
        </section>
        <section id="projects">
          <Projects />
        </section>
      </main>
    </div>
  )
}

export default App
