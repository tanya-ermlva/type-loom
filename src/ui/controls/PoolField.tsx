import { useState, useId } from 'react';

const PRESETS: Array<{ label: string; value: string }> = [
  { label: 'Uppercase A–Z', value: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { label: 'Lowercase a–z', value: 'abcdefghijklmnopqrstuvwxyz' },
  { label: 'Letters', value: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' },
  { label: 'Numbers', value: '0123456789' },
  { label: 'Symbols', value: '!@#$%^&*()_+-=[]{}<>?/.,;:' },
];

interface PoolFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
}

/**
 * Preset dropdown that seeds an editable text field. Editing the field
 * automatically switches the dropdown to "Custom".
 */
export function PoolField({ label, value, onChange }: PoolFieldProps) {
  const id = useId();

  const matchingPreset = PRESETS.find((p) => p.value === value)?.label ?? 'Custom';
  const [presetSelection, setPresetSelection] = useState(matchingPreset);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const choice = e.target.value;
    setPresetSelection(choice);
    if (choice === 'Custom') return;
    const preset = PRESETS.find((p) => p.label === choice);
    if (preset) onChange(preset.value);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPresetSelection('Custom');
    onChange(e.target.value);
  };

  return (
    <div className="block text-sm space-y-1">
      <label htmlFor={id} className="text-gray-700">{label}</label>
      <select
        value={presetSelection}
        onChange={handlePresetChange}
        className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-blue-400"
      >
        {PRESETS.map((p) => (
          <option key={p.label} value={p.label}>{p.label}</option>
        ))}
        <option value="Custom">Custom</option>
      </select>
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleTextChange}
        className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-blue-400"
        placeholder="characters to use"
      />
    </div>
  );
}
