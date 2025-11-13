import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.substring(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Education', href: '#education' },
    { name: 'Experience', href: '#experience' },
    { name: 'Skills', href: '#skills' },
    { name: 'Projects', href: '#projects' },
    { name: 'Contact', href: '#contact' },
  ];

  const linkUnderlineColor = theme === 'underwater' ? 'bg-cyan-300' : 'bg-indigo-300';
  const navTextColor = theme === 'underwater' ? 'text-cyan-100' : 'text-slate-200';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-900/50 backdrop-blur-lg shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <nav className="container mx-auto px-6 md:px-10 py-4 flex justify-between items-center">
        <a href="#home" onClick={(e) => handleNavClick(e, '#home')} className="flex items-center">
           <span className={`text-3xl font-bold ${navTextColor} hover:text-white transition-colors duration-300`}>EC</span>
        </a>
        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className={`text-lg ${navTextColor} hover:text-white transition-colors duration-300 relative group cursor-pointer`}
            >
              {link.name}
              <span className={`absolute bottom-0 left-0 w-0 h-0.5 ${linkUnderlineColor} transition-all duration-300 group-hover:w-full`}></span>
            </a>
          ))}
        </div>
        <div className="md:hidden">
            {/* Mobile menu button can be added here */}
        </div>
      </nav>
    </header>
  );
};

export default Header;