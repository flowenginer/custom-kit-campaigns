import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SoundPreferences {
  enabled: boolean;
  new_card_sound: string;
  status_change_sound: string;
  new_approval_sound: string;
  volume: number;
}

const SOUND_FILES: Record<string, string> = {
  notification: "/sounds/notification.mp3",
  swoosh: "/sounds/swoosh.mp3",
  alert: "/sounds/alert.mp3",
  success: "/sounds/success.mp3",
  none: "",
};

export const useSoundNotifications = () => {
  const [preferences, setPreferences] = useState<SoundPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [audioContext, setAudioContext] = useState<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    loadPreferences();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel("sound_preferences_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_sound_preferences",
        },
        () => {
          loadPreferences();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Cleanup audio elements
      audioContext.forEach(audio => audio.pause());
    };
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_sound_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // Se não existe, criar com valores padrão
        if (error.code === "PGRST116") {
          const { data: newPrefs } = await supabase
            .from("user_sound_preferences")
            .insert([{ user_id: user.id }])
            .select()
            .single();
          
          if (newPrefs) {
            setPreferences(newPrefs);
          }
        }
      } else {
        setPreferences(data);
      }
    } catch (error) {
      console.error("Error loading sound preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const playSound = useCallback((soundType: 'new_card_sound' | 'status_change_sound' | 'new_approval_sound') => {
    if (!preferences?.enabled) return;
    
    const soundName = preferences[soundType];
    if (!soundName || soundName === "none") return;
    
    const soundFile = SOUND_FILES[soundName];
    if (!soundFile) return;

    try {
      let audio = audioContext.get(soundFile);
      
      if (!audio) {
        audio = new Audio(soundFile);
        setAudioContext(prev => new Map(prev).set(soundFile, audio!));
      }
      
      audio.volume = (preferences.volume || 70) / 100;
      audio.currentTime = 0;
      audio.play().catch(err => console.error("Error playing sound:", err));
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }, [preferences, audioContext]);

  const playNewCard = useCallback(() => {
    playSound("new_card_sound");
  }, [playSound]);

  const playStatusChange = useCallback(() => {
    playSound("status_change_sound");
  }, [playSound]);

  const playNewApproval = useCallback(() => {
    playSound("new_approval_sound");
  }, [playSound]);

  const updatePreferences = async (updates: Partial<SoundPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_sound_preferences")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating sound preferences:", error);
      throw error;
    }
  };

  return {
    preferences,
    isLoading,
    playNewCard,
    playStatusChange,
    playNewApproval,
    updatePreferences,
  };
};
