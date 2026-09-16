import React, { useState } from 'react';
import { ChatThread } from '../../types/index.js';
import { Send, X, MessageSquare } from 'lucide-react';

interface RecentChatsCardProps {
  chats?: ChatThread[];
  onViewAll?: () => void;
  onSendMessage?: (threadId: string, text: string) => void;
}

export const RecentChatsCard: React.FC<RecentChatsCardProps> = ({
  chats,
  onViewAll,
  onSendMessage,
}) => {
  const [activeChat, setActiveChat] = useState<ChatThread | null>(null);
  const [replyText, setReplyText] = useState('');

  const items = chats || [];

  const handleSend = () => {
    if (!replyText.trim() || !activeChat) return;
    onSendMessage?.(activeChat.id, replyText);
    setReplyText('');
    setActiveChat(null);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900">Recent Chats</h3>
        {onViewAll && items.length > 0 && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            View All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center text-xs text-slate-400">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
            <MessageSquare className="w-5 h-5" />
          </div>
          <p className="font-semibold text-slate-600">No active conversations</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Customer chats will appear here in real time.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Message</th>
                <th className="pb-3 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setActiveChat(c)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  title="Click to respond"
                >
                  <td className="py-2.5 flex items-center gap-2.5">
                    <img
                      src={c.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt={c.user.name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    />
                    <span className="font-semibold text-slate-800 truncate max-w-[90px]">
                      {c.user.name}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-600 max-w-[170px] truncate">{c.lastMessage}</td>
                  <td className="py-2.5 text-right text-slate-400 whitespace-nowrap text-[11px]">
                    {c.timeAgo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Reply Modal */}
      {activeChat && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <img
                  src={activeChat.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={activeChat.user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{activeChat.user.name}</h4>
                  <p className="text-[10px] text-slate-400">Re: {activeChat.listingTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveChat(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Latest message:
              </p>
              <p>{activeChat.lastMessage}</p>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your reply..."
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
