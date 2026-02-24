export type MuscleGroup = {
  id: string;
  nameKey: string; // i18n key, e.g. "muscles.chest"
};

export type Exercise = {
  id: string;
  nameKey: string; // i18n key for built-in, raw name for custom
  muscleGroupIds: string[];
  isCustom: boolean;
  isFavorite?: boolean;
  notes?: string;
};

export type TrainingPlan = {
  id: string;
  name: string;
  description?: string;
  weekCount: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
};

export type TrainingDay = {
  id: string;
  planId: string;
  name: string;
  order: number;
};

export type PlannedExercise = {
  id: string;
  dayId: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  targetReps: string; // e.g. "8-12"
  initialWeight?: number; // starting weight in kg for first workout
  restSeconds?: number;
  notes?: string;
};

export type WorkoutLog = {
  id: string;
  dayId?: string;
  planId?: string;
  weekNumber?: number;
  startedAt: Date;
  completedAt?: Date;
  notes?: string;
  bodyweight?: number;
};

export type ExerciseLog = {
  id: string;
  workoutLogId: string;
  exerciseId: string;
  order: number;
};

export type SetLog = {
  id: string;
  exerciseLogId: string;
  setNumber: number;
  weight: number; // always in kg
  reps: number;
  rpe?: number;
  isWarmup: boolean;
  completedAt: Date;
};

export type WeightUnit = 'kg' | 'lbs';
export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'pl' | 'en';

export type AppSettings = {
  weightUnit: WeightUnit;
  theme: ThemeMode;
  language: Language;
  restTimerSeconds: number;
  restTimerSound: boolean;
  restTimerVibrate: boolean;
  pushNotifications: boolean;
};

export type WeightRecommendation = {
  weight: number;
  direction: 'increase' | 'maintain' | 'deload';
};

export type ExportPlanData = {
  version: number;
  exportedAt: string;
  plan: TrainingPlan;
  days: TrainingDay[];
  plannedExercises: PlannedExercise[];
  exercises: Exercise[];
};

export type ExportFullData = {
  version: number;
  exportedAt: string;
  plans: TrainingPlan[];
  days: TrainingDay[];
  plannedExercises: PlannedExercise[];
  exercises: Exercise[];
  muscleGroups: MuscleGroup[];
  workoutLogs: WorkoutLog[];
  exerciseLogs: ExerciseLog[];
  setLogs: SetLog[];
  settings: AppSettings;
};
