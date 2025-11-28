import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MessageSquarePlus } from "lucide-react";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { NewConversationDialog } from "@/components/chat/NewConversationDialog";

interface SelectedConversation {
  id: string;
  otherUser: {
    id: string;
    full_name: string;
  };
}

const Chat = () => {
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(null);
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSelectConversation = (conversation: any) => {
    setSelectedConversation({
      id: conversation.id,
      otherUser: {
        id: conversation.otherUser.id,
        full_name: conversation.otherUser.name,
      },
    });
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="container mx-auto py-6 h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Lista de Conversas */}
        <Card className={`lg:col-span-1 ${selectedConversation ? 'hidden lg:flex' : 'flex'} flex-col`}>
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">Conversas</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsNewConversationOpen(true)}
                className="h-8 w-8"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ConversationList
              onSelectConversation={handleSelectConversation}
              onNewConversation={() => setIsNewConversationOpen(true)}
              selectedConversationId={selectedConversation?.id}
            />
          </CardContent>
        </Card>

        {/* Janela de Chat */}
        <Card className={`lg:col-span-2 ${!selectedConversation ? 'hidden lg:flex' : 'flex'} flex-col`}>
          {selectedConversation ? (
            <ChatWindow
              conversationId={selectedConversation.id}
              otherUser={selectedConversation.otherUser}
              onBack={handleBack}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <MessageSquarePlus className="h-12 w-12 mx-auto opacity-20" />
                <p>Selecione uma conversa ou inicie uma nova</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <NewConversationDialog
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
        onConversationCreated={handleSelectConversation}
      />
    </div>
  );
};

export default Chat;
