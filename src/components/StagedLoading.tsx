'use client';

import { useEffect, useState } from 'react';

interface StagedLoadingProps {
  steps: string[];
  isComplete: boolean;
}

export default function StagedLoading({ steps, isComplete }: StagedLoadingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isComplete) {
      setCurrentStep(steps.length - 1);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 2 ? prev + 1 : prev));
    }, 2000);

    return () => clearInterval(interval);
  }, [isComplete, steps.length]);

  const progress = isComplete ? 100 : ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-text-dim text-[0.9rem] font-light">
          {steps[currentStep]}
        </span>
        {!isComplete && <span className="ai-cursor" />}
      </div>
      <div className="w-full h-[3px]" style={{ background: 'var(--border-subtle)' }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, background: 'var(--red)' }}
        />
      </div>
    </div>
  );
}
