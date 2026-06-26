import { Button } from '@/components/ui/button';
import { BookOpen, MessageCircle, CalendarCheck } from 'lucide-react';
import { translations } from '@/lib/translations';
import { useAuth } from '@/contexts/auth-context';

interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

const FEATURES = [
  { key: 'landingFeatureReading', descKey: 'landingFeatureReadingDesc', icon: BookOpen },
  { key: 'landingFeatureChat', descKey: 'landingFeatureChatDesc', icon: MessageCircle },
  { key: 'landingFeatureRosters', descKey: 'landingFeatureRostersDesc', icon: CalendarCheck },
] as const;

export default function LandingPage({ onSignIn, onSignUp }: LandingPageProps) {
  const { currentUser } = useAuth();
  const t = translations[(currentUser?.preferredLanguage || 'en') as 'en' | 'ko'];

  return (
    <main className="w-full">
      <section className="flex min-h-[65vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-md stack-gap-sm">
          <h1 className="text-hero text-foreground">
            em. <span className="text-primary italic">portal</span>
          </h1>
          <p className="text-body-hero">{t.landingSubtitle}</p>
          <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
            <Button size="lg" className="h-11 rounded-lg px-8" onClick={onSignIn}>
              {t.signIn}
            </Button>
            <Button size="lg" variant="outline" className="h-11 rounded-lg px-8" onClick={onSignUp}>
              {t.getStarted}
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border/50 px-4 py-12">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-8 md:grid-cols-3">
          {FEATURES.map(({ key, descKey, icon: Icon }) => (
            <div key={key} className="stack-gap-sm">
              <Icon className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="text-section-title">{t[key]}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{t[descKey]}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
