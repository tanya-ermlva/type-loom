import { useStore } from '../state/store';
import type { TreatmentType } from '../core/treatments/types';

/**
 * Hook that returns a `quickAnimate(paramKey, fromValue, toValue)` function
 * for a given treatment. Calling it adds (or replaces) an animation on
 * that param: a 4-second sine cycle between fromValue and toValue, no
 * stagger. Powers the ✨ button on slider rows.
 */
export function useQuickAnimate(treatmentId: string, treatmentType: TreatmentType) {
  const animations = useStore((s) => s.animations);
  const addAnimation = useStore((s) => s.addAnimation);
  const removeAnimation = useStore((s) => s.removeAnimation);

  return (paramKey: string, fromValue: number, toValue: number) => {
    // Replace any existing animation on this exact param.
    animations
      .filter((a) => a.treatmentId === treatmentId && a.paramKey === paramKey)
      .forEach((a) => removeAnimation(a.id));

    addAnimation({
      id: crypto.randomUUID(),
      treatmentId,
      treatmentType,
      paramKey,
      from: fromValue,
      to: toValue,
      curve: 'sine',
      duration: 4,
      delay: 0,
      staggerAmount: 0,
      staggerAxis: 'x',
    });
  };
}
