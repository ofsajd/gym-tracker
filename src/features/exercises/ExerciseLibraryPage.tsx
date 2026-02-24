import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Star, Plus, Trash2, Heart } from 'lucide-react';
import { db } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateId, removeDiacritics } from '@/lib/utils';
import type { Exercise } from '@/types/models';

type Tab = 'all' | 'favorites' | 'custom';

export function ExerciseLibraryPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const exercises = useLiveQuery(() => db.exercises.toArray());
  const muscleGroups = useLiveQuery(() => db.muscleGroups.toArray());

  const filtered = exercises?.filter((ex) => {
    const name = ex.isCustom ? ex.nameKey : t(ex.nameKey);
    const normalizedName = removeDiacritics(name.toLowerCase());
    const normalizedSearch = removeDiacritics(search.toLowerCase());
    const matchesSearch = !search || normalizedName.includes(normalizedSearch);
    const matchesMuscle = selectedMuscle ? ex.muscleGroupIds.includes(selectedMuscle) : true;
    const matchesTab =
      tab === 'all' ||
      (tab === 'favorites' && ex.isFavorite) ||
      (tab === 'custom' && ex.isCustom);
    return matchesSearch && matchesMuscle && matchesTab;
  });

  const toggleFavorite = async (ex: Exercise) => {
    await db.exercises.update(ex.id, { isFavorite: !ex.isFavorite });
  };

  const handleDelete = async (ex: Exercise) => {
    if (!ex.isCustom) return;
    if (!confirm(t('exerciseLibrary.deleteConfirm'))) return;
    await db.exercises.delete(ex.id);
  };

  return (
    <div>
      <PageHeader
        title={t('exerciseLibrary.title')}
        action={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('exerciseLibrary.addExercise')}
          </Button>
        }
      />

      <div className="p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {(['all', 'favorites', 'custom'] as Tab[]).map((t2) => (
            <button
              key={t2}
              onClick={() => setTab(t2)}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t2
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              {t2 === 'all' && t('exerciseLibrary.all')}
              {t2 === 'favorites' && t('exerciseLibrary.favorites')}
              {t2 === 'custom' && t('exerciseLibrary.custom')}
            </button>
          ))}
        </div>

        {/* Muscle group filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
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
        <div className="space-y-1.5">
          {tab === 'favorites' && filtered?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('exerciseLibrary.noFavorites')}</p>
            </div>
          )}

          {filtered?.map((ex) => {
            const name = ex.isCustom ? ex.nameKey : t(ex.nameKey);
            return (
              <Card key={ex.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  {/* Favorite */}
                  <button
                    className="shrink-0 touch-manipulation"
                    onClick={() => toggleFavorite(ex)}
                    title={ex.isFavorite ? t('exerciseLibrary.removeFromFavorites') : t('exerciseLibrary.addToFavorites')}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        ex.isFavorite
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
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

                  {/* Delete (custom only) */}
                  {ex.isCustom && (
                    <button
                      className="shrink-0 text-muted-foreground hover:text-destructive touch-manipulation"
                      onClick={() => handleDelete(ex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {tab !== 'favorites' && filtered?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('common.noData')}
            </p>
          )}
        </div>
      </div>

      {showAddDialog && (
        <AddExerciseDialog
          muscleGroups={muscleGroups ?? []}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}

function AddExerciseDialog({
  muscleGroups,
  onClose,
}: {
  muscleGroups: { id: string; nameKey: string }[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);

  const toggleMuscle = (id: string) => {
    setSelectedMuscles((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    await db.exercises.add({
      id: generateId(),
      nameKey: name.trim(),
      muscleGroupIds: selectedMuscles,
      isCustom: true,
      isFavorite: false,
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader onClose={onClose}>{t('exerciseLibrary.addExercise')}</DialogHeader>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            {t('exerciseLibrary.exerciseName')}
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('exerciseLibrary.exerciseName')}
            className="mt-1"
            autoFocus
          />
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">
            {t('exerciseLibrary.selectMuscles')}
          </label>
          <div className="flex gap-2 flex-wrap mt-2">
            {muscleGroups.map((mg) => (
              <button
                key={mg.id}
                onClick={() => toggleMuscle(mg.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedMuscles.includes(mg.id)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {t(mg.nameKey)}
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={handleSave} disabled={!name.trim()}>
          {t('common.save')}
        </Button>
      </div>
    </Dialog>
  );
}
