import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./MessageBubble";
import { AudioRecorder } from "./AudioRecorder";
import { useChat } from "@/hooks/useChat";
import { toast } from "sonner";
import { Send, Paperclip, Loader2, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ChatWindowProps {
  conversationId: string;
  otherUser: {
    id: string;
    full_name: string;
  };
  onBack: () => void;
}

export const ChatWindow = ({ conversationId, otherUser, onBack }: ChatWindowProps) => {
  const { messages, loading, sendMessage, uploadFile, currentUserId } = useChat(conversationId);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendText = async () => {
    if (!messageText.trim() && !selectedFile) return;

    setSending(true);
    try {
      if (selectedFile) {
        // Upload do arquivo
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
      // Criar um arquivo a partir do blob
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(otherUser.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{otherUser.full_name}</h3>
            <Badge variant="secondary" className="text-xs">Online</Badge>
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
          <div className="space-y-4">
            {messages.map((message) => (
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
              />
            ))}
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
        <div className="flex items-center gap-2">
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
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            placeholder="Digite sua mensagem..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
            disabled={sending}
            className="flex-1"
          />
          <AudioRecorder onAudioRecorded={handleAudioRecorded} />
          <Button
            type="button"
            onClick={handleSendText}
            disabled={sending || (!messageText.trim() && !selectedFile)}
            size="icon"
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
