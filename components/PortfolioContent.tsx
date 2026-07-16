import React from 'react';
import Header from './Header';
import Section from './Section';
import ProjectCard from './ProjectCard';
import SandDune from './SandDune';
import ProfilePhoto from './ProfilePhoto';
import { GitHubIcon, LinkedInIcon, MailIcon, SearchIcon } from './Icons';
import { Project, Experience, Education } from '../types';

interface PortfolioContentProps {
  theme: string;
  colors: any;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredProjects: Project[];
  experiences: Experience[];
  education: Education;
  skills: { languages: string[]; frameworksAndTools: string[] };
}

const PortfolioContent: React.FC<PortfolioContentProps> = ({
  theme, colors, searchTerm, setSearchTerm, filteredProjects, experiences, education, skills
}) => {
  return (
    <div className="relative z-10">
      <Header />
      <main className="container mx-auto px-6 md:px-10">
        <Section id="home" className="min-h-screen flex flex-col justify-center items-center text-center">
          <ProfilePhoto />
          <h1 className={`text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${colors.heroGradient} animate-fade-in-down`}>
            Evan Chen
          </h1>
          <p className={`mt-4 text-xl md:text-2xl lg:text-3xl ${colors.highlightStrong} max-w-3xl animate-fade-in-up`}>
            Computer Science Student & Developer
          </p>
          <p className={`mt-6 text-lg ${colors.textLighter} max-w-3xl animate-fade-in-up delay-200`}>
            A passionate CS student with experience in full-stack development, object-oriented programming, and game development. Check out my projects to see how I'm growing as a developer! I also love drawing, check out{' '}
            <a
              href="https://www.instagram.com/hangyodonevantures/"
              target="_blank"
              rel="noopener noreferrer"
              className={`font-semibold underline underline-offset-2 hover:text-white transition-colors ${colors.highlight}`}
            >
              my art
            </a>
            .
          </p>
          <div className={`mt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-4 ${colors.highlightStrong}`}>
            <a href="https://github.com/evandongchen" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
              <GitHubIcon className="w-6 h-6" /> GitHub
            </a>
            <span className={`${theme === 'underwater' ? 'text-cyan-400/50' : 'text-emerald-400/40'}`}>•</span>
            <a href="https://www.linkedin.com/in/evandongchen/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
              <LinkedInIcon className="w-6 h-6" /> LinkedIn
            </a>
            <span className={`${theme === 'underwater' ? 'text-cyan-400/50' : 'text-emerald-400/40'}`}>•</span>
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
              <span className={`${theme === 'underwater' ? 'text-cyan-400/50' : 'text-emerald-400/40'}`}>•</span>
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
  );
};

export default React.memo(PortfolioContent);
