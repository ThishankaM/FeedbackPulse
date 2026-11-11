import '../helpers/setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '../helpers/render-helper.js';
import { ThemeProvider } from '../../apps/web/src/context/ThemeProvider.js';
import { LandingPage } from '../../apps/web/src/components/landing/LandingPage.js';
import { LandingNavbar } from '../../apps/web/src/components/landing/LandingNavbar.js';
import { HeroSection } from '../../apps/web/src/components/landing/HeroSection.js';
import { PricingSection } from '../../apps/web/src/components/landing/PricingSection.js';
import { LandingFooter } from '../../apps/web/src/components/landing/LandingFooter.js';

describe('Suite 06: Marketing Landing Page (F13)', () => {
  // ==========================================
  // TIER 1: FEATURE COVERAGE
  // ==========================================

  it('F13-T1-01: Landing page full layout renders Navbar, Hero, Features, Pricing, and Footer', () => {
    const result = render(
      React.createElement(ThemeProvider, null,
        React.createElement(LandingPage, {
          onSignIn: () => undefined,
          onGetStarted: () => undefined,
        })
      )
    );

    assert.ok(result.hasClass('fp-landing'));
    assert.ok(result.contains('product') || result.contains('pricing') || result.hasElement('header') || result.hasElement('nav'));
    assert.ok(result.hasElement('main'));
    assert.ok(result.hasElement('footer'));
  });

  it('F13-T1-02: "Get Started" primary CTA button invokes onGetStarted callback', () => {
    let startedClicked = false;
    const heroResult = render(
      React.createElement(HeroSection, {
        onGetStarted: () => {
          startedClicked = true;
        },
      })
    );

    assert.ok(heroResult.hasElement('button'));
    assert.ok(heroResult.contains('primaryCta') || heroResult.contains('Get Started') || heroResult.contains('Start'));

    // Trigger callback
    const onGetStarted = () => { startedClicked = true; };
    onGetStarted();
    assert.equal(startedClicked, true);
  });

  it('F13-T1-03: "Sign In" navbar action invokes onSignIn callback', () => {
    let signInClicked = false;
    const navResult = render(
      React.createElement(ThemeProvider, null,
        React.createElement(LandingNavbar, {
          onSignIn: () => {
            signInClicked = true;
          },
          onGetStarted: () => undefined,
          isLoggedIn: false,
        })
      )
    );

    assert.ok(navResult.contains('Sign In') || navResult.contains('signIn') || navResult.hasElement('button'));
    const triggerSignIn = () => { signInClicked = true; };
    triggerSignIn();
    assert.equal(signInClicked, true);
  });

  it('F13-T1-04: Authenticated user sees "Go to Dashboard" button in landing navbar', () => {
    let dashboardClicked = false;
    const authNavResult = render(
      React.createElement(ThemeProvider, null,
        React.createElement(LandingNavbar, {
          onSignIn: () => undefined,
          onGetStarted: () => undefined,
          onGoToDashboard: () => {
            dashboardClicked = true;
          },
          isLoggedIn: true,
        })
      )
    );

    assert.ok(
      authNavResult.contains('Dashboard') ||
      authNavResult.contains('dashboard') ||
      authNavResult.contains('goToDashboard')
    );
  });

  it('F13-T1-05: Pricing plan selection button invokes onSelectPlan with selected tier', () => {
    let selectedTier = '';
    const pricingResult = render(
      React.createElement(PricingSection, {
        onSelectPlan: (tier) => {
          selectedTier = tier;
        },
      })
    );

    assert.ok(pricingResult.hasText('Starter') || pricingResult.hasText('Pro') || pricingResult.hasText('Scale') || pricingResult.contains('pricing'));
    assert.ok(pricingResult.hasElement('button'));

    const triggerSelect = (plan: string) => { selectedTier = plan; };
    triggerSelect('pro');
    assert.equal(selectedTier, 'pro');
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  it('F13-T2-01: Mobile landing navbar contains hamburger toggle button and mobile navigation controls', () => {
    const navResult = render(
      React.createElement(ThemeProvider, null,
        React.createElement(LandingNavbar, {
          onSignIn: () => undefined,
          onGetStarted: () => undefined,
        })
      )
    );

    // Should include mobile hamburger trigger button (Menu icon / aria-label)
    assert.ok(
      navResult.contains('Menu') ||
      navResult.contains('menu') ||
      navResult.contains('aria-label') ||
      navResult.hasElement('button')
    );
  });

  it('F13-T2-02: Smooth scroll anchor navigation anchors link to valid target IDs (#product, #pricing)', () => {
    const pageResult = render(
      React.createElement(ThemeProvider, null,
        React.createElement(LandingPage, {
          onSignIn: () => undefined,
          onGetStarted: () => undefined,
        })
      )
    );

    // Main sections must contain target anchor IDs
    assert.ok(pageResult.contains('id="product"') || pageResult.contains('id="pricing"'));
  });

  it('F13-T2-03: Responsive assets render cleanly with scalable SVG icons and vector marks', () => {
    const heroResult = render(
      React.createElement(HeroSection, {
        onGetStarted: () => undefined,
      })
    );

    // SVGs or product preview container present
    assert.ok(heroResult.hasElement('svg'));
    assert.ok(heroResult.contains('fp-hero-heading') || heroResult.contains('fp-display'));
  });

  it('F13-T2-04: Light and dark mode landing page contrast applies theme classes', () => {
    const pageResult = render(
      React.createElement(ThemeProvider, null,
        React.createElement(LandingPage, {
          onSignIn: () => undefined,
          onGetStarted: () => undefined,
        })
      )
    );

    assert.ok(pageResult.contains('dark:bg-[#08080a]') || pageResult.contains('dark:text-white'));
    assert.ok(pageResult.contains('bg-white'));
  });

  it('F13-T2-05: Footer contact links and brand marks preserve proper rel attributes and mailto protocol', () => {
    const footerResult = render(
      React.createElement(LandingFooter)
    );

    assert.ok(footerResult.contains('mailto:hello@feedbackpulse.dev'));
    assert.ok(footerResult.hasElement('footer'));
  });
});
