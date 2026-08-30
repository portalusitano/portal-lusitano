"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, Paperclip, Smile, MoreVertical, Search, Users, Hash } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface Message {
  id: string;
  sender_email: string;
  message: string;
  mentions: string[];
  has_attachment: boolean;
  attachment_url?: string;
  attachment_name?: string;
  created_at: string;
  edited: boolean;
}

export default function ChatContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowserClient();

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      if (data) setMessages(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[Chat]", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const subscribeToMessages = useCallback(() => {
    const channel = supabase
      .channel("admin-chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_chat_messages",
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    // Fetch current user email from session
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.email) setCurrentUser(data.email);
      })
      .catch(() => {
        // Fallback if session fetch fails
        setCurrentUser("unknown@portal-lusitano.pt");
      });

    loadMessages();
    subscribeToMessages();
  }, [loadMessages, subscribeToMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      // Extract mentions (@email)
      const mentions = Array.from(newMessage.matchAll(/@(\S+@\S+\.\S+)/g), (m) => m[1]);

      const { error } = await supabase.from("admin_chat_messages").insert({
        sender_email: currentUser,
        message: newMessage,
        mentions,
        has_attachment: false,
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[Chat]", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes < 1 ? "Agora" : `Há ${minutes}m`;
    }
    if (hours < 24) return `Há ${hours}h`;

    return date.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (email: string) => {
    const name = email.split("@")[0];
    return name
      .split(".")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const highlightMentions = (text: string): React.ReactNode[] => {
    const parts = text.split(/(@\S+@\S+\.\S+)/g);
    return parts.map((part, i) => {
      if (/^@\S+@\S+\.\S+$/.test(part)) {
        return (
          <span key={i} className="bg-[var(--gold)]/20 text-[var(--gold)] px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-white/5 to-white/10 border-b border-white/10 p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Hash className="w-5 h-5 text-[var(--gold)]" />
            Chat Interno
          </h1>
          <p className="text-sm text-gray-400">Equipa Portal Lusitano</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/5 rounded-lg transition-all">
            <Search className="w-5 h-5 text-gray-400" />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-all">
            <Users className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-[var(--background)] via-[var(--background-secondary)] to-[var(--background)]">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-[var(--gold)] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-400 text-sm">A carregar mensagens...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p className="mb-2">Nenhuma mensagem ainda</p>
            <p className="text-sm">Começa a conversa! 👋</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.sender_email === currentUser;
            const showAvatar = index === 0 || messages[index - 1].sender_email !== msg.sender_email;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""} ${
                  !showAvatar ? "ml-11" : ""
                }`}
              >
                {showAvatar && (
                  <div
                    className={`w-8 h-8 rounded-full ${
                      isOwn ? "bg-[var(--gold)]" : "bg-gradient-to-br from-blue-500 to-purple-500"
                    } flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                  >
                    {getInitials(msg.sender_email)}
                  </div>
                )}

                <div className={`flex-1 ${isOwn ? "text-right" : ""}`}>
                  {showAvatar && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">
                        {msg.sender_email.split("@")[0]}
                      </span>
                      <span className="text-xs text-gray-500">{formatTime(msg.created_at)}</span>
                    </div>
                  )}

                  <div
                    className={`inline-block max-w-lg rounded-lg px-4 py-2 ${
                      isOwn
                        ? "bg-[var(--gold)] text-black"
                        : "bg-white/5 border border-white/10 text-white"
                    }`}
                  >
                    <p className="text-sm">{highlightMentions(msg.message)}</p>

                    {msg.has_attachment && msg.attachment_name && (
                      <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
                        <Paperclip className="w-3 h-3" />
                        <span>{msg.attachment_name}</span>
                      </div>
                    )}

                    {msg.edited && <span className="text-xs opacity-60 ml-2">(editado)</span>}
                  </div>
                </div>

                {showAvatar && (
                  <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded transition-all">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-gradient-to-r from-white/5 to-white/10 border-t border-white/10 p-4">
        <div className="bg-white/5 border border-white/10 rounded-lg flex items-center gap-2 px-4 py-2">
          <button className="p-2 hover:bg-white/5 rounded-lg transition-all">
            <Paperclip className="w-5 h-5 text-gray-400" />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Escreve uma mensagem... (@email para mencionar)"
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
          />

          <button className="p-2 hover:bg-white/5 rounded-lg transition-all">
            <Smile className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="p-2 bg-[var(--gold)] hover:bg-[var(--gold-hover)] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 text-black" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Usa <kbd className="px-1 py-0.5 bg-white/10 rounded text-xs">@email</kbd> para mencionar
          alguém
        </p>
      </div>
    </div>
  );
}
