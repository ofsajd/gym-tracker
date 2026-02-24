import { create } from 'zustand';
import type { ThemeMode, Language, WeightUnit, AppSettings } from '@/types/models';

type ActiveWorkoutState = {
  isActive: boolean;
  workoutLogId: string | null;
  currentExerciseIndex: number;
  restTimerEnd: number | null; // timestamp
};

type UIStore = {
  // Settings
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;

  // Active workout
  activeWorkout: ActiveWorkoutState;
  setActiveWorkout: (state: Partial<ActiveWorkoutState>) => void;
  clearActiveWorkout: () => void;

  // Rest timer
  startRestTimer: (seconds: number) => void;
  clearRestTimer: () => void;

  // Theme
  applyTheme: (theme: ThemeMode) => void;
};

const DEFAULT_SETTINGS: AppSettings = {
  weightUnit: 'kg' as WeightUnit,
  theme: 'dark' as ThemeMode,
  language: 'pl' as Language,
  restTimerSeconds: 90,
  restTimerSound: true,
  restTimerVibrate: true,
  pushNotifications: true,
};

function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem('gym-settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

function applyThemeToDOM(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', isDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

export const useUIStore = create<UIStore>((set, get) => ({
  settings: loadSettings(),

  updateSettings: (partial) => {
    const newSettings = { ...get().settings, ...partial };
    localStorage.setItem('gym-settings', JSON.stringify(newSettings));
    if (partial.language) {
      localStorage.setItem('gym-language', partial.language);
    }
    if (partial.theme) {
      applyThemeToDOM(partial.theme);
    }
    set({ settings: newSettings });
  },

  activeWorkout: {
    isActive: false,
    workoutLogId: null,
    currentExerciseIndex: 0,
    restTimerEnd: null,
  },

  setActiveWorkout: (state) =>
    set((s) => ({
      activeWorkout: { ...s.activeWorkout, ...state },
    })),

  clearActiveWorkout: () =>
    set({
      activeWorkout: {
        isActive: false,
        workoutLogId: null,
        currentExerciseIndex: 0,
        restTimerEnd: null,
      },
    }),

  startRestTimer: (seconds) =>
    set((s) => ({
      activeWorkout: {
        ...s.activeWorkout,
        restTimerEnd: Date.now() + seconds * 1000,
      },
    })),

  clearRestTimer: () =>
    set((s) => ({
      activeWorkout: {
        ...s.activeWorkout,
        restTimerEnd: null,
      },
    })),

  applyTheme: (theme) => {
    applyThemeToDOM(theme);
  },
}));
