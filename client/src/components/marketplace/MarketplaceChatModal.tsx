import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  ShieldAlert,
  Flag,
  CheckCircle,
  AlertTriangle,
  Mic,
  MicOff,
  MapPin,
  Tag,
  DollarSign,
  Play,
  Pause,
  RotateCcw,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Navigation,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { ChatThread, ChatMessage, OfferPayload, LocationPayload } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useWebSocket } from '../../context/WebSocketContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Modal } from '../common/Modal.js';

interface MarketplaceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName?: string;
  sellerAvatar?: string;
  listingId?: string;
  listingTitle?: string;
  listingPrice?: number;
  initialOfferPrompt?: boolean;
  onBackToInbox?: () => void;
}

const QUICK_REPLIES = [
  'Is this still available?',
  "What's your best price?",
  'Can we meet today?',
  'Is the price negotiable?',
  'Is delivery available?',
];

export const MarketplaceChatModal: React.FC<MarketplaceChatModalProps> = ({
  isOpen,
  onClose,
  sellerId,
  sellerName,
  sellerAvatar,
  listingId,
  listingTitle,
  listingPrice,
  initialOfferPrompt = false,
  onBackToInbox,
}) => {
  const { user } = useAuth();
  const { lastMessage, sendWsMessage } = useWebSocket();

  // Consistent buyer ID
  const buyerId = user?.id || (() => {
    let saved = localStorage.getItem('zioee_guest_buyer_id');
    if (!saved) {
      saved = `usr-guest-${Date.now()}`;
      localStorage.setItem('zioee_guest_buyer_id', saved);
    }
    return saved;
  })();

  const buyerName = user?.name || user?.phone || 'Interested Buyer';
  const buyerAvatar = user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';

  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Safety warning first-time modal
  const [showFirstTimeSafetyModal, setShowFirstTimeSafetyModal] = useState(false);

  // Offer Modal State
  const [showOfferModal, setShowOfferModal] = useState(initialOfferPrompt);
  const [offerAmount, setOfferAmount] = useState(listingPrice ? Math.round(listingPrice * 0.9).toString() : '');
  const [counterInputModal, setCounterInputModal] = useState<{ messageId: string; currentOffer: number } | null>(null);
  const [counterAmount, setCounterAmount] = useState('');

  // Voice Message Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<any>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Location Sharing State
  const [isLocating, setIsLocating] = useState(false);
  const [locationConfirm, setLocationConfirm] = useState<LocationPayload | null>(null);

  // Report Modal State
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('Off-platform payment solicitation / Scammer');
  const [reportSuccess, setReportSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle safety modal dismiss and store both persistence flags
  const handleDismissSafetyModal = () => {
    localStorage.setItem('zioee_chat_safety_acknowledged', 'true');
    localStorage.setItem('hasSeenSafetyModal', 'true');
    setShowFirstTimeSafetyModal(false);
  };

  // First-time safety check
  useEffect(() => {
    if (isOpen) {
      const acknowledged =
        localStorage.getItem('zioee_chat_safety_acknowledged') ||
        localStorage.getItem('hasSeenSafetyModal');
      if (!acknowledged) {
        setShowFirstTimeSafetyModal(true);
      }
    }
  }, [isOpen]);

  // Outer Chat Modal Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If inner dialogs are active, let them handle escape
      if (
        showFirstTimeSafetyModal ||
        showOfferModal ||
        counterInputModal ||
        showReport ||
        locationConfirm
      ) {
        return;
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isOpen,
    showFirstTimeSafetyModal,
    showOfferModal,
    counterInputModal,
    showReport,
    locationConfirm,
    onClose,
  ]);

  // Load or create chat thread
  useEffect(() => {
    if (!isOpen || !sellerId) return;

    const initThread = async () => {
      setIsLoading(true);
      try {
        const t = await api.createOrGetChat(buyerId, sellerId, listingId, {
          name: buyerName,
          avatar: buyerAvatar,
          email: user?.email,
        });
        setThread(t);
        setMessages(t.messages || []);
      } catch (err) {
        console.error('Failed to get chat thread:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initThread();
  }, [isOpen, sellerId, listingId, buyerId]);

  // WebSocket message listener
  useEffect(() => {
    if (lastMessage && thread) {
      if (
        (lastMessage.type === 'CHAT_MESSAGE_SENT' || lastMessage.type === 'NEW_CHAT_MESSAGE') &&
        lastMessage.payload?.threadId === thread.id
      ) {
        const incoming = lastMessage.payload.message;
        setMessages((prev) => {
          // Avoid duplicate if optimistic message already exists
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev.filter((m) => m.status !== 'sending' || m.text !== incoming.text), incoming];
        });
      }

      if (lastMessage.type === 'OFFER_UPDATED' && lastMessage.payload?.threadId === thread.id) {
        const updatedMsg = lastMessage.payload.message;
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
      }
    }
  }, [lastMessage, thread]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!isOpen) return null;

  // Send Text Message
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputText).trim();
    if (!textToSend) return;

    if (!customText) setInputText('');
    setSendError(null);
    setIsSending(true);

    let activeThread = thread;
    if (!activeThread && sellerId) {
      try {
        activeThread = await api.createOrGetChat(buyerId, sellerId, listingId, {
          name: buyerName,
          avatar: buyerAvatar,
          email: user?.email,
        });
        setThread(activeThread);
      } catch (initErr) {
        console.error('Failed to initialize thread for message dispatch:', initErr);
      }
    }

    if (!activeThread) {
      setIsSending(false);
      setSendError('Unable to connect to seller. Please check your connection and tap Retry.');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      senderId: buyerId,
      senderName: buyerName,
      senderAvatar: buyerAvatar,
      text: textToSend,
      type: 'text',
      status: 'sending',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const sent = await api.sendChatMessage(activeThread.id, {
        text: textToSend,
        type: 'text',
        senderId: buyerId,
        senderName: buyerName,
        senderAvatar: buyerAvatar,
      });

      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...sent, status: 'sent' } : m)));

      sendWsMessage('CHAT_MESSAGE', {
        threadId: activeThread.id,
        message: sent,
      });
    } catch (err: any) {
      console.error('Failed to send text message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
      setSendError(err?.message || 'Message could not be delivered. Tap retry.');
    } finally {
      setIsSending(false);
    }
  };

  // Retry sending a failed message
  const handleRetryMessage = async (failedMsg: ChatMessage) => {
    if (!thread) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'sending' } : m))
    );

    try {
      const sent = await api.sendChatMessage(thread.id, {
        text: failedMsg.text,
        type: failedMsg.type,
        audioUrl: failedMsg.audioUrl,
        duration: failedMsg.duration,
        locationData: failedMsg.locationData,
        offerData: failedMsg.offerData,
        senderId: buyerId,
        senderName: buyerName,
        senderAvatar: buyerAvatar,
      });

      setMessages((prev) => prev.map((m) => (m.id === failedMsg.id ? sent : m)));
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'failed' } : m))
      );
    }
  };

  // Voice Note Recording Handlers
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setVoiceDuration(0);

      voiceTimerRef.current = setInterval(() => {
        setVoiceDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access was denied or is not supported in this browser.');
    }
  };

  const stopAndSendVoiceRecording = () => {
    if (!mediaRecorderRef.current || !thread) return;

    clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const tempId = `temp-voice-${Date.now()}`;

        const optimisticMsg: ChatMessage = {
          id: tempId,
          senderId: buyerId,
          senderName: buyerName,
          senderAvatar: buyerAvatar,
          text: `🎤 Voice message (${voiceDuration}s)`,
          type: 'voice',
          audioUrl: base64Audio,
          duration: voiceDuration,
          status: 'sending',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, optimisticMsg]);

        try {
          const sent = await api.sendChatMessage(thread.id, {
            type: 'voice',
            audioUrl: base64Audio,
            duration: voiceDuration,
            senderId: buyerId,
            senderName: buyerName,
            senderAvatar: buyerAvatar,
          });

          setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)));
        } catch {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
          );
        }
      };
      reader.readAsDataURL(audioBlob);

      // Stop all audio tracks
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorderRef.current.stop();
  };

  const cancelVoiceRecording = () => {
    clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);
    setVoiceDuration(0);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handlePlayVoiceMessage = (msgId: string, audioUrl: string) => {
    if (playingAudioId === msgId) {
      currentAudioRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    setPlayingAudioId(msgId);

    audio.onended = () => {
      setPlayingAudioId(null);
    };

    audio.play().catch(() => {
      setPlayingAudioId(null);
    });
  };

  // Share Location Handlers
  const handleRequestShareLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

        try {
          // Reverse geocode via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          if (data && data.display_name) {
            address = data.display_name.split(',').slice(0, 3).join(',');
          }
        } catch {
          // Fallback to coordinates string
        }

        setIsLocating(false);
        setLocationConfirm({
          lat: latitude,
          lng: longitude,
          address,
        });
      },
      () => {
        setIsLocating(false);
        alert('Could not retrieve GPS location. Please allow location permissions.');
      }
    );
  };

  const handleConfirmSendLocation = async () => {
    if (!locationConfirm || !thread) return;

    const loc = locationConfirm;
    setLocationConfirm(null);
    const tempId = `temp-loc-${Date.now()}`;

    const optimisticMsg: ChatMessage = {
      id: tempId,
      senderId: buyerId,
      senderName: buyerName,
      senderAvatar: buyerAvatar,
      text: `📍 Location: ${loc.address}`,
      type: 'location',
      locationData: loc,
      status: 'sending',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const sent = await api.sendChatMessage(thread.id, {
        type: 'location',
        locationData: loc,
        senderId: buyerId,
        senderName: buyerName,
        senderAvatar: buyerAvatar,
      });

      setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)));
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    }
  };

  // Make an Offer Handlers
  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(offerAmount);
    if (!amount || amount <= 0 || !thread) return;

    setShowOfferModal(false);
    const tempId = `temp-offer-${Date.now()}`;

    const offerData: OfferPayload = {
      amount,
      originalPrice: listingPrice,
      status: 'PENDING',
    };

    const optimisticMsg: ChatMessage = {
      id: tempId,
      senderId: buyerId,
      senderName: buyerName,
      senderAvatar: buyerAvatar,
      text: `🏷️ Offer proposed: ₹${amount.toLocaleString()}`,
      type: 'offer',
      offerData,
      status: 'sending',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const sent = await api.sendChatMessage(thread.id, {
        type: 'offer',
        offerData,
        senderId: buyerId,
        senderName: buyerName,
        senderAvatar: buyerAvatar,
      });

      setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)));
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    }
  };

  const handleRespondToOffer = async (
    messageId: string,
    action: 'ACCEPT' | 'REJECT' | 'COUNTER',
    counterVal?: number
  ) => {
    if (!thread) return;
    try {
      const res = await api.respondToOffer(thread.id, messageId, action, counterVal);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? res.message : m))
      );
    } catch {
      alert('Failed to respond to offer.');
    }
  };

  const handleReportChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thread) return;
    try {
      await api.reportChat(thread.id, reportReason);
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setShowReport(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      role="presentation"
      data-testid="chat-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white w-full max-w-full h-[100dvh] sm:max-w-lg sm:h-[620px] sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-100 flex flex-col overflow-hidden animate-in fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chat Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBackToInbox && (
              <button
                type="button"
                onClick={onBackToInbox}
                className="w-9 h-9 -ml-1 rounded-full hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Back to conversation list"
                aria-label="Back to conversation list"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <img
              src={thread?.user?.avatar || sellerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
              alt={thread?.user?.name || sellerName || 'Seller'}
              className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                {thread?.user?.name || sellerName || 'Seller'}
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {listingTitle || thread?.listingTitle ? `Re: ${listingTitle || thread?.listingTitle}` : 'Verified Marketplace Chat'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Make Offer Button in Header */}
            <button
              type="button"
              onClick={() => setShowOfferModal(true)}
              id="chat-header-make-offer-btn"
              data-testid="chat-header-make-offer-btn"
              className="min-h-[38px] px-3.5 sm:px-4 py-1.5 bg-brand-accent bg-[#ff5a5f] hover:bg-[#e0484d] text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-cta cursor-pointer opacity-100"
              style={{ backgroundColor: '#ff5a5f', color: '#ffffff', opacity: 1 }}
              title="Make an Offer"
            >
              <Tag className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Make Offer</span>
            </button>

            <button
              onClick={() => setShowReport(!showReport)}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
              title="Report conversation"
            >
              <Flag className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Close chat"
              aria-label="Close chat"
              data-testid="chat-close-button"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Persistent High-Visibility Safety Warning Banner */}
        <div className="bg-brand-danger-light border-b border-brand-danger/20 px-3.5 py-2 flex items-center gap-2 text-brand-danger text-xs font-semibold shrink-0">
          <ShieldAlert className="w-4 h-4 text-brand-danger shrink-0" />
          <p className="leading-snug text-[11px]">
            <strong>Stay Safe:</strong> Never pay in advance or share OTPs. Always inspect the item and pay in person in a public spot.
          </p>
        </div>

        {/* Moderation Report Form */}
        {showReport && (
          <form
            onSubmit={handleReportChat}
            className="p-3 bg-red-50 border-b border-red-200 text-xs space-y-2 animate-in slide-in-from-top-2 shrink-0"
          >
            <p className="font-bold text-red-800">Report User for Policy Violation</p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full p-1.5 border border-red-200 rounded text-xs bg-white"
            >
              <option value="Off-platform payment solicitation / Scammer">Off-platform payment solicitation / Scammer</option>
              <option value="Harassment or inappropriate language">Harassment or inappropriate language</option>
              <option value="Fake / counterfeit listing inquiry">Fake / counterfeit listing inquiry</option>
            </select>
            <div className="flex items-center gap-2">
              <button type="submit" className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold">
                Submit Report
              </button>
              <button type="button" onClick={() => setShowReport(false)} className="text-xs text-slate-500 hover:text-slate-700">
                Cancel
              </button>
            </div>
            {reportSuccess && (
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Moderation team alerted!
              </p>
            )}
          </form>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
              Loading conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs space-y-2 text-center px-4">
              <ShieldCheck className="w-10 h-10 text-slate-300" />
              <p className="font-bold text-slate-600 text-sm">Start the Conversation</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Ask about item condition, propose a fair offer, or set a public meeting place in your city!
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === buyerId;

              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* TEXT MESSAGE */}
                  {(!m.type || m.type === 'text') && (
                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs shadow-xs ${
                        isMe
                          ? m.status === 'failed'
                            ? 'bg-red-50 text-red-900 border border-red-200'
                            : m.status === 'sending'
                            ? 'bg-brand-primary/80 text-white'
                            : 'bg-brand-primary text-white rounded-br-sm shadow-sm'
                          : 'bg-white text-[#1a1a1a] border border-slate-200 rounded-bl-sm shadow-sm'
                      }`}
                      style={{
                        backgroundColor: isMe ? (m.status === 'failed' ? '#fef2f2' : '#1b4b8f') : '#ffffff',
                        color: isMe ? (m.status === 'failed' ? '#7f1d1d' : '#ffffff') : '#1a1a1a',
                      }}
                    >
                      <p
                        className={`whitespace-pre-wrap font-medium ${isMe ? 'text-white' : 'text-[#1a1a1a]'}`}
                        style={{
                          color: isMe ? (m.status === 'failed' ? '#7f1d1d' : '#ffffff') : '#1a1a1a',
                        }}
                      >
                        {m.text}
                      </p>
                    </div>
                  )}

                  {/* VOICE NOTE MESSAGE */}
                  {m.type === 'voice' && m.audioUrl && (
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-xs flex items-center gap-3 ${
                        isMe
                          ? 'bg-brand-primary text-white rounded-br-sm'
                          : 'bg-white text-[#1a1a1a] border border-slate-200 rounded-bl-sm shadow-sm'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handlePlayVoiceMessage(m.id, m.audioUrl!)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isMe ? 'bg-white text-brand-primary' : 'bg-brand-primary text-white'
                        }`}
                      >
                        {playingAudioId === m.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                      <div className="space-y-1 min-w-[120px]">
                        <div className="flex items-center gap-0.5 h-4">
                          {[40, 70, 30, 90, 60, 45, 80, 50, 65, 35].map((h, idx) => (
                            <span
                              key={idx}
                              className={`w-1 rounded-full transition-all ${
                                isMe ? 'bg-white/80' : 'bg-brand-primary/80'
                              } ${playingAudioId === m.id ? 'animate-pulse' : ''}`}
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                        <span className={`text-[10px] block font-mono ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                          Voice Note • {m.duration || 0}s
                        </span>
                      </div>
                    </div>
                  )}

                  {/* LOCATION MESSAGE */}
                  {m.type === 'location' && m.locationData && (
                    <div
                      className={`max-w-[85%] rounded-2xl overflow-hidden border shadow-sm ${
                        isMe ? 'bg-brand-primary-light border-brand-primary/20' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Shared Location
                            </span>
                            <p className="text-xs font-bold text-slate-800 leading-snug">
                              {m.locationData.address}
                            </p>
                          </div>
                        </div>

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${m.locationData.lat},${m.locationData.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Open in Google Maps</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* MAKE AN OFFER MESSAGE */}
                  {m.type === 'offer' && m.offerData && (
                    <div className="max-w-[90%] rounded-2xl overflow-hidden border border-brand-accent/30 bg-brand-accent-light/40 shadow-sm p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-brand-accent text-white font-extrabold text-[10px] tracking-wide uppercase flex items-center gap-1 shadow-sm">
                          <Tag className="w-3 h-3 text-white" />
                          Price Offer
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            m.offerData.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.offerData.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : m.offerData.status === 'COUNTERED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {m.offerData.status}
                        </span>
                      </div>

                      <div>
                        <span className="text-xl font-black text-slate-900 block">
                          ₹{m.offerData.amount.toLocaleString()}
                        </span>
                        {m.offerData.originalPrice && (
                          <span className="text-[11px] text-slate-500 line-through">
                            Original Listing: ₹{m.offerData.originalPrice.toLocaleString()}
                          </span>
                        )}
                        {m.offerData.status === 'COUNTERED' && m.offerData.counterAmount && (
                          <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-900">
                            Counter-offer: ₹{m.offerData.counterAmount.toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Action buttons visible if offer is PENDING and user is the other party */}
                      {m.offerData.status === 'PENDING' && !isMe && (
                        <div className="flex items-center gap-2 pt-1.5">
                          <button
                            type="button"
                            onClick={() => handleRespondToOffer(m.id, 'ACCEPT')}
                            className="flex-1 min-h-[40px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            Accept Offer
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCounterInputModal({ messageId: m.id, currentOffer: m.offerData!.amount });
                              setCounterAmount(m.offerData!.amount.toString());
                            }}
                            className="flex-1 min-h-[40px] px-3 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold shadow-primary active:scale-95 transition-all cursor-pointer"
                          >
                            Counter
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespondToOffer(m.id, 'REJECT')}
                            className="min-h-[40px] px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status & Timestamp */}
                  <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400">
                    <span>{m.timestamp}</span>
                    {isMe && (
                      <>
                        {m.status === 'sending' && <Clock className="w-3 h-3 text-slate-400 animate-spin" />}
                        {m.status === 'failed' && (
                          <button
                            onClick={() => handleRetryMessage(m)}
                            className="text-rose-600 hover:underline font-bold flex items-center gap-0.5 ml-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Retry
                          </button>
                        )}
                        {m.status === 'sent' && <CheckCircle className="w-3 h-3 text-blue-500" />}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick-Reply Chips */}
        <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setShowOfferModal(true)}
            id="chat-quick-offer-btn"
            data-testid="chat-quick-offer-btn"
            className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-[#ff5a5f] hover:bg-[#e0484d] text-white text-xs font-black whitespace-nowrap transition-all shrink-0 shadow-cta cursor-pointer active:scale-95 flex items-center gap-1.5 border border-white/30 opacity-100"
            style={{ backgroundColor: '#ff5a5f', color: '#ffffff', opacity: 1 }}
            title="Make a price offer for this item"
          >
            <Tag className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Make an Offer</span>
          </button>
          {QUICK_REPLIES.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputText(chip)}
              className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-200 border-2 border-slate-300 text-slate-800 text-xs font-bold whitespace-nowrap transition-all shrink-0 shadow-xs cursor-pointer active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Live Audio Recording Overlay Bar */}
        {isRecordingVoice ? (
          <div className="p-3 bg-rose-50 border-t border-rose-200 flex items-center justify-between shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2 text-rose-700">
              <div className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
              <span className="font-mono font-bold text-xs">
                Recording: {Math.floor(voiceDuration / 60)}:{String(voiceDuration % 60).padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={stopAndSendVoiceRecording}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Voice Note</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Chat Input Bar */
          <div className="shrink-0 bg-white border-t border-slate-200">
            {sendError && (
              <div className="px-3.5 py-2 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs text-rose-800 animate-in fade-in">
                <span className="font-semibold truncate mr-2">{sendError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSendError(null);
                    handleSendMessage();
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shrink-0 active:scale-95 transition-transform cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}
            <form
              onSubmit={(e) => handleSendMessage(e)}
              className="p-2.5 sm:p-3 flex items-center gap-1.5 sm:gap-2"
            >
              {/* Share Location Button */}
              <button
                type="button"
                onClick={handleRequestShareLocation}
                disabled={isLocating}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-600 border border-slate-200 shadow-xs transition-colors cursor-pointer active:scale-95 shrink-0"
                title="Share Location"
              >
                <MapPin className={`w-5 h-5 ${isLocating ? 'animate-bounce text-rose-500' : ''}`} />
              </button>

              {/* Voice Message Mic Button */}
              <button
                type="button"
                onClick={startVoiceRecording}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-brand-primary border border-slate-200 shadow-xs transition-colors cursor-pointer active:scale-95 shrink-0"
                title="Record Voice Note"
              >
                <Mic className="w-5 h-5" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (sendError) setSendError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                onFocus={() => {
                  setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 300);
                }}
                placeholder="Type message or choose a quick reply above..."
                className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary font-medium"
              />

              <button
                type="submit"
                disabled={!inputText.trim() && !isSending}
                id="chat-send-btn"
                data-testid="chat-send-btn"
                onPointerDown={(e) => {
                  if (inputText.trim()) {
                    e.preventDefault();
                  }
                }}
                onTouchEnd={(e) => {
                  if (inputText.trim() && !isSending) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                onClick={(e) => {
                  handleSendMessage(e);
                }}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-brand-primary hover:bg-brand-primary-hover disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl shadow-primary hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed shrink-0"
                title="Send message"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* LOCATION CONFIRMATION POPUP */}
      {locationConfirm && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl border space-y-3 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <MapPin className="w-5 h-5" />
              <span>Share Meeting Location</span>
            </div>
            <p className="text-xs text-slate-600">
              Share this address with the seller as a proposed meeting spot:
            </p>
            <div className="p-2.5 bg-slate-50 rounded-xl border text-xs font-semibold text-slate-800">
              {locationConfirm.address}
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setLocationConfirm(null)}
                className="px-3 py-1.5 text-xs text-slate-600 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSendLocation}
                className="px-4 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow"
              >
                Send Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAKE AN OFFER MODAL */}
      {showOfferModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl border space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-brand-accent font-bold text-sm">
                <Tag className="w-4 h-4" />
                <span>Make a Price Offer</span>
              </div>
              <button onClick={() => setShowOfferModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {listingPrice && (
              <p className="text-xs text-slate-500">
                Listing Price: <strong>₹{listingPrice.toLocaleString()}</strong>
              </p>
            )}

            <form onSubmit={handleSendOffer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Proposed Price (₹)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="e.g. 18000"
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="min-h-[44px] px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs sm:text-sm font-black rounded-xl shadow-cta hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  Submit Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COUNTER-OFFER MODAL */}
      {counterInputModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl border space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm font-bold text-brand-primary">Propose Counter-Offer</span>
              <button onClick={() => setCounterInputModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Buyer proposed: ₹{counterInputModal.currentOffer.toLocaleString()}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amount = Number(counterAmount);
                if (amount > 0) {
                  handleRespondToOffer(counterInputModal.messageId, 'COUNTER', amount);
                }
                setCounterInputModal(null);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Counter Price (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCounterInputModal(null)}
                  className="min-h-[44px] px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs sm:text-sm font-bold rounded-xl shadow-primary hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  Send Counter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FIRST-TIME SAFETY RULES MODAL */}
      <Modal
        isOpen={showFirstTimeSafetyModal}
        onClose={handleDismissSafetyModal}
        zIndexClass="z-[70]"
        maxWidthClass="max-w-sm"
        className="p-6 text-center space-y-4 shadow-2xl border"
        closeButtonPosition="floating"
        closeButtonAriaLabel="Close safety rules"
      >
        <div className="w-12 h-12 rounded-full bg-brand-danger-light text-brand-danger mx-auto flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="font-extrabold text-slate-900 text-base">ZOVA Safety Rules</h3>
        <div className="text-xs text-slate-600 space-y-2 text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <p>• <strong>Never pay in advance:</strong> Do not transfer tokens, deposits, or shipping charges before seeing the item.</p>
          <p>• <strong>Meet in Public:</strong> Meet the seller in a well-lit, public location (mall, metro station, market).</p>
          <p>• <strong>Inspect thoroughly:</strong> Test electronic items and verify documents for vehicles before paying.</p>
        </div>
        <button
          type="button"
          onClick={handleDismissSafetyModal}
          id="safety-rules-dismiss-btn"
          data-testid="safety-rules-got-it"
          className="w-full min-h-[44px] py-2.5 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-bold shadow-primary hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
        >
          Got it
        </button>
      </Modal>
    </div>
  );
};
