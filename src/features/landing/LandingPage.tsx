import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  TrendingUp,
  ClipboardList,
  QrCode,
  BarChart3,
  ArrowRight,
  Timer,
  Trophy,
  Share2,
  Flame,
  Zap,
  Link2,
  Ruler,
  Brain,
  Smartphone,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const heroFeatures = [
  { icon: ClipboardList, labelKey: 'landing.feature1', descKey: 'landing.feature1Desc' },
  { icon: TrendingUp, labelKey: 'landing.feature2', descKey: 'landing.feature2Desc' },
  { icon: BarChart3, labelKey: 'landing.feature3', descKey: 'landing.feature3Desc' },
  { icon: QrCode, labelKey: 'landing.feature4', descKey: 'landing.feature4Desc' },
];

const moreFeatures = [
  { icon: Link2, labelKey: 'landing.feature5', descKey: 'landing.feature5Desc' },
  { icon: Timer, labelKey: 'landing.feature6', descKey: 'landing.feature6Desc' },
  { icon: Zap, labelKey: 'landing.feature7', descKey: 'landing.feature7Desc' },
  { icon: Flame, labelKey: 'landing.feature8', descKey: 'landing.feature8Desc' },
  { icon: Trophy, labelKey: 'landing.feature9', descKey: 'landing.feature9Desc' },
  { icon: Share2, labelKey: 'landing.feature10', descKey: 'landing.feature10Desc' },
  { icon: Ruler, labelKey: 'landing.feature11', descKey: 'landing.feature11Desc' },
  { icon: Brain, labelKey: 'landing.feature12', descKey: 'landing.feature12Desc' },
];

export function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background flex flex-col overflow-x-hidden">
      {/* Hero section */}
      <div className="relative flex flex-col items-center justify-center px-6 pt-16 pb-12 text-center">
        {/* Gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative">
          <div className="h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 mx-auto ring-1 ring-primary/20">
            <Dumbbell className="h-12 w-12 text-primary" />
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight mb-3">{t('app.name')}</h1>
          <p className="text-muted-foreground max-w-sm mb-8 text-base leading-relaxed">
            {t('landing.subtitle')}
          </p>

          <Button
            size="lg"
            className="h-14 px-10 text-base font-semibold shadow-lg shadow-primary/20"
            onClick={() => navigate('/app')}
          >
            {t('landing.start')}
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Core features — 2×2 card grid */}
      <div className="px-6 pb-8 max-w-lg mx-auto w-full">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
          {t('landing.coreFeatures')}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {heroFeatures.map((f, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-2xl bg-card p-4 border shadow-sm"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-semibold leading-tight">{t(f.labelKey)}</span>
              <span className="text-xs text-muted-foreground leading-snug">{t(f.descKey)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Highlight stats */}
      <div className="px-6 pb-8 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-2xl font-bold text-primary">100%</p>
            <p className="text-xs text-muted-foreground mt-1">{t('landing.statFree')}</p>
          </div>
          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-2xl font-bold text-primary">
              <WifiOff className="h-6 w-6 mx-auto" />
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t('landing.statOffline')}</p>
          </div>
          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-2xl font-bold text-primary">
              <Smartphone className="h-6 w-6 mx-auto" />
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t('landing.statPWA')}</p>
          </div>
        </div>
      </div>

      {/* More features — compact list */}
      <div className="px-6 pb-8 max-w-lg mx-auto w-full">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
          {t('landing.moreFeatures')}
        </h2>
        <div className="space-y-2">
          {moreFeatures.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl bg-card/60 border p-3.5"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{t(f.labelKey)}</p>
                <p className="text-xs text-muted-foreground leading-snug">{t(f.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-16 max-w-lg mx-auto w-full text-center">
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-6">
          <Dumbbell className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-1">{t('landing.ctaTitle')}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t('landing.ctaDesc')}</p>
          <Button
            size="lg"
            className="h-12 px-8 text-base font-semibold"
            onClick={() => navigate('/app')}
          >
            {t('landing.start')}
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
