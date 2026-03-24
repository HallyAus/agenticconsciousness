'use client';

interface ToggleGroupProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function ToggleGroup({ options, value, onChange }: ToggleGroupProps) {
  return (
    <div className="flex">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`font-display text-[0.65rem] font-bold tracking-[1px] uppercase py-2 px-4 transition-all duration-200 cursor-pointer border border-border-subtle ${
            value === option
              ? 'bg-ac-red text-white border-ac-red'
              : 'bg-transparent text-text-dim hover:text-text-primary'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
