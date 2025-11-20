'use client';

import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
  disabled?: boolean;
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
];

export function ColorPicker({ value = '#3b82f6', onChange, label, disabled }: ColorPickerProps) {
  const [color, setColor] = useState(value);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setColor(value);
    validateColor(value);
  }, [value]);

  const validateColor = (colorValue: string) => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    const valid = hexRegex.test(colorValue);
    setIsValid(valid);
    return valid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor);

    if (validateColor(newColor)) {
      onChange(newColor);
    }
  };

  const handlePresetClick = (presetColor: string) => {
    setColor(presetColor);
    setIsValid(true);
    onChange(presetColor);
  };

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}

      <div className="flex gap-2 items-center">
        <div className="relative">
          <input
            type="color"
            value={color}
            onChange={(e) => {
              const newColor = e.target.value;
              setColor(newColor);
              setIsValid(true);
              onChange(newColor);
            }}
            disabled={disabled}
            className="w-12 h-10 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        <Input
          type="text"
          value={color}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder="#000000"
          className={`font-mono ${!isValid ? 'border-red-500' : ''}`}
          maxLength={7}
        />
      </div>

      {!isValid && (
        <p className="text-sm text-red-500">
          Невірний формат кольору. Використовуйте формат #RRGGBB
        </p>
      )}

      <div className="space-y-2">
        <Label className="text-xs text-gray-500">Швидкий вибір:</Label>
        <div className="grid grid-cols-8 gap-2">
          {PRESET_COLORS.map((presetColor) => (
            <button
              key={presetColor}
              type="button"
              onClick={() => handlePresetClick(presetColor)}
              disabled={disabled}
              className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 disabled:cursor-not-allowed ${
                color === presetColor ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900' : 'border-gray-300'
              }`}
              style={{ backgroundColor: presetColor }}
              title={presetColor}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
