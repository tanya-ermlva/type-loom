interface ColorSwatchProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
}

export function ColorSwatch({ label, value, onChange }: ColorSwatchProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-700 min-w-12">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-10 rounded border border-gray-300 cursor-pointer"
      />
      <span className="text-gray-500 tabular-nums text-xs">{value}</span>
    </label>
  );
}
