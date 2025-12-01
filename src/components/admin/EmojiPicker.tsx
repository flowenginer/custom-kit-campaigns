import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

const EMOJI_CATEGORIES: Record<string, string[]> = {
  'Negócios': ['🏢', '🏬', '🏦', '🏪', '🏛️', '💼', '📊', '📈', '💰', '🏷️', '📦', '🛍️', '🛒', '🏗️', '🏭', '🧾', '💵', '💳', '🪙', '📋'],
  'Natureza/Agro': ['🌱', '🌿', '🌾', '🌻', '🌳', '🪴', '🌴', '🍀', '🌺', '🪻', '🌵', '🌲', '🍃', '🪹', '🐄', '🌸', '🌼', '🍂', '🍁', '🌷'],
  'Serviços': ['🔧', '🔨', '🪛', '⚙️', '🔩', '🧹', '🧺', '🪣', '🧴', '🧽', '🪥', '✂️', '🪡', '📐', '🔑', '🔒', '🧲', '🪝', '🧰', '🔌'],
  'Transporte': ['🚗', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚕', '🚛', '🏍️', '🚲', '✈️', '🚀', '⛵', '🚢', '🚁', '🛸', '🚂', '🚊', '🛴', '🛺'],
  'Alimentação': ['🍔', '🍕', '🍽️', '🍳', '🧁', '🍰', '☕', '🍺', '🍷', '🥤', '🍜', '🥗', '🌮', '🍱', '🥐', '🥖', '🧀', '🍗', '🥩', '🍦'],
  'Saúde/Bem-estar': ['🏥', '💊', '💉', '🩺', '🏋️', '🧘', '💪', '🦷', '👁️', '🩹', '♿', '🧬', '🩻', '🧪', '🌡️', '💆', '💅', '🧖', '🛁', '🚿'],
  'Esportes/Lazer': ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🏸', '🥊', '🎿', '🏄', '🏊', '🚴', '🎮', '🎳', '🥋', '⛳', '🎣', '🏆'],
  'Animais': ['🐕', '🐈', '🐎', '🐄', '🐖', '🐑', '🐔', '🐟', '🦜', '🐝', '🦋', '🐢', '🐰', '🦊', '🐻', '🦁', '🐘', '🦒', '🐧', '🦆'],
  'Tecnologia': ['💻', '📱', '🖥️', '⌨️', '🖨️', '📷', '📡', '🔌', '💡', '🔋', '📺', '🎬', '🎥', '📻', '🎙️', '🕹️', '💾', '📀', '🔦', '⏰'],
  'Arte/Educação': ['🎨', '🖌️', '✏️', '📚', '🎓', '📖', '🎭', '🎤', '🎵', '🎹', '🎪', '🎯', '✒️', '📝', '🖍️', '📏', '🔬', '🔭', '🎼', '🎻'],
  'Casa/Construção': ['🏠', '🏡', '🛋️', '🛏️', '🪟', '🚪', '🧱', '🪵', '🪜', '🔨', '🪚', '🔩', '🪤', '🧲', '🧯', '🪣', '🧹', '🛠️', '🏚️', '⚡'],
  'Moda/Beleza': ['👔', '👗', '👠', '👟', '👒', '🧢', '👜', '🎒', '👓', '🕶️', '💍', '💎', '👑', '🧣', '🧤', '🧥', '👙', '👘', '🩱', '🩴'],
  'Natureza/Clima': ['☀️', '🌙', '⭐', '🌟', '🔥', '💧', '❄️', '⚡', '🌊', '🌈', '☁️', '🌪️', '🌧️', '⛈️', '🌤️', '🌥️', '💨', '🌬️', '☔', '⛄'],
  'Diversos': ['🎁', '🎈', '🎉', '🏆', '🥇', '🎖️', '📌', '📍', '🔔', '❤️', '💚', '💙', '💜', '🧡', '💛', '🖤', '🤍', '♻️', '🔴', '🟢']
};

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export const EmojiPicker = ({ value, onChange }: EmojiPickerProps) => {
  const [openCategories, setOpenCategories] = useState<string[]>(['Negócios']);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <ScrollArea className="h-64 rounded-md border p-2">
      <div className="space-y-1">
        {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
          <Collapsible
            key={category}
            open={openCategories.includes(category)}
            onOpenChange={() => toggleCategory(category)}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent transition-colors">
              <span>{category}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${openCategories.includes(category) ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-1 p-2 bg-muted/30 rounded-md mt-1">
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    className={`text-xl p-1.5 rounded-md transition-colors ${
                      value === emoji 
                        ? 'bg-primary/20 ring-2 ring-primary' 
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => onChange(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </ScrollArea>
  );
};
