import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Star, Plus, Trash2, Heart, Info, ExternalLink } from 'lucide-react';
import { db } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateId, removeDiacritics } from '@/lib/utils';
import { MuscleIcon } from '@/components/icons/MuscleIcons';
import type { Exercise } from '@/types/models';

type Tab = 'all' | 'favorites' | 'custom';

export function ExerciseLibraryPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);

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

        {/* Count */}
        {filtered && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} {t('plans.exercises').toLowerCase()}
          </p>
        )}

        {/* Exercise list */}
        <div className="space-y-2">
          {tab === 'favorites' && filtered?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('exerciseLibrary.noFavorites')}</p>
            </div>
          )}

          {filtered?.map((ex) => {
            const name = ex.isCustom ? ex.nameKey : t(ex.nameKey);
            const primaryMgId = ex.muscleGroupIds[0];
            return (
              <Card key={ex.id}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  {/* Primary muscle icon */}
                  {primaryMgId && (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MuscleIcon muscleGroupId={primaryMgId} className="h-5 w-5 text-primary" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
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

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Info button */}
                    {(!ex.isCustom || ex.description || ex.videoUrl) && (
                      <button
                        className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent touch-manipulation"
                        onClick={() => setDetailExercise(ex)}
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    )}

                    {/* Favorite */}
                    <button
                      className="h-8 w-8 flex items-center justify-center rounded-md touch-manipulation"
                      onClick={() => toggleFavorite(ex)}
                      title={ex.isFavorite ? t('exerciseLibrary.removeFromFavorites') : t('exerciseLibrary.addToFavorites')}
                    >
                      <Star
                        className={`h-4.5 w-4.5 ${
                          ex.isFavorite
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>

                    {/* Delete (custom only) */}
                    {ex.isCustom && (
                      <button
                        className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive touch-manipulation"
                        onClick={() => handleDelete(ex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
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

      {detailExercise && (
        <ExerciseDetailDialog
          exercise={detailExercise}
          muscleGroups={muscleGroups ?? []}
          onClose={() => setDetailExercise(null)}
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
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
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
      ...(description.trim() && { description: description.trim() }),
      ...(videoUrl.trim() && { videoUrl: videoUrl.trim() }),
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
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                  selectedMuscles.includes(mg.id)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                <MuscleIcon muscleGroupId={mg.id} className="h-3.5 w-3.5" />
                {t(mg.nameKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">
            {t('common.description')} ({t('exerciseLibrary.optional')})
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('exerciseLibrary.descriptionPlaceholder')}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">
            {t('exerciseLibrary.videoUrl')} ({t('exerciseLibrary.optional')})
          </label>
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/..."
            className="mt-1"
          />
        </div>

        <Button className="w-full" onClick={handleSave} disabled={!name.trim()}>
          {t('common.save')}
        </Button>
      </div>
    </Dialog>
  );
}

function ExerciseDetailDialog({
  exercise,
  muscleGroups,
  onClose,
}: {
  exercise: Exercise;
  muscleGroups: { id: string; nameKey: string }[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const name = exercise.isCustom ? exercise.nameKey : t(exercise.nameKey);

  // Build description key from nameKey: "exercises.benchPress" -> "exerciseDesc.benchPress"
  const descKey = exercise.nameKey.replace('exercises.', 'exerciseDesc.');
  const i18nDescription = t(descKey, { defaultValue: '' });
  const hasI18nDescription = i18nDescription && i18nDescription !== descKey;
  const description = exercise.isCustom ? (exercise.description ?? '') : (hasI18nDescription ? i18nDescription : '');
  const hasDescription = !!description;

  const primaryMgId = exercise.muscleGroupIds[0];

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader onClose={onClose}>{t('exerciseDesc.exerciseInfo')}</DialogHeader>

      <div className="space-y-4 py-2">
        {/* Exercise name + primary muscle icon */}
        <div className="flex items-center gap-3">
          {primaryMgId && (
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MuscleIcon muscleGroupId={primaryMgId} className="h-7 w-7 text-primary" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <div className="flex gap-1 mt-1 flex-wrap">
              {exercise.muscleGroupIds.map((mgId, idx) => {
                const mg = muscleGroups.find((m) => m.id === mgId);
                return mg ? (
                  <Badge
                    key={mgId}
                    variant={idx === 0 ? 'default' : 'secondary'}
                    className={`text-[10px] ${idx === 0 ? 'bg-primary/15 text-primary border-0' : ''}`}
                  >
                    <MuscleIcon muscleGroupId={mgId} className="h-3 w-3 mr-0.5" />
                    {t(mg.nameKey)}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        </div>

        {/* Description */}
        {hasDescription && (
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-sm text-foreground leading-relaxed">{description}</p>
          </div>
        )}

        {/* Video link */}
        {exercise.videoUrl && (
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors touch-manipulation"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="text-sm font-medium">{t('exerciseDesc.watchVideo')}</span>
          </a>
        )}

        {/* Muscle groups detail */}
        <div className="space-y-2">
          {exercise.muscleGroupIds.map((mgId, idx) => {
            const mg = muscleGroups.find((m) => m.id === mgId);
            if (!mg) return null;
            return (
              <div
                key={mgId}
                className={`flex items-center gap-3 p-2.5 rounded-lg ${
                  idx === 0 ? 'bg-primary/10' : 'bg-secondary/50'
                }`}
              >
                <MuscleIcon muscleGroupId={mgId} className={`h-5 w-5 ${idx === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${idx === 0 ? 'text-primary' : 'text-foreground'}`}>
                  {t(mg.nameKey)}
                </span>
                {idx === 0 && (
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-auto">
                    {t('exerciseLibrary.primary')}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <Button variant="outline" className="w-full" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </Dialog>
  );
}
