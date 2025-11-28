// app/components/StudentMessages.tsx
'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Search, Send } from 'lucide-react';

interface Message {
  id: string;
  tutor_id: string;
  tutor_name: string;
  subject: string;
  last_message: string;
  timestamp: string;
  unread: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'student' | 'tutor';
  content: string;
  timestamp: string;
  read: boolean;
}

export default function StudentMessages() {
  const [conversations, setConversations] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API calls
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setConversations([
        {
          id: '1',
          tutor_id: '1',
          tutor_name: 'Mr. Johnson',
          subject: 'CAPE Physics Unit 1',
          last_message: 'See you for our session tomorrow at 3 PM',
          timestamp: '2 hours ago',
          unread: true
        },
        {
          id: '2',
          tutor_id: '2',
          tutor_name: 'Ms. Davis',
          subject: 'CSEC Mathematics',
          last_message: 'Great work on the algebra assignment!',
          timestamp: '1 day ago',
          unread: false
        },
        {
          id: '3',
          tutor_id: '3',
          tutor_name: 'Mr. Brown',
          subject: 'CAPE Chemistry',
          last_message: 'Don\'t forget to review the organic chemistry notes',
          timestamp: '3 days ago',
          unread: false
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      // Simulate loading messages
      setMessages([
        {
          id: '1',
          sender: 'tutor',
          content: 'Hi! How can I help you with Physics today?',
          timestamp: '2024-01-15T10:00:00Z',
          read: true
        },
        {
          id: '2',
          sender: 'student',
          content: 'I\'m having trouble with Newton\'s Laws, specifically the third law',
          timestamp: '2024-01-15T10:05:00Z',
          read: true
        },
        {
          id: '3',
          sender: 'tutor',
          content: 'No problem! Let me explain it with some practical examples',
          timestamp: '2024-01-15T10:06:00Z',
          read: true
        },
        {
          id: '4',
          sender: 'tutor',
          content: 'See you for our session tomorrow at 3 PM',
          timestamp: '2024-01-15T16:30:00Z',
          read: false
        }
      ]);
    }
  }, [selectedConversation]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'student',
      content: newMessage,
      timestamp: new Date().toISOString(),
      read: true
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessage('');

    // Update last message in conversations
    setConversations(prev => 
      prev.map(conv => 
        conv.id === selectedConversation 
          ? { ...conv, last_message: newMessage, timestamp: 'Just now', unread: false }
          : conv
      )
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-96 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <MessageSquare size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-96 flex">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare size={18} />
            Messages
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedConversation === conversation.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <h4 className="font-medium text-gray-900 text-sm">
                  {conversation.tutor_name}
                </h4>
                {conversation.unread && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-1">{conversation.subject}</p>
              <p className="text-sm text-gray-700 truncate mb-1">
                {conversation.last_message}
              </p>
              <span className="text-xs text-gray-500">{conversation.timestamp}</span>
            </button>
          ))}
          
          {conversations.length === 0 && (
            <div className="text-center p-8">
              <MessageSquare size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No messages yet</p>
              <p className="text-gray-400 text-xs mt-1">Start a conversation with a tutor</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {conversations.find(c => c.id === selectedConversation)?.tutor_name}
              </h3>
              <p className="text-sm text-gray-600">
                {conversations.find(c => c.id === selectedConversation)?.subject}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === 'student'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.sender === 'student' ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Send size={16} />
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}