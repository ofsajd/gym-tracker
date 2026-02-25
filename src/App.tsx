import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LandingPage } from '@/features/landing/LandingPage';
import { WorkoutPage } from '@/features/workouts/WorkoutPage';
import { PlansPage } from '@/features/plans/PlansPage';
import { ProgressPage } from '@/features/progress/ProgressPage';
import { ExerciseLibraryPage } from '@/features/exercises/ExerciseLibraryPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<WorkoutPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="exercises" element={<ExerciseLibraryPage />} />
          <Route path="more" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
