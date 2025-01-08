'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/Button';
import { UI_CONSTANTS } from '@/lib/constants';

// Feature card component for reusability
const FeatureCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  className?: string;
}> = ({ icon, title, description, className = '' }) => (
  <div className={`p-6 rounded-lg bg-card shadow-sm transition-all hover:shadow-md ${className}`}>
    <div className="w-12 h-12 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
      <Image src={`/icons/${icon}.svg`} alt="" width={24} height={24} className="text-primary" />
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

export default function HomePage() {
  const { theme, setTheme } = useTheme();

  // Features data for the grid section
  const features = [
    {
      icon: 'calculator',
      title: 'Roth Conversion Optimizer',
      description: 'Maximize long-term wealth with AI-powered Roth conversion strategies during low-income years.',
    },
    {
      icon: 'chart',
      title: 'Capital Gains Harvesting',
      description: 'Strategic realization of capital gains when your tax bracket provides optimal opportunities.',
    },
    {
      icon: 'brain',
      title: 'AI-Powered Analysis',
      description: 'Get personalized explanations and insights powered by advanced AI technology.',
    },
  ];

  // Target audience benefits
  const audienceBenefits = [
    {
      title: 'Graduate Students',
      description: 'Optimize your tax strategy during your academic years.',
    },
    {
      title: 'Career Break Professionals',
      description: 'Make the most of temporary income reductions.',
    },
    {
      title: 'Individual Investors',
      description: 'Maximize tax advantages during lower income periods.',
    },
  ];

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Optimize Your
              <span className="text-primary"> Low Income Year</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Make informed tax decisions with AI-powered recommendations for Roth conversions
              and capital gains optimization.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/signup">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/learn-more">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Comprehensive Tax Optimization
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                {...feature}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Who Can Benefit?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {audienceBenefits.map((benefit, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-lg bg-card shadow-sm"
              >
                <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Start Optimizing Your Tax Strategy Today
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users making informed tax decisions with our AI-powered platform.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90"
            asChild
          >
            <Link href="/signup">Create Free Account</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}