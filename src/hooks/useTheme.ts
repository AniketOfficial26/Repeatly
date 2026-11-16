import { useEffect, useState } from 'react';
import { ACCENT_PALETTES } from '../data/defaults';
import { SurfaceStyle, ThemeSettings } from '../types/todo';

const SURFACE_TOKENS: Record<
  SurfaceStyle,
  {
    light: { canvas: string; surface: string; elevated: string; muted: string; text: string; secondary: string; hairline: string };
    dark: { canvas: string; surface: string; elevated: string; muted: string; text: string; secondary: string; hairline: string };
  }
> = {
  espresso: {
    light: {
      canvas: '#E6E7DC',
      surface: '#F0F1E7',
      elevated: '#F6F7EF',
      muted: '#DBDDD0',
      text: '#191B13',
      secondary: '#5B5E50',
      hairline: 'rgba(25, 27, 19, 0.10)',
    },
    dark: {
      canvas: '#12100E',
      surface: '#1D1A16',
      elevated: '#26221D',
      muted: '#302B25',
      text: '#F4F2EC',
      secondary: '#B2ADA2',
      hairline: 'rgba(255, 248, 235, 0.09)',
    },
  },
  slate: {
    light: {
      canvas: '#E3E6E8',
      surface: '#ECEFF1',
      elevated: '#F3F5F7',
      muted: '#D5DADF',
      text: '#14181D',
      secondary: '#525C66',
      hairline: 'rgba(20, 24, 29, 0.10)',
    },
    dark: {
      canvas: '#0E1116',
      surface: '#171C23',
      elevated: '#202630',
      muted: '#29303D',
      text: '#EFF2F6',
      secondary: '#9CA6B5',
      hairline: 'rgba(235, 242, 255, 0.09)',
    },
  },
  contrast: {
    light: {
      canvas: '#DDDCD2',
      surface: '#EAE9E0',
      elevated: '#F2F1E8',
      muted: '#CFCEC2',
      text: '#0F100C',
      secondary: '#3E4036',
      hairline: 'rgba(15, 16, 12, 0.18)',
    },
    dark: {
      canvas: '#090908',
      surface: '#141311',
      elevated: '#1E1C19',
      muted: '#292622',
      text: '#FAFAF5',
      secondary: '#C9C6BC',
      hairline: 'rgba(255, 255, 245, 0.16)',
    },
  },
};

export function useTheme(settings: ThemeSettings) {
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    setSystemPrefersDark(mq.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    settings.mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : settings.mode;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const accent = ACCENT_PALETTES[settings.accentId] ?? ACCENT_PALETTES.lime;
    const surfaceSet = (SURFACE_TOKENS[settings.surfaceStyle] ?? SURFACE_TOKENS.espresso)[resolvedTheme];

    root.style.setProperty('--bg-canvas', surfaceSet.canvas);
    root.style.setProperty('--bg-surface', surfaceSet.surface);
    root.style.setProperty('--bg-surface-elevated', surfaceSet.elevated);
    root.style.setProperty('--bg-surface-muted', surfaceSet.muted);
    root.style.setProperty('--text-primary', surfaceSet.text);
    root.style.setProperty('--text-secondary', surfaceSet.secondary);
    root.style.setProperty('--border-hairline', surfaceSet.hairline);

    root.style.setProperty('--accent', resolvedTheme === 'dark' ? accent.darkAccent : accent.lightAccent);
    root.style.setProperty('--accent-bright', accent.darkAccent);
    root.style.setProperty('--accent-fg', accent.fg);
    root.style.setProperty('--accent-card', accent.cardBg);
    root.style.setProperty('--accent-card-fg', accent.cardFg);
    root.style.setProperty('--accent-soft', resolvedTheme === 'dark' ? accent.softDark : accent.softLight);

    const fontScalePx =
      settings.fontScale === 'compact' ? '14.5px' : settings.fontScale === 'comfortable' ? '17px' : '15.5px';
    root.style.fontSize = fontScalePx;
  }, [resolvedTheme, settings.accentId, settings.surfaceStyle, settings.fontScale]);

  return { resolvedTheme, systemPrefersDark };
}
