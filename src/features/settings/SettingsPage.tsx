import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Globe, Palette, Scale, Timer, Volume2, Vibrate, Bell,
  Download, Upload, FileSpreadsheet, Share2, Trash2,
  ChevronRight, Moon, Sun, Monitor, QrCode, ScanLine,
} from 'lucide-react';
import { db } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { useUIStore } from '@/stores/ui-store';
import { QRShareDialog } from './QRShareDialog';
import { QRScanDialog } from './QRScanDialog';
import type { ThemeMode, Language, WeightUnit, TrainingPlan } from '@/types/models';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useUIStore();
  const [showQRShare, setShowQRShare] = useState(false);
  const [showQRScan, setShowQRScan] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedPlanData, setImportedPlanData] = useState<any>(null);
  const [importName, setImportName] = useState('');
  const [importDesc, setImportDesc] = useState('');

  const allPlans = useLiveQuery(() => db.trainingPlans.orderBy('createdAt').reverse().toArray());

  const handleLanguageChange = (lang: Language) => {
    i18n.changeLanguage(lang);
    updateSettings({ language: lang });
  };

  const handleThemeChange = (theme: ThemeMode) => {
    updateSettings({ theme });
  };

  const handleExportAll = async () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      plans: await db.trainingPlans.toArray(),
      days: await db.trainingDays.toArray(),
      plannedExercises: await db.plannedExercises.toArray(),
      exercises: await db.exercises.filter((e) => e.isCustom).toArray(),
      muscleGroups: await db.muscleGroups.toArray(),
      workoutLogs: await db.workoutLogs.toArray(),
      exerciseLogs: await db.exerciseLogs.toArray(),
      setLogs: await db.setLogs.toArray(),
      settings,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `gymtracker-backup-${formatDate()}.json`);
  };

  const handleImportData = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.version) {
          alert('Invalid file format');
          return;
        }

        // Import data
        if (data.plans) await db.trainingPlans.bulkPut(data.plans);
        if (data.days) await db.trainingDays.bulkPut(data.days);
        if (data.plannedExercises) await db.plannedExercises.bulkPut(data.plannedExercises);
        if (data.exercises) {
          for (const ex of data.exercises) {
            await db.exercises.put(ex);
          }
        }
        if (data.workoutLogs) await db.workoutLogs.bulkPut(data.workoutLogs);
        if (data.exerciseLogs) await db.exerciseLogs.bulkPut(data.exerciseLogs);
        if (data.setLogs) await db.setLogs.bulkPut(data.setLogs);

        alert(settings.language === 'pl' ? 'Dane zaimportowane!' : 'Data imported!');
      } catch {
        alert('Error importing data');
      }
    };
    input.click();
  };

  const handleExportXlsx = async () => {
    const { utils, writeFile } = await import('xlsx');
    const wb = utils.book_new();

    // Workouts sheet
    const workouts = await db.workoutLogs.toArray();
    const allExLogs = await db.exerciseLogs.toArray();
    const allSetLogs = await db.setLogs.toArray();
    const allExercises = await db.exercises.toArray();

    const rows: Record<string, unknown>[] = [];
    for (const w of workouts) {
      if (!w.completedAt) continue;
      const eLogs = allExLogs.filter((el) => el.workoutLogId === w.id);
      for (const el of eLogs) {
        const ex = allExercises.find((e) => e.id === el.exerciseId);
        const exName = ex ? (ex.isCustom ? ex.nameKey : t(ex.nameKey)) : el.exerciseId;
        const sets = allSetLogs
          .filter((s) => s.exerciseLogId === el.id)
          .sort((a, b) => a.setNumber - b.setNumber);
        for (const s of sets) {
          rows.push({
            Date: w.completedAt ? new Date(w.completedAt).toLocaleDateString() : '',
            Exercise: exName,
            Set: s.setNumber,
            Weight_kg: s.weight,
            Reps: s.reps,
            Volume: s.weight * s.reps,
            Warmup: s.isWarmup ? 'Yes' : 'No',
            RPE: s.rpe ?? '',
          });
        }
      }
    }

    const ws = utils.json_to_sheet(rows);
    utils.book_append_sheet(wb, ws, 'Workouts');
    writeFile(wb, `gymtracker-${formatDate()}.xlsx`);
  };

  const sharePlan = async (plan: TrainingPlan) => {
    const days = await db.trainingDays.where('planId').equals(plan.id).toArray();
    const plannedExercises: unknown[] = [];
    const exerciseIds = new Set<string>();

    for (const day of days) {
      const exs = await db.plannedExercises.where('dayId').equals(day.id).toArray();
      plannedExercises.push(...(exs as any[]));
      exs.forEach((e) => exerciseIds.add(e.exerciseId));
    }

    const exercises = await db.exercises.bulkGet([...exerciseIds]);

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      plan,
      days,
      plannedExercises,
      exercises: exercises.filter((e) => e?.isCustom),
    };

    const json = JSON.stringify(exportData);

    if (navigator.share) {
      const blob = new Blob([json], { type: 'application/json' });
      const file = new File([blob], `${plan.name}.gymplan.json`, { type: 'application/json' });
      try {
        await navigator.share({ files: [file], title: plan.name });
        setShowPlanPicker(false);
        return;
      } catch {
        // Fallback to download
      }
    }

    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `${plan.name}.gymplan.json`);
    setShowPlanPicker(false);
  };

  const handleImportPlan = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.gymplan.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.plan) {
          alert('Invalid plan file');
          return;
        }
        setImportedPlanData(data);
        setImportName(data.plan.name ?? '');
        setImportDesc(data.plan.description ?? '');
        setShowImportDialog(true);
      } catch {
        alert('Error importing plan');
      }
    };
    input.click();
  };

  const confirmImportPlan = async () => {
    if (!importedPlanData) return;
    const data = importedPlanData;
    try {
      const newPlanId = crypto.randomUUID();
      const dayIdMap = new Map<string, string>();

      await db.trainingPlans.add({
        ...data.plan,
        id: newPlanId,
        name: importName || data.plan.name,
        description: importDesc || undefined,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      for (const day of (data.days ?? [])) {
        const newDayId = crypto.randomUUID();
        dayIdMap.set(day.id, newDayId);
        await db.trainingDays.add({ ...day, id: newDayId, planId: newPlanId });
      }

      for (const pe of (data.plannedExercises ?? [])) {
        const newDayId = dayIdMap.get(pe.dayId) ?? pe.dayId;
        await db.plannedExercises.add({
          ...pe,
          id: crypto.randomUUID(),
          dayId: newDayId,
        });
      }

      for (const ex of (data.exercises ?? [])) {
        if (ex.isCustom) {
          const existing = await db.exercises.get(ex.id);
          if (!existing) {
            await db.exercises.add(ex);
          }
        }
      }

      setShowImportDialog(false);
      setImportedPlanData(null);
      alert(settings.language === 'pl' ? 'Plan zaimportowany!' : 'Plan imported!');
    } catch {
      alert('Error importing plan');
    }
  };

  const handleClearData = async () => {
    if (!confirm(t('settings.clearConfirm'))) return;
    await db.setLogs.clear();
    await db.exerciseLogs.clear();
    await db.workoutLogs.clear();
    await db.plannedExercises.clear();
    await db.trainingDays.clear();
    await db.trainingPlans.clear();
    alert(settings.language === 'pl' ? 'Dane usunięte!' : 'Data cleared!');
  };

  return (
    <div>
      <PageHeader title={t('settings.title')} />

      <div className="p-4 space-y-4">
        {/* Language */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 font-medium">{t('settings.language')}</span>
              <div className="flex gap-1">
                <Button
                  variant={settings.language === 'pl' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageChange('pl')}
                >
                  🇵🇱 PL
                </Button>
                <Button
                  variant={settings.language === 'en' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageChange('en')}
                >
                  🇬🇧 EN
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 font-medium">{t('settings.theme')}</span>
              <div className="flex gap-1">
                {[
                  { value: 'light' as ThemeMode, icon: Sun, label: t('settings.themeLight') },
                  { value: 'dark' as ThemeMode, icon: Moon, label: t('settings.themeDark') },
                  { value: 'system' as ThemeMode, icon: Monitor, label: t('settings.themeSystem') },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={settings.theme === opt.value ? 'default' : 'outline'}
                    size="icon-sm"
                    onClick={() => handleThemeChange(opt.value)}
                    title={opt.label}
                  >
                    <opt.icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weight unit */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 font-medium">{t('settings.weightUnit')}</span>
              <div className="flex gap-1">
                <Button
                  variant={settings.weightUnit === 'kg' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSettings({ weightUnit: 'kg' as WeightUnit })}
                >
                  kg
                </Button>
                <Button
                  variant={settings.weightUnit === 'lbs' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSettings({ weightUnit: 'lbs' as WeightUnit })}
                >
                  lbs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rest timer settings */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 font-medium">{t('settings.restTimer')}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    updateSettings({
                      restTimerSeconds: Math.max(15, settings.restTimerSeconds - 15),
                    })
                  }
                >
                  -
                </Button>
                <span className="w-10 text-center font-mono">{settings.restTimerSeconds}s</span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    updateSettings({
                      restTimerSeconds: Math.min(600, settings.restTimerSeconds + 15),
                    })
                  }
                >
                  +
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3 pl-8">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm">{t('settings.sound')}</span>
              <button
                className={`w-10 h-6 rounded-full transition-colors ${
                  settings.restTimerSound ? 'bg-primary' : 'bg-secondary'
                }`}
                onClick={() => updateSettings({ restTimerSound: !settings.restTimerSound })}
              >
                <div
                  className={`h-5 w-5 rounded-full shadow transition-transform ${
                    settings.restTimerSound
                      ? 'translate-x-4.5 bg-primary-foreground'
                      : 'translate-x-0.5 bg-white dark:bg-zinc-300'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-3 pl-8">
              <Vibrate className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm">{t('settings.vibration')}</span>
              <button
                className={`w-10 h-6 rounded-full transition-colors ${
                  settings.restTimerVibrate ? 'bg-primary' : 'bg-secondary'
                }`}
                onClick={() => updateSettings({ restTimerVibrate: !settings.restTimerVibrate })}
              >
                <div
                  className={`h-5 w-5 rounded-full shadow transition-transform ${
                    settings.restTimerVibrate
                      ? 'translate-x-4.5 bg-primary-foreground'
                      : 'translate-x-0.5 bg-white dark:bg-zinc-300'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-3 pl-8">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <span className="text-sm">{t('settings.pushNotifications')}</span>
                <p className="text-xs text-muted-foreground">{t('settings.pushNotificationsDesc')}</p>
              </div>
              <button
                className={`w-10 h-6 rounded-full transition-colors ${
                  settings.pushNotifications ? 'bg-primary' : 'bg-secondary'
                }`}
                onClick={async () => {
                  if (!settings.pushNotifications && 'Notification' in window) {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') return;
                  }
                  updateSettings({ pushNotifications: !settings.pushNotifications });
                }}
              >
                <div
                  className={`h-5 w-5 rounded-full shadow transition-transform ${
                    settings.pushNotifications
                      ? 'translate-x-4.5 bg-primary-foreground'
                      : 'translate-x-0.5 bg-white dark:bg-zinc-300'
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Data management */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t('settings.dataManagement')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            <SettingsButton icon={Download} label={t('settings.exportAll')} onClick={handleExportAll} />
            <SettingsButton icon={Upload} label={t('settings.importData')} onClick={handleImportData} />
            <SettingsButton icon={FileSpreadsheet} label={t('settings.exportXlsx')} onClick={handleExportXlsx} />
            <SettingsButton icon={Share2} label={t('settings.sharePlan')} onClick={() => setShowPlanPicker(true)} />
            <SettingsButton icon={QrCode} label={t('settings.shareQR')} onClick={() => setShowQRShare(true)} />
            <SettingsButton icon={ScanLine} label={t('settings.scanQR')} onClick={() => setShowQRScan(true)} />
            <SettingsButton icon={Upload} label={t('settings.importPlan')} onClick={handleImportPlan} />
            <SettingsButton
              icon={Trash2}
              label={t('settings.clearData')}
              onClick={handleClearData}
              destructive
            />
          </CardContent>
        </Card>

        {/* About */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>GymTracker v1.0.0</p>
        </div>
      </div>

      <QRShareDialog open={showQRShare} onClose={() => setShowQRShare(false)} />
      <QRScanDialog open={showQRScan} onClose={() => setShowQRScan(false)} />

      {/* Plan picker for sharing */}
      {showPlanPicker && (
        <Dialog open onClose={() => setShowPlanPicker(false)}>
          <DialogHeader onClose={() => setShowPlanPicker(false)}>
            {t('settings.selectPlanToShare')}
          </DialogHeader>
          <div className="space-y-2 py-2">
            {allPlans?.map((plan) => (
              <button
                key={plan.id}
                onClick={() => sharePlan(plan)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-accent active:bg-accent/80 text-left transition-colors touch-manipulation"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{plan.name}</p>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground truncate">{plan.description}</p>
                  )}
                </div>
                {plan.isActive && (
                  <span className="text-xs text-primary font-medium shrink-0">{t('plans.active')}</span>
                )}
              </button>
            ))}
            {(!allPlans || allPlans.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">{t('common.noData')}</p>
            )}
          </div>
        </Dialog>
      )}

      {/* Import plan name/desc dialog */}
      {showImportDialog && (
        <Dialog open onClose={() => { setShowImportDialog(false); setImportedPlanData(null); }}>
          <DialogHeader onClose={() => { setShowImportDialog(false); setImportedPlanData(null); }}>
            {t('settings.importPlan')}
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('plans.planName')}</label>
              <Input
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder={t('plans.planName')}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('common.description')}</label>
              <Input
                value={importDesc}
                onChange={(e) => setImportDesc(e.target.value)}
                placeholder={t('common.description')}
                className="mt-1"
              />
            </div>
            <Button className="w-full" onClick={confirmImportPlan}>
              {t('common.import')}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function SettingsButton({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left text-sm hover:bg-accent active:bg-accent/80 transition-colors touch-manipulation ${
        destructive ? 'text-destructive' : ''
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(): string {
  return new Date().toISOString().slice(0, 10);
}
