import { LandingNavbar } from './LandingNavbar';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { HowItWorksSection } from './HowItWorksSection';
import { PricingSection } from './PricingSection';
import { TestimonialsSection } from './TestimonialsSection';
import { CtaSection } from './CtaSection';
import { LandingFooter } from './LandingFooter';
import './landing.css';

export interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  onGoToDashboard?: () => void;
  isLoggedIn?: boolean;
}

export function LandingPage({
  onSignIn,
  onGetStarted,
  onGoToDashboard,
  isLoggedIn,
}: LandingPageProps) {
  return (
    <div className="fp-landing min-h-screen bg-white text-[#161618] transition-colors duration-200 dark:bg-[#08080a] dark:text-white">
      {/* 1. Header */}
      <LandingNavbar
        onSignIn={onSignIn}
        onGetStarted={onGetStarted}
        onGoToDashboard={onGoToDashboard}
        isLoggedIn={isLoggedIn}
      />

      {/* 2. Main Content */}
      <main className="flex-1">
        <HeroSection onGetStarted={onGetStarted} />
        <FeaturesSection onGetStarted={onGetStarted} />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingSection onSelectPlan={() => onGetStarted()} />
        <CtaSection onGetStarted={onGetStarted} />
      </main>

      {/* 3. Footer */}
      <LandingFooter />
    </div>
  );
}
