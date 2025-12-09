import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CreateGroupDialog } from "@/components/chat/CreateGroupDialog";
import { MessageSquarePlus } from "lucide-react";

interface SelectedConversation {
  id: string;
  is_group: boolean;
  other_user?: {
    id: string;
    full_name: string;
  };
  group_name?: string;
  group_icon?: string;
}

const Chat = () => {
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const handleSelectConversation = (conversation: any) => {
    setSelectedConversation({
      id: conversation.id,
      is_group: conversation.is_group || false,
      other_user: conversation.other_user,
      group_name: conversation.group_name,
      group_icon: conversation.group_icon,
    });
  };

  const handleGroupCreated = (conversationId: string) => {
    // Refresh will happen via realtime subscription
    setIsCreateGroupOpen(false);
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="container mx-auto py-6 h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Lista de Conversas */}
        <Card className={`lg:col-span-1 ${selectedConversation ? 'hidden lg:flex' : 'flex'} flex-col`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-semibold">Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ConversationList
              onSelectConversation={handleSelectConversation}
              onCreateGroup={() => setIsCreateGroupOpen(true)}
              selectedConversationId={selectedConversation?.id || null}
            />
          </CardContent>
        </Card>

        {/* Janela de Chat */}
        <Card className={`lg:col-span-2 ${!selectedConversation ? 'hidden lg:flex' : 'flex'} flex-col`}>
          {selectedConversation ? (
            <ChatWindow
              conversationId={selectedConversation.id}
              isGroup={selectedConversation.is_group}
              otherUser={selectedConversation.other_user}
              groupName={selectedConversation.group_name}
              groupIcon={selectedConversation.group_icon}
              onBack={handleBack}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <MessageSquarePlus className="h-12 w-12 mx-auto opacity-20" />
                <p>Selecione uma conversa para começar</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <CreateGroupDialog
        open={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
};

export default Chat;