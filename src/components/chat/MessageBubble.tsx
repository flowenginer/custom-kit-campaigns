import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FileText, Download, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, useMemo } from "react";

interface MessageBubbleProps {
  content: string | null;
  messageType: string;
  fileUrl: string | null;
  fileName: string | null;
  audioDuration: number | null;
  createdAt: string;
  isOwnMessage: boolean;
  senderName: string;
  showSenderName?: boolean;
  highlightText?: string;
  isHighlighted?: boolean;
}

export const MessageBubble = ({
  content,
  messageType,
  fileUrl,
  fileName,
  audioDuration,
  createdAt,
  isOwnMessage,
  senderName,
  showSenderName = false,
  highlightText = "",
  isHighlighted = false,
}: MessageBubbleProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [messageType, fileUrl]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Highlight text in content
  const getHighlightedContent = useMemo(() => {
    if (!content || !highlightText.trim()) {
      return content;
    }

    try {
      const escapedQuery = highlightText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escapedQuery})`, "gi");
      const parts = content.split(regex);

      return parts.map((part, index) => {
        if (part.toLowerCase() === highlightText.toLowerCase()) {
          return (
            <mark
              key={index}
              className={cn(
                "bg-yellow-300 dark:bg-yellow-600 text-inherit rounded-sm px-0.5",
                isOwnMessage && "bg-yellow-200 dark:bg-yellow-500"
              )}
            >
              {part}
            </mark>
          );
        }
        return part;
      });
    } catch {
      return content;
    }
  }, [content, highlightText, isOwnMessage]);

  const renderContent = () => {
    if (messageType === "text") {
      return (
        <p className="text-sm whitespace-pre-wrap break-words">
          {getHighlightedContent}
        </p>
      );
    }

    if (messageType === "audio" && fileUrl) {
      return (
        <div className="flex items-center gap-2 min-w-[200px]">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={togglePlayPause}
            className="h-8 w-8 flex-shrink-0"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <audio ref={audioRef} src={fileUrl} preload="metadata" />
          <div className="flex-1">
            <div className="h-1 bg-primary/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: audioDuration
                    ? `${(currentTime / audioDuration) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(audioDuration || 0)}
          </span>
        </div>
      );
    }

    if (messageType === "file" && fileUrl && fileName) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(fileUrl, "_blank")}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          <span className="text-sm truncate max-w-[200px]">{fileName}</span>
          <Download className="h-3 w-3 ml-auto" />
        </Button>
      );
    }

    if (messageType === "image" && fileUrl) {
      return (
        <img
          src={fileUrl}
          alt="Imagem"
          className="max-w-[300px] rounded cursor-pointer"
          onClick={() => window.open(fileUrl, "_blank")}
        />
      );
    }

    return null;
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1 max-w-[70%] transition-all duration-300",
        isOwnMessage ? "items-end ml-auto" : "items-start mr-auto",
        isHighlighted && "scale-[1.02]"
      )}
    >
      {showSenderName && (
        <span className="text-xs font-medium text-primary px-2">{senderName}</span>
      )}
      <div
        className={cn(
          "rounded-lg px-3 py-2 transition-all duration-300",
          isOwnMessage
            ? "bg-primary text-primary-foreground"
            : "bg-muted",
          isHighlighted && "ring-2 ring-yellow-400 ring-offset-2 ring-offset-background"
        )}
      >
        {renderContent()}
      </div>
      <span className="text-xs text-muted-foreground px-2">
        {format(new Date(createdAt), "HH:mm", { locale: ptBR })}
      </span>
    </div>
  );
};
