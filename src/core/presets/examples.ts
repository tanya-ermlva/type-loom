import type { ProjectSnapshot } from '../persistence/serialize';
import { DEFAULT_BASE_CONFIG } from '../types';

export interface Example {
  id: string;
  name: string;
  description: string;
  snapshot: ProjectSnapshot;
}

// Each example is a literal ProjectSnapshot. Treatment `id`s inside the
// snapshot must be unique within the snapshot but can repeat across
// examples — each load creates a new project that doesn't compete with
// the user's saved ones.

export const EXAMPLES: Example[] = [
  {
    id: 'cavalry',
    name: 'Cavalry',
    description: 'Tight-middle spacing rhythm + lens mask on a warm cream/forest palette.',
    snapshot: {
      schemaVersion: 1,
      config: {
        ...DEFAULT_BASE_CONFIG,
        canvas: { width: 1080, height: 1080 },
        charSize: 52,
        rowSpacing: 62,
        charSpacing: 28,
        columnSpacing: 40,
        input: 'CAVALRY',
        fgColor: '#0f5132',
        bgColor: '#f0ead6',
      },
      treatments: [
        {
          id: 'cav-1',
          type: 'silhouette',
          enabled: true,
          params: { shape: 'lens', size: 0.85, softness: 0.1, invert: false, blendMode: 'intersect' },
          mask: null,
        },
        {
          id: 'cav-2',
          type: 'spacing',
          enabled: true,
          params: { pattern: 'tight-middle', amplitude: 0.6, frequency: 1, scroll: 0 },
          mask: null,
        },
      ],
      animations: [],
      loopDuration: 4,
      showMaskOverlays: true,
    },
  },
  {
    id: 'together',
    name: 'Together',
    description: 'Sine spacing with scroll animation and diagonal stagger.',
    snapshot: {
      schemaVersion: 1,
      config: {
        ...DEFAULT_BASE_CONFIG,
        canvas: { width: 1080, height: 1080 },
        charSize: 44,
        rowSpacing: 54,
        charSpacing: 26,
        columnSpacing: 34,
        input: 'TOGETHER',
        fgColor: '#1a1a4d',
        bgColor: '#dde9d4',
      },
      treatments: [
        {
          id: 'tog-1',
          type: 'spacing',
          enabled: true,
          params: { pattern: 'sine', amplitude: 0.5, frequency: 1.5, scroll: 0 },
          mask: null,
        },
      ],
      animations: [
        {
          id: 'tog-a1',
          treatmentId: 'tog-1',
          treatmentType: 'spacing',
          paramKey: 'scroll',
          from: 0,
          to: 1,
          curve: 'sawtooth',
          duration: 6,
          delay: 0,
          staggerAmount: 2,
          staggerAxis: 'diagonal',
        },
      ],
      loopDuration: 6,
      showMaskOverlays: true,
    },
  },
  {
    id: 'tapestry',
    name: 'Tapestry',
    description: 'Hourglass silhouette on repeated OK tiles; a nod to the kielm _v.Tapestry.',
    snapshot: {
      schemaVersion: 1,
      config: {
        ...DEFAULT_BASE_CONFIG,
        canvas: { width: 1080, height: 1350 },
        charSize: 38,
        rowSpacing: 46,
        charSpacing: 24,
        columnSpacing: 30,
        input: 'OK',
        fgColor: '#000000',
        bgColor: '#f5f5dc',
      },
      treatments: [
        {
          id: 'tap-1',
          type: 'silhouette',
          enabled: true,
          params: { shape: 'hourglass', size: 0.55, softness: 0.08, invert: false, blendMode: 'intersect' },
          mask: null,
        },
      ],
      animations: [],
      loopDuration: 4,
      showMaskOverlays: true,
    },
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Drift + linear-x scale for a perspective-like sweep.',
    snapshot: {
      schemaVersion: 1,
      config: {
        ...DEFAULT_BASE_CONFIG,
        canvas: { width: 1920, height: 1080 },
        charSize: 44,
        rowSpacing: 58,
        charSpacing: 28,
        columnSpacing: 22,
        input: 'GROWTH',
        fgColor: '#3E49B8',
        bgColor: '#fef3c7',
      },
      treatments: [
        {
          id: 'grw-1',
          type: 'scale',
          enabled: true,
          params: { pattern: 'linear-x', min: 0.4, max: 1.6 },
          mask: null,
        },
        {
          id: 'grw-2',
          type: 'drift',
          enabled: true,
          params: { axis: 'both', amplitude: 22, frequency: 0.45, scope: 'character', phase: 0, waveform: 'sine' },
          mask: null,
        },
      ],
      animations: [],
      loopDuration: 4,
      showMaskOverlays: true,
    },
  },
  {
    id: 'matrix',
    name: 'Matrix rain',
    description: 'Settle-mode char scramble with y-axis stagger on a dark palette.',
    snapshot: {
      schemaVersion: 1,
      config: {
        ...DEFAULT_BASE_CONFIG,
        canvas: { width: 1080, height: 1920 },
        charSize: 36,
        rowSpacing: 44,
        charSpacing: 22,
        columnSpacing: 18,
        input: 'WAKE UP',
        fgColor: '#D1E043',
        bgColor: '#434625',
      },
      treatments: [
        {
          id: 'mtx-1',
          type: 'charScramble',
          enabled: true,
          params: {
            pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            mode: 'settle',
            settleStart: 0,
            flipsPerSecond: 18,
            staggerAmount: 2.5,
            staggerAxis: 'y',
          },
          mask: null,
        },
      ],
      animations: [],
      loopDuration: 6,
      showMaskOverlays: true,
    },
  },
  {
    id: 'noise',
    name: 'Color noise',
    description: 'Char swap (random) + two tints layered with multiply.',
    snapshot: {
      schemaVersion: 1,
      config: {
        ...DEFAULT_BASE_CONFIG,
        canvas: { width: 1080, height: 1080 },
        charSize: 42,
        rowSpacing: 50,
        charSpacing: 26,
        columnSpacing: 18,
        input: 'FOCUS',
        fgColor: '#ffffff',
        bgColor: '#564391',
      },
      treatments: [
        {
          id: 'nse-1',
          type: 'charSwap',
          enabled: true,
          params: { pool: '*+#$%@&', mode: 'random', seed: 12, poolIndex: 0 },
          mask: null,
        },
        {
          id: 'nse-2',
          type: 'tint',
          enabled: true,
          params: {
            mode: 'color', pattern: 'radial', blendMode: 'multiply',
            minOpacity: 1, maxOpacity: 1,
            colorA: '#FF91E0', colorB: '#FFDEF6',
          },
          mask: null,
        },
      ],
      animations: [],
      loopDuration: 4,
      showMaskOverlays: true,
    },
  },
];
