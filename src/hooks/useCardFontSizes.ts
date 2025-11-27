import { useState } from 'react';

export interface CardFontSizes {
  badge: number;
  customerName: number;
  segment: number;
  quantity: number;
  designer: number;
  priority: number;
  model: number;
  salesperson: number;
  version: number;
  timer: number;
}

const defaultSizes: CardFontSizes = {
  badge: 12,
  customerName: 14,
  segment: 12,
  quantity: 12,
  designer: 12,
  priority: 12,
  model: 10,
  salesperson: 12,
  version: 12,
  timer: 12,
};

export function useCardFontSizes() {
  const [sizes, setSizes] = useState<CardFontSizes>(() => {
    const saved = localStorage.getItem('cardFontSizes');
    return saved ? JSON.parse(saved) : defaultSizes;
  });

  const updateSize = (key: keyof CardFontSizes, value: number) => {
    const newSizes = { ...sizes, [key]: value };
    setSizes(newSizes);
    localStorage.setItem('cardFontSizes', JSON.stringify(newSizes));
  };

  const resetToDefaults = () => {
    setSizes(defaultSizes);
    localStorage.setItem('cardFontSizes', JSON.stringify(defaultSizes));
  };

  return { sizes, updateSize, resetToDefaults, defaultSizes };
}
