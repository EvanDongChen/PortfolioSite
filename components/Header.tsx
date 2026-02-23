import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const targetId = href.substring(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Experience', href: '#experience' },
    { name: 'Education', href: '#education' },
    { name: 'Skills', href: '#skills' },
    { name: 'Projects', href: '#projects' },
    { name: 'Contact', href: '#contact' },
  ];

  const linkUnderlineColor = theme === 'underwater' ? 'bg-cyan-300' : 'bg-indigo-300';
  const navTextColor = theme === 'underwater' ? 'text-cyan-100' : 'text-slate-200';
  const accentColor = theme === 'underwater' ? 'text-cyan-300' : 'text-indigo-300';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled || isMobileMenuOpen
            ? 'bg-slate-900/50 backdrop-blur-lg shadow-lg'
            : 'bg-transparent'
          }`}
      >
        <nav className="container mx-auto px-6 md:px-10 py-4 flex justify-between items-center">
          <a href="#home" onClick={(e) => handleNavClick(e, '#home')} className="flex items-center">
            <span className={`text-3xl font-bold ${navTextColor} hover:text-white transition-colors duration-300`}>EC</span>
          </a>

          {/* Desktop nav */}
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

          {/* Hamburger button */}
          <button
            className="md:hidden relative w-8 h-8 flex flex-col justify-center items-center z-50"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span
              className={`block w-6 h-0.5 rounded-full transition-all duration-300 ${isMobileMenuOpen
                  ? `${accentColor.replace('text-', 'bg-')} rotate-45 translate-y-0`
                  : `bg-white -translate-y-1.5`
                }`}
            />
            <span
              className={`block w-6 h-0.5 rounded-full bg-white transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 scale-0' : 'opacity-100'
                }`}
            />
            <span
              className={`block w-6 h-0.5 rounded-full transition-all duration-300 ${isMobileMenuOpen
                  ? `${accentColor.replace('text-', 'bg-')} -rotate-45 translate-y-0`
                  : `bg-white translate-y-1.5`
                }`}
            />
          </button>
        </nav>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-500 md:hidden ${isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
          }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-slate-900/90 backdrop-blur-xl transition-opacity duration-500 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
            }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Menu links */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          {navLinks.map((link, index) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className={`text-3xl font-semibold ${navTextColor} hover:text-white transition-all duration-300 py-4 cursor-pointer`}
              style={{
                opacity: isMobileMenuOpen ? 1 : 0,
                transform: isMobileMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.4s ease ${index * 0.07 + 0.15}s, transform 0.4s ease ${index * 0.07 + 0.15}s, color 0.3s`,
              }}
            >
              {link.name}
            </a>
          ))}
        </div>
      </div>
    </>
  );
};

export default Header;