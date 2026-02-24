import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Star } from 'lucide-react';
import { db } from '@/db/schema';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { generateId, removeDiacritics } from '@/lib/utils';

type Props = {
  dayId: string;
  onClose: () => void;
};

export function ExercisePicker({ dayId, onClose }: Props) {
  const { t } = useTranslation();
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
      targetReps: '8-12',
      restSeconds: 90,
    });

    onClose();
  };

  return (
    <Dialog open onClose={onClose} className="max-h-[90vh]">
      <DialogHeader onClose={onClose}>{t('plans.selectExercise')}</DialogHeader>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search')}
          className="pl-9"
          autoFocus
        />
      </div>

      {/* Muscle group filter + favorites */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
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
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
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
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedMuscle === mg.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {t(mg.nameKey)}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
        {filtered?.map((ex) => {
          const name = ex.isCustom ? ex.nameKey : t(ex.nameKey);
          return (
            <button
              key={ex.id}
              onClick={() => handleSelect(ex.id)}
              className="w-full flex items-center justify-between gap-2 p-3 rounded-lg hover:bg-accent active:bg-accent/80 text-left transition-colors touch-manipulation"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {ex.muscleGroupIds.map((mgId) => {
                    const mg = muscleGroups?.find((m) => m.id === mgId);
                    return mg ? (
                      <Badge key={mgId} variant="secondary" className="text-[10px]">
                        {t(mg.nameKey)}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            </button>
          );
        })}

        {filtered?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('common.noData')}
          </p>
        )}
      </div>
    </Dialog>
  );
}
