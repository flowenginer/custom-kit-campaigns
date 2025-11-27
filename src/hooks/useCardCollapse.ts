import { useState } from 'react';

export interface UseCardCollapseReturn {
  collapsedCards: Set<string>;
  toggleCard: (cardId: string) => void;
  collapseAll: (cardIds: string[]) => void;
  expandAll: (cardIds: string[]) => void;
  isCollapsed: (cardId: string) => boolean;
}

export const useCardCollapse = (): UseCardCollapseReturn => {
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());

  const toggleCard = (cardId: string) => {
    setCollapsedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const collapseAll = (cardIds: string[]) => {
    setCollapsedCards(new Set(cardIds));
  };

  const expandAll = (cardIds: string[]) => {
    setCollapsedCards(prev => {
      const newSet = new Set(prev);
      cardIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  };

  const isCollapsed = (cardId: string) => {
    return collapsedCards.has(cardId);
  };

  return {
    collapsedCards,
    toggleCard,
    collapseAll,
    expandAll,
    isCollapsed,
  };
};
