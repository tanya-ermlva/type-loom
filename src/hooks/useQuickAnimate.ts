import { useStore } from '../state/store';
import type { TreatmentType } from '../core/treatments/types';

/**
 * Hook returning a `quickAnimate(paramKey, fromValue, toValue)` function.
 * Pass `treatmentType: undefined` for config animations (treatmentId === 'config').
 */
export function useQuickAnimate(treatmentId: string, treatmentType?: TreatmentType) {
  const animations = useStore((s) => s.animations);
  const addAnimation = useStore((s) => s.addAnimation);
  const removeAnimation = useStore((s) => s.removeAnimation);

  return (paramKey: string, fromValue: number, toValue: number) => {
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
