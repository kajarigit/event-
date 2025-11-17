import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  
  const [theme, setTheme] = useState(() => {
    // Get theme specific to the current user
    if (user?.id) {
      const userThemeKey = `theme_${user.id}`;
      const savedTheme = localStorage.getItem(userThemeKey);
      return savedTheme || 'light';
    }
    // Fallback to generic theme for non-logged-in users
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  // Update theme when user changes (login/logout)
  useEffect(() => {
    if (user?.id) {
      const userThemeKey = `theme_${user.id}`;
      const savedTheme = localStorage.getItem(userThemeKey);
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        // New user, default to light theme
        setTheme('light');
      }
    } else {
      // No user logged in, use generic theme
      const savedTheme = localStorage.getItem('theme');
      setTheme(savedTheme || 'light');
    }
  }, [user?.id]);

  useEffect(() => {
    // Save theme specific to current user
    if (user?.id) {
      const userThemeKey = `theme_${user.id}`;
      localStorage.setItem(userThemeKey, theme);
    } else {
      // Save as generic theme if no user
      localStorage.setItem('theme', theme);
    }
    
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, user?.id]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
