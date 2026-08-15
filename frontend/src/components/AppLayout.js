import React from 'react';
import Sidebar from '../pages/Sidebar';
import { useTheme } from '../context/ThemeContext';

export default function AppLayout({ children }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" style={{ position: 'relative' }}>

        {/* Theme toggle — fixed top-right of the page */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            position: 'fixed',
            top: 18,
            right: 24,
            zIndex: 999,
            width: 40,
            height: 40,
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            cursor: 'pointer',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.background = 'var(--accent-soft)';
            e.currentTarget.style.transform = 'rotate(20deg) scale(1.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'var(--bg-card)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {children}
      </main>
    </div>
  );
}