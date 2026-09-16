import React, { useState, useEffect } from 'react';
import { ChatThread, ChatMessage } from '../types/index.js';
import { api } from '../services/api.js';
import { useWebSocket } from '../context/WebSocketContext.js';
import { MessageSquare, Send, Search, CheckCheck, ArrowLeft } from 'lucide-react';

export const ChatsPage: React.FC = () => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [inputText, setInputText] = useState('');
  const { sendWsMessage } = useWebSocket();

  const fetchChats = async () => {
    try {
      const data = await api.getChats();
      setThreads(data);
      if (data.length > 0 && !activeThreadId) {
        setActiveThreadId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeThreadId) return;

    const messageText = inputText;
    setInputText('');

    try {
      const newMessage = await api.sendChatMessage(activeThreadId, messageText);
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              lastMessage: messageText,
              timeAgo: 'Just now',
              messages: [...t.messages, newMessage],
            };
          }
          return t;
        })
      );
      sendWsMessage('CHAT_MESSAGE', { threadId: activeThreadId, message: newMessage });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[calc(100vh-140px)] sm:h-[calc(100vh-180px)] flex flex-col md:flex-row w-full max-w-full">
      {/* Left Chat Threads List */}
      <div
        className={`w-full md:w-80 border-r border-slate-200 flex-col shrink-0 bg-slate-50/50 ${
          mobileShowChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Live Inquiries & Chats</h2>
          <div className="relative mt-3">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveThreadId(t.id);
                setMobileShowChat(true);
              }}
              className={`w-full text-left p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                t.id === activeThreadId ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-100/70'
              }`}
            >
              <img
                src={t.user.avatar}
                alt={t.user.name}
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{t.user.name}</h4>
                  <span className="text-[10px] text-slate-400 shrink-0">{t.timeAgo}</span>
                </div>
                <p className="text-[11px] font-medium text-blue-600 truncate mt-0.5">
                  {t.listingTitle || 'Marketplace Item'}
                </p>
                <p className="text-xs text-slate-500 truncate mt-1">{t.lastMessage}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Chat View */}
      {activeThread ? (
        <div className={`flex-1 flex-col bg-white min-w-0 ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
          {/* Active Header */}
          <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileShowChat(false)}
                className="md:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
                title="Back to conversations"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <img
                src={activeThread.user.avatar}
                alt={activeThread.user.name}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0"
              />
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{activeThread.user.name}</h3>
                <p className="text-[11px] text-slate-500 truncate">{activeThread.user.email}</p>
              </div>
            </div>
            <div className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg truncate max-w-[140px] sm:max-w-xs shrink-0">
              Ad: {activeThread.listingTitle}
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40">
            {activeThread.messages.map((m) => {
              const isMe = m.senderName === 'Admin';
              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <img
                      src={m.senderAvatar}
                      alt={m.senderName}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  )}
                  <div
                    className={`max-w-md p-3.5 rounded-2xl text-xs shadow-sm ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-[#1a1a1a] border border-slate-200 rounded-bl-none'
                    }`}
                    style={{
                      backgroundColor: isMe ? '#2563eb' : '#ffffff',
                      color: isMe ? '#ffffff' : '#1a1a1a',
                    }}
                  >
                    <p
                      className={`leading-relaxed font-medium ${isMe ? 'text-white' : 'text-[#1a1a1a]'}`}
                      style={{ color: isMe ? '#ffffff' : '#1a1a1a' }}
                    >
                      {m.text}
                    </p>
                    <span
                      className={`block text-[10px] mt-1 text-right ${
                        isMe ? 'text-blue-100' : 'text-slate-500'
                      }`}
                      style={{ color: isMe ? '#dbeafe' : '#64748b' }}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your official reply to buyer/seller..."
              className="flex-1 px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
          Select a chat to begin live conversation
        </div>
      )}
    </div>
  );
};
