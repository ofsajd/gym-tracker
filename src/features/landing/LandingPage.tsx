import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, TrendingUp, ClipboardList, QrCode, BarChart3, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: ClipboardList, labelKey: 'landing.feature1' },
  { icon: TrendingUp, labelKey: 'landing.feature2' },
  { icon: BarChart3, labelKey: 'landing.feature3' },
  { icon: QrCode, labelKey: 'landing.feature4' },
];

export function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Dumbbell className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">{t('app.name')}</h1>
        <p className="text-muted-foreground max-w-xs mb-8">{t('landing.subtitle')}</p>

        <Button
          size="lg"
          className="h-14 px-8 text-base"
          onClick={() => navigate('/app')}
        >
          {t('landing.start')}
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>

      {/* Feature grid */}
      <div className="px-6 pb-12 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-card p-4 border"
            >
              <f.icon className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium">{t(f.labelKey)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
