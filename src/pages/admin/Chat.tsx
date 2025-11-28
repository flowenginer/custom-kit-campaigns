import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { NewConversationDialog } from "@/components/chat/NewConversationDialog";
import { supabase } from "@/integrations/supabase/client";

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

  const handleSelectConversation = (conversation: any) => {
    setSelectedConversation({
      id: conversation.id,
      otherUser: {
        id: conversation.other_user.id,
        full_name: conversation.other_user.full_name,
      },
    });
  };

  const handleNewConversationCreated = async (conversationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: otherParticipant } = await supabase
      .from("chat_participants")
      .select("user_id, profiles!inner(id, full_name)")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id)
      .single();

    if (otherParticipant) {
      setSelectedConversation({
        id: conversationId,
        otherUser: {
          id: (otherParticipant as any).profiles.id,
          full_name: (otherParticipant as any).profiles.full_name,
        },
      });
      setIsNewConversationOpen(false);
    }
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="container mx-auto py-6 h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Lista de Conversas */}
        <Card className={`lg:col-span-1 ${selectedConversation ? 'hidden lg:flex' : 'flex'} flex-col`}>
          <CardHeader>
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
        onConversationCreated={handleNewConversationCreated}
      />
    </div>
  );
};

export default Chat;
