import { useState, useEffect } from 'react';
// import { useChat } from '../../../../../contexts/chat/ChatContext';

interface Conversation {
  id: string;
  subject: string;
  last_message_at: string;
  other_user_name: string;
  other_user_role: string;
  last_message: string;
  unread_count: number;
}

export default function InboxPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  // const { activeSession, messages, sendMessage } = useChat();

  // Fetch conversations for inbox
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:3001/api/messages/conversations', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setConversations(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Start new conversation (placeholder - would need user search)
  const startNewConversation = () => {
    // This would open a modal to search for users and start conversation
    console.log('Start new conversation clicked');
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-white/20 rounded"></div>
            <div className="h-4 bg-white/20 rounded w-5/6"></div>
            <div className="h-4 bg-white/20 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Messages</h3>
        <button
          onClick={startNewConversation}
          className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          + New Message
        </button>
      </div>

      {/* Conversation List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            <div className="text-4xl mb-2">📧</div>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start a conversation with a student</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 rounded-lg cursor-pointer transition-all hover:bg-white/10 border ${
                selectedConversation === conversation.id 
                  ? 'bg-white/20 border-white/40' 
                  : 'bg-white/5 border-white/10'
              } ${conversation.unread_count > 0 ? 'border-blue-400/50' : ''}`}
              onClick={() => setSelectedConversation(conversation.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-white text-sm">
                    {conversation.other_user_name}
                  </span>
                  <span className="text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded">
                    {conversation.other_user_role}
                  </span>
                </div>
                {conversation.unread_count > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {conversation.unread_count}
                  </span>
                )}
              </div>
              
              <p className="text-white/70 text-sm mb-1 line-clamp-1">
                {conversation.subject}
              </p>
              
              <p className="text-white/50 text-xs line-clamp-2">
                {conversation.last_message || 'No messages yet'}
              </p>
              
              <div className="flex justify-between items-center mt-2">
                <span className="text-white/40 text-xs">
                  {new Date(conversation.last_message_at).toLocaleDateString()}
                </span>
                <span className="text-white/40 text-xs">
                  {conversation.other_user_role === 'student' ? '🎓' : '👨‍🏫'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-4 border-t border-white/20">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-white font-bold text-lg">{conversations.length}</div>
            <div className="text-white/60 text-xs">Conversations</div>
          </div>
          <div>
            <div className="text-white font-bold text-lg">
              {conversations.filter(c => c.unread_count > 0).length}
            </div>
            <div className="text-white/60 text-xs">Unread</div>
          </div>
          <div>
            <div className="text-white font-bold text-lg">
              {conversations.filter(c => c.other_user_role === 'student').length}
            </div>
            <div className="text-white/60 text-xs">Students</div>
          </div>
        </div>
      </div>
    </div>
  );
}
