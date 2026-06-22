// ============================================================
// hud/OnboardingOverlay.tsx — 首次游玩引导（T0039）
// ============================================================

import { useState } from 'react';
import { ONBOARDING_TEXTS } from '../../data/texts';
import './OnboardingOverlay.css';

interface OnboardingOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingOverlay({ open, onClose }: OnboardingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);

  if (!open) return null;

  const steps = ONBOARDING_TEXTS.steps;
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const close = () => {
    localStorage.setItem(ONBOARDING_TEXTS.storageKey, 'true');
    setStepIndex(0);
    onClose();
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <div>
            <div id="onboarding-title" className="onboarding-title">{ONBOARDING_TEXTS.title}</div>
            <div className="onboarding-subtitle">{ONBOARDING_TEXTS.subtitle}</div>
          </div>
          <button className="onboarding-skip" onClick={close}>
            {ONBOARDING_TEXTS.skip}
          </button>
        </div>

        <div className="onboarding-step">
          <div className="onboarding-step-icon">{step.icon}</div>
          <div className="onboarding-step-content">
            <div className="onboarding-step-target">{step.target}</div>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </div>
        </div>

        <div className="onboarding-dots">
          {steps.map((item, index) => (
            <button
              key={item.title}
              className={`onboarding-dot ${index === stepIndex ? 'onboarding-dot-active' : ''}`}
              onClick={() => setStepIndex(index)}
              aria-label={ONBOARDING_TEXTS.progress(index + 1, steps.length)}
            />
          ))}
        </div>

        <div className="onboarding-footer">
          <span>{ONBOARDING_TEXTS.progress(stepIndex + 1, steps.length)}</span>
          <div className="onboarding-actions">
            <button className="btn btn-secondary" onClick={() => setStepIndex(stepIndex - 1)} disabled={isFirst}>
              {ONBOARDING_TEXTS.previous}
            </button>
            <button className="btn btn-primary" onClick={isLast ? close : () => setStepIndex(stepIndex + 1)}>
              {isLast ? ONBOARDING_TEXTS.finish : ONBOARDING_TEXTS.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
