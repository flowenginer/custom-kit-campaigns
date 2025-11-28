import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { NewConversationDialog } from "./NewConversationDialog";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { cn } from "@/lib/utils";

interface SelectedConversation {
  id: string;
  other_user: {
    id: string;
    full_name: string;
  };
}

export const ChatPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const { unreadCount } = useUnreadMessages();

  const handleSelectConversation = (conversation: any) => {
    setSelectedConversation({
      id: conversation.id,
      other_user: conversation.other_user,
    });
    setIsMinimized(false);
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  const handleConversationCreated = (conversationId: string) => {
    // Recarregar lista de conversas e selecionar a nova
    setShowNewConversation(false);
    // A lista será atualizada via realtime
  };

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-destructive text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      )}

      {/* Painel do chat */}
      {isOpen && (
        <Card
          className={cn(
            "fixed bottom-6 right-6 shadow-2xl z-50 transition-all",
            isMinimized ? "w-[300px] h-[60px]" : "w-[800px] h-[600px]",
            "flex flex-col"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">
                {selectedConversation
                  ? selectedConversation.other_user.full_name
                  : "Chat Interno"}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsOpen(false);
                  setSelectedConversation(null);
                }}
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="flex-1 overflow-hidden">
              {selectedConversation ? (
                <ChatWindow
                  conversationId={selectedConversation.id}
                  otherUser={selectedConversation.other_user}
                  onBack={handleBack}
                />
              ) : (
                <ConversationList
                  onSelectConversation={handleSelectConversation}
                  onNewConversation={() => setShowNewConversation(true)}
                  selectedConversationId={selectedConversation?.id || null}
                />
              )}
            </div>
          )}
        </Card>
      )}

      <NewConversationDialog
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onConversationCreated={handleConversationCreated}
      />
    </>
  );
};
