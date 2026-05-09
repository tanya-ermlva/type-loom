import { useStore } from './store';

export default function App() {
  const composition = useStore((s) => s.composition);
  return (
    <div style={{ padding: 32, fontFamily: composition.fontFamily, fontSize: 24 }}>
      Lines: {composition.lines.length}, fontSize: {composition.fontSize}
    </div>
  );
}
