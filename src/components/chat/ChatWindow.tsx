import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./MessageBubble";
import { DateSeparator } from "./DateSeparator";
import { AudioRecorder } from "./AudioRecorder";
import { useChat } from "@/hooks/useChat";
import { toast } from "sonner";
import { Send, Paperclip, Loader2, X, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";

interface ChatWindowProps {
  conversationId: string;
  isGroup: boolean;
  otherUser?: {
    id: string;
    full_name: string;
  };
  groupName?: string;
  groupIcon?: string;
  onBack: () => void;
}

export const ChatWindow = ({
  conversationId,
  isGroup,
  otherUser,
  groupName,
  groupIcon,
  onBack,
}: ChatWindowProps) => {
  const { messages, loading, sendMessage, uploadFile, currentUserId } = useChat(conversationId);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [messageText]);

  const handleSendText = async () => {
    if (!messageText.trim() && !selectedFile) return;

    setSending(true);
    try {
      if (selectedFile) {
        const fileUrl = await uploadFile(selectedFile);
        const messageType = selectedFile.type.startsWith("image/") ? "image" : "file";
        
        await sendMessage(
          messageText.trim() || null,
          messageType,
          fileUrl,
          selectedFile.name,
          null
        );
        
        setSelectedFile(null);
      } else {
        await sendMessage(messageText.trim(), "text", null, null, null);
      }

      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleAudioRecorded = async (audioBlob: Blob, duration: number) => {
    setSending(true);
    try {
      const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, {
        type: "audio/webm",
      });

      const fileUrl = await uploadFile(audioFile);
      await sendMessage(null, "audio", fileUrl, audioFile.name, duration);

      toast.success("Áudio enviado!");
    } catch (error) {
      console.error("Error sending audio:", error);
      toast.error("Erro ao enviar áudio");
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (file.size > maxSize) {
        toast.error("Arquivo muito grande. Máximo: 10MB");
        return;
      }

      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Agrupar mensagens por data
  const messagesWithSeparators = () => {
    const result: { type: "date" | "message"; date?: string; message?: any }[] = [];
    let lastDate: string | null = null;

    for (const message of messages) {
      const messageDate = format(new Date(message.created_at), "yyyy-MM-dd");

      if (lastDate !== messageDate) {
        result.push({ type: "date", date: message.created_at });
        lastDate = messageDate;
      }

      result.push({ type: "message", message });
    }

    return result;
  };

  const displayName = isGroup ? groupName : otherUser?.full_name;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {isGroup ? (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
              {groupIcon || "👥"}
            </div>
          ) : (
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(displayName || "?")}
              </AvatarFallback>
            </Avatar>
          )}
          <div>
            <h3 className="font-semibold">{displayName}</h3>
            {isGroup ? (
              <span className="text-xs text-muted-foreground">Grupo</span>
            ) : (
              <Badge variant="secondary" className="text-xs">Online</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Nenhuma mensagem ainda. Envie a primeira!
          </div>
        ) : (
          <div className="space-y-2">
            {messagesWithSeparators().map((item, index) => {
              if (item.type === "date") {
                return <DateSeparator key={`date-${index}`} date={item.date!} />;
              }

              const message = item.message!;
              return (
                <MessageBubble
                  key={message.id}
                  content={message.content}
                  messageType={message.message_type}
                  fileUrl={message.file_url}
                  fileName={message.file_name}
                  audioDuration={message.audio_duration}
                  createdAt={message.created_at}
                  isOwnMessage={message.sender_id === currentUserId}
                  senderName={message.sender_name}
                  showSenderName={isGroup && message.sender_id !== currentUserId}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background/95 backdrop-blur">
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeSelectedFile}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="flex-shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Textarea
            ref={textareaRef}
            placeholder="Digite sua mensagem..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none py-2"
            rows={1}
          />
          <AudioRecorder onAudioRecorded={handleAudioRecorded} />
          <Button
            type="button"
            onClick={handleSendText}
            disabled={sending || (!messageText.trim() && !selectedFile)}
            size="icon"
            className="flex-shrink-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};