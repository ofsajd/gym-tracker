import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Star } from 'lucide-react';
import { db } from '@/db/schema';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { generateId, removeDiacritics } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { MuscleIcon } from '@/components/icons/MuscleIcons';

type Props = {
  dayId: string;
  onClose: () => void;
};

export function ExercisePicker({ dayId, onClose }: Props) {
  const { t } = useTranslation();
  const { settings } = useUIStore();
  const [search, setSearch] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const exercises = useLiveQuery(() => db.exercises.toArray());
  const muscleGroups = useLiveQuery(() => db.muscleGroups.toArray());
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const filtered = exercises?.filter((ex) => {
    const name = ex.isCustom ? ex.nameKey : t(ex.nameKey);
    const normalizedName = removeDiacritics(name.toLowerCase());
    const normalizedSearch = removeDiacritics(search.toLowerCase());
    const matchesSearch = normalizedName.includes(normalizedSearch);
    const matchesMuscle = selectedMuscle ? ex.muscleGroupIds.includes(selectedMuscle) : true;
    const matchesFavorites = showFavoritesOnly ? !!ex.isFavorite : true;
    return matchesSearch && matchesMuscle && matchesFavorites;
  });

  const handleSelect = async (exerciseId: string) => {
    const existingExercises = await db.plannedExercises
      .where('dayId')
      .equals(dayId)
      .toArray();
    const order = existingExercises.length + 1;

    await db.plannedExercises.add({
      id: generateId(),
      dayId,
      exerciseId,
      order,
      targetSets: 3,
      targetReps: '8',
      restSeconds: settings.restTimerSeconds,
    });

    onClose();
  };

  return (
    <Dialog open onClose={onClose} className="max-h-[90vh]" position="top">
      <DialogHeader onClose={onClose}>
        {t('plans.selectExercise')}
        {filtered && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            ({filtered.length})
          </span>
        )}
      </DialogHeader>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search')}
          className="pl-9"
        />
      </div>

      {/* Muscle group filter + favorites */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
            showFavoritesOnly
              ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          <Star className={`h-3 w-3 ${showFavoritesOnly ? 'fill-current' : ''}`} />
          {t('exerciseLibrary.favorites')}
        </button>
        <button
          onClick={() => setSelectedMuscle(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedMuscle === null
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          {t('plans.allMuscles')}
        </button>
        {muscleGroups?.map((mg) => (
          <button
            key={mg.id}
            onClick={() => setSelectedMuscle(selectedMuscle === mg.id ? null : mg.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              selectedMuscle === mg.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            <MuscleIcon muscleGroupId={mg.id} className="h-3.5 w-3.5" />
            {t(mg.nameKey)}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <div className="space-y-0.5 max-h-[55vh] overflow-y-auto -mx-1 px-1">
        {filtered?.map((ex) => {
          const name = ex.isCustom ? ex.nameKey : t(ex.nameKey);
          const primaryMgId = ex.muscleGroupIds[0];
          return (
            <button
              key={ex.id}
              onClick={() => handleSelect(ex.id)}
              className="w-full flex items-center gap-3 p-3.5 rounded-lg hover:bg-accent active:bg-accent/80 text-left transition-colors touch-manipulation border-b border-border/40 last:border-0"
            >
              {/* Primary muscle icon */}
              {primaryMgId && (
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MuscleIcon muscleGroupId={primaryMgId} className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{name}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {ex.muscleGroupIds.map((mgId, idx) => {
                    const mg = muscleGroups?.find((m) => m.id === mgId);
                    return mg ? (
                      <Badge
                        key={mgId}
                        variant={idx === 0 ? 'default' : 'secondary'}
                        className={`text-[10px] ${idx === 0 ? 'bg-primary/15 text-primary border-0' : ''}`}
                      >
                        {t(mg.nameKey)}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              {ex.isFavorite && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
              )}
            </button>
          );
        })}

        {filtered?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t('common.noData')}
          </p>
        )}
      </div>
    </Dialog>
  );
}
