'use client';

import React, { useState } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';

interface IconSelectorProps {
  value?: string;
  onChange: (icon: string) => void;
  label?: string;
  disabled?: boolean;
}

const PRESET_ICONS = [
  '📰', '📝', '📢', '🔔', '📅', '🎯', '⚡', '🔥',
  '💡', '🚀', '🎨', '🎭', '🎪', '🎬', '🎮', '🎲',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸',
  '💼', '💰', '📊', '📈', '📉', '💻', '📱', '⌚',
  '🔧', '🔨', '⚙️', '🔩', '⚡', '💊', '🏥', '⚕️',
  '🌍', '🌎', '🌏', '🗺️', '🏛️', '🏗️', '🏭', '🏢',
];

export function IconSelector({ value = '', onChange, label, disabled }: IconSelectorProps) {
  const [customIcon, setCustomIcon] = useState(value);

  const handlePresetClick = (icon: string) => {
    setCustomIcon(icon);
    onChange(icon);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIcon = e.target.value;
    setCustomIcon(newIcon);
    onChange(newIcon);
  };

  const handleClear = () => {
    setCustomIcon('');
    onChange('');
  };

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}

      <div className="flex gap-2">
        <Input
          type="text"
          value={customIcon}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder="Оберіть або введіть emoji/іконку"
          className="text-2xl"
          maxLength={50}
        />
        {customIcon && (
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={disabled}
          >
            Очистити
          </Button>
        )}
      </div>

      {customIcon && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
          <span className="text-3xl">{customIcon}</span>
          <span className="text-sm text-gray-600">Поточна іконка</span>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs text-gray-500">Швидкий вибір:</Label>
        <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded border">
          {PRESET_ICONS.map((icon, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handlePresetClick(icon)}
              disabled={disabled}
              className={`text-2xl w-10 h-10 rounded border transition-all hover:scale-110 hover:bg-white disabled:cursor-not-allowed ${
                customIcon === icon ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500' : 'border-gray-300 bg-white'
              }`}
              title={icon}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Підказка: Ви можете використовувати будь-який emoji або текстову іконку (до 50 символів)
      </p>
    </div>
  );
}
