"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { requestNotificationPermission, notifyNewMessage } from "@/lib/notifications";

interface NotificationBadgeProps {
  refreshInterval?: number;
}

export default function NotificationBadge({ refreshInterval = 30000 }: NotificationBadgeProps) {
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousCount = useRef(0);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const triggerAnimation = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  }, []);

  const checkNewMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/messages/stats");
      if (!res.ok) return;

      const data = await res.json();
      const count = data.stats?.novo || 0;

      if (count > previousCount.current) {
        playNotificationSound();
        triggerAnimation();

        if (pushEnabled && data.latestMessage) {
          notifyNewMessage({
            name: data.latestMessage.name,
            type: data.latestMessage.form_type,
            id: data.latestMessage.id,
          });
        }
      }

      previousCount.current = count;
      setNewMessagesCount(count);
    } catch {
      // Silently fail on message check
    }
  }, [pushEnabled, playNotificationSound, triggerAnimation]);

  useEffect(() => {
    audioRef.current = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSaHzPLTgjMGHm7A7+OZTA8PVqnk77BeDwtJouHyvmwgBSaHzPLVgC8GHm/A7+OZTA8OVqrk77BeDwtIouDyv2wgBSWGy/LWhC8GHnDB7+OZTA8OVqrk77BfDgtIot/yvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDgtIouDyvmwgBSaGy/LWgy8GHnDB7+OYSA8OVqrk77BfDg=="
    );

    requestNotificationPermission().then((granted) => {
      setPushEnabled(granted);
    });

    const initialTimeout = setTimeout(checkNewMessages, 0);
    const interval = setInterval(checkNewMessages, refreshInterval);

    // Service worker message handler — named for proper cleanup
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "notification-click") {
        window.focus();
        window.location.href = event.data.url || "/admin/mensagens";
      }
    };

    if ("Notification" in window) {
      navigator.serviceWorker?.ready.then(() => {
        navigator.serviceWorker.addEventListener("message", handleSwMessage);
      });
    }

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      navigator.serviceWorker?.removeEventListener("message", handleSwMessage);
    };
  }, [refreshInterval, checkNewMessages]);

  return (
    <div className="relative">
      <Link
        href="/admin/mensagens"
        className={`relative p-2 rounded-lg transition-all block ${
          isAnimating ? "bg-[var(--foreground-strong)] scale-110" : "bg-white/5 hover:bg-white/10"
        }`}
      >
        <Bell
          size={20}
          className={`${
            newMessagesCount > 0 ? "text-[var(--foreground-muted)]" : "text-gray-400"
          } ${isAnimating ? "animate-bounce" : ""}`}
        />

        {newMessagesCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {newMessagesCount > 9 ? "9+" : newMessagesCount}
          </span>
        )}
      </Link>

      {pushEnabled && (
        <div
          className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--background-secondary)]"
          title="Push notifications ativadas"
        />
      )}
    </div>
  );
}
