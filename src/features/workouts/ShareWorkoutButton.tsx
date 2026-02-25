import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ShareData = {
  duration: string;
  totalSets: number;
  totalVolume: string;
  weightUnit: string;
  exercises: Array<{ name: string; sets: number; volume: string }>;
  prs: Array<{ exerciseName: string; type: string; value: string }>;
  date: string;
};

export function ShareWorkoutButton({ data }: { data: ShareData }) {
  const { t } = useTranslation();

  const generateCanvas = useCallback(async () => {
    const canvas = document.createElement('canvas');
    const w = 540;
    const lineHeight = 24;
    const exerciseCount = data.exercises.length;
    const prCount = data.prs.length;
    const h = 260 + exerciseCount * lineHeight + (prCount > 0 ? 40 + prCount * lineHeight : 0);
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d')!;
    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // Gradient accent bar
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 4);

    // Title
    ctx.fillStyle = '#fafafa';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('💪 GymTracker', 24, 40);

    // Date
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText(data.date, 24, 64);

    // Stats row
    let y = 100;
    const statW = (w - 48) / 3;
    const stats = [
      { label: t('workout.duration'), value: data.duration },
      { label: t('workout.totalSets'), value: String(data.totalSets) },
      { label: `${t('workout.totalVolume')} (${data.weightUnit})`, value: data.totalVolume },
    ];

    for (let i = 0; i < stats.length; i++) {
      const x = 24 + i * statW;
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.roundRect(x, y - 20, statW - 8, 56, 8);
      ctx.fill();

      ctx.fillStyle = '#fafafa';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(stats[i].value, x + 10, y + 6);

      ctx.fillStyle = '#71717a';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText(stats[i].label, x + 10, y + 26);
    }

    // PRs
    y += 70;
    if (data.prs.length > 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`🏆 ${t('workout.personalRecords')}`, 24, y);
      y += 6;

      for (const pr of data.prs) {
        y += lineHeight;
        ctx.fillStyle = '#fbbf24';
        ctx.font = '13px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${pr.exerciseName} — ${pr.type}: ${pr.value}`, 36, y);
      }
      y += 16;
    }

    // Exercises
    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText(t('plans.exercises').toUpperCase(), 24, y);
    y += 8;

    for (const ex of data.exercises) {
      y += lineHeight;
      ctx.fillStyle = '#fafafa';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText(ex.name, 24, y);

      ctx.fillStyle = '#71717a';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      const info = `${ex.sets}s • ${ex.volume} ${data.weightUnit}`;
      ctx.fillText(info, w - 24 - ctx.measureText(info).width, y);
    }

    return canvas;
  }, [data, t]);

  const handleShare = useCallback(async () => {
    try {
      const canvas = await generateCanvas();
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png')
      );

      if (navigator.share) {
        const file = new File([blob], 'workout-summary.png', { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: 'GymTracker Workout',
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workout-summary.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // user cancelled or error
    }
  }, [generateCanvas]);

  const handleDownload = useCallback(async () => {
    const canvas = await generateCanvas();
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workout-summary.png';
    a.click();
  }, [generateCanvas]);

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="flex-1" onClick={handleShare}>
        <Share2 className="h-4 w-4 mr-1.5" />
        {t('workout.shareWorkout')}
      </Button>
      <Button variant="outline" size="sm" onClick={handleDownload}>
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
