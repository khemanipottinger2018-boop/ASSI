'use client';
import LavalampBackground from '../../../../frontend/ui/LavalampBackground';
import FloatingShapes from '../../../../frontend/ui/FloatingShapes';

interface BackgroundEffectsProps {
  theme: string;
}

export const BackgroundEffects = ({ theme }: BackgroundEffectsProps) => {
  return (
    <>
      <LavalampBackground theme={theme} />
      <FloatingShapes theme={theme} />
    </>
  );
};
