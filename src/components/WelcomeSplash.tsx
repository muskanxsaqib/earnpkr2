import { useEffect } from 'react';

interface WelcomeSplashProps {
  username?: string;
  onComplete?: () => void;
}

export function WelcomeSplash({ onComplete }: WelcomeSplashProps) {
  useEffect(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  return null;
}
