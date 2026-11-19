/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { socket } from "../service/gatway";
import { OrderService } from "../service/order.service";
import { getGuestOrderToken } from "../utils/guestOrderStorage";
import type { ChatMessageResponseDto } from "../dtos/response/chat-message-response.dto";
import { MessageSquare } from "lucide-react";
import { toast, ToastContainer, type ToastOptions } from "react-toastify";
import {
  playNotificationSound,
  unlockNotificationSound,
} from "../utils/notificationSound";

const MESSAGE_TOAST_ID = "site-new-message";
const MESSAGE_TOAST_CONTAINER_ID = "site-message-notifications";

type MessageNotification = {
  id: string;
  orderId: string;
  orderCode: number;
  text: string;
  createdAt: string;
  read: boolean;
};
type MessageNotificationsValue = {
  notifications: MessageNotification[];
  unreadCount: number;
  markRead: (orderId: string, messageIds: string[]) => void;
  clearAll: () => void;
};
const MessageNotificationsContext =
  createContext<MessageNotificationsValue | null>(null);

function readNotifications(
  storage: Storage,
  key: string,
): MessageNotification[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item: unknown): item is MessageNotification => {
      if (!item || typeof item !== "object") return false;
      return (
        "id" in item &&
        typeof item.id === "string" &&
        "orderId" in item &&
        typeof item.orderId === "string" &&
        "orderCode" in item &&
        typeof item.orderCode === "number" &&
        "text" in item &&
        typeof item.text === "string" &&
        "createdAt" in item &&
        typeof item.createdAt === "string" &&
        !Number.isNaN(Date.parse(item.createdAt)) &&
        "read" in item &&
        typeof item.read === "boolean"
      );
    });
  } catch (error) {
    console.error("Erro ao carregar mensagens salvas:", error);
    return [];
  }
}

export function MessageNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const userId = isAuthenticated ? localStorage.getItem("userId") : null;
  const owner = userId || "guest";
  return (
    <MessageSession key={owner} owner={owner} userId={userId} loading={loading}>
      {children}
    </MessageSession>
  );
}

function MessageSession({
  owner,
  userId,
  loading,
  children,
}: {
  owner: string;
  userId: string | null;
  loading: boolean;
  children: ReactNode;
}) {
  const storage = userId ? localStorage : sessionStorage;
  const key = `mb_message_notifications:${owner}`;
  const [notifications, setNotifications] = useState(() =>
    readNotifications(storage, key),
  );

  useEffect(() => {
    const unlockSound = () => {
      void unlockNotificationSound();
    };
    window.addEventListener("pointerdown", unlockSound, { once: true });
    window.addEventListener("keydown", unlockSound, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    try {
      if (notifications.length)
        storage.setItem(key, JSON.stringify(notifications));
      else storage.removeItem(key);
    } catch (error) {
      console.error("Erro ao salvar notificações de mensagens:", error);
    }
  }, [notifications, storage, key, loading]);

  useEffect(() => {
    if (loading) return;
    let active = true;
    const pendingIds = new Set<string>();
    const knownMessageIds = new Set(
      readNotifications(storage, key).map((message) => message.id),
    );
    async function handleMessage(event: {
      orderId: string;
      message: ChatMessageResponseDto;
    }) {
      const message = event?.message;
      if (!event?.orderId || !message?.id || message.senderType !== "ADMIN")
        return;
      if (!userId && !getGuestOrderToken(event.orderId)) return;
      if (knownMessageIds.has(message.id) || pendingIds.has(message.id)) return;
      pendingIds.add(message.id);
      try {
        const order = await OrderService.findById(event.orderId);
        if (!active || (userId && order.userId !== userId)) return;
        knownMessageIds.add(message.id);
        setNotifications((current) => {
          if (current.some((item) => item.id === message.id)) return current;
          return [
            {
              id: message.id,
              orderId: order.id,
              orderCode: order.code,
              text: message.text,
              createdAt: message.createdAt,
              read: false,
            },
            ...current,
          ];
        });
        void playNotificationSound();

        const toastOptions: ToastOptions = {
          containerId: MESSAGE_TOAST_CONTAINER_ID,
          toastId: MESSAGE_TOAST_ID,
          autoClose: 3000,
          hideProgressBar: true,
          closeButton: false,
          closeOnClick: true,
          pauseOnHover: false,
          pauseOnFocusLoss: false,
          icon: (
            <MessageSquare
              size={18}
              aria-hidden="true"
              color="var(--highlight)"
            />
          ),
        };
        if (toast.isActive(MESSAGE_TOAST_ID, MESSAGE_TOAST_CONTAINER_ID)) {
          toast.update(MESSAGE_TOAST_ID, {
            ...toastOptions,
            render: "Nova mensagem!",
          });
        } else {
          toast.info("Nova mensagem!", toastOptions);
        }
      } catch (error) {
        console.error(
          "Não foi possível verificar a mensagem do pedido:",
          error,
        );
      } finally {
        pendingIds.delete(message.id);
      }
    }
    socket.on("message.created", handleMessage);
    return () => {
      active = false;
      socket.off("message.created", handleMessage);
      toast.dismiss(MESSAGE_TOAST_ID);
    };
  }, [loading, userId, storage, key]);

  const markRead = useCallback((orderId: string, messageIds: string[]) => {
    const ids = new Set(messageIds);
    setNotifications((current) => {
      if (
        !current.some(
          (item) => item.orderId === orderId && ids.has(item.id) && !item.read,
        )
      )
        return current;
      return current.map((item) =>
        item.orderId === orderId && ids.has(item.id)
          ? { ...item, read: true }
          : item,
      );
    });
  }, []);
  const clearAll = useCallback(() => setNotifications([]), []);
  return (
    <MessageNotificationsContext.Provider
      value={{
        notifications,
        unreadCount: notifications.filter((item) => !item.read).length,
        markRead,
        clearAll,
      }}
    >
      <ToastContainer
        containerId={MESSAGE_TOAST_CONTAINER_ID}
        position="top-right"
        limit={1}
        style={{ width: "min(220px, calc(100vw - 24px))" }}
        toastStyle={{
          minHeight: 42,
          padding: "8px 12px",
          fontSize: 13,
          fontFamily: "inherit",
          borderRadius: 8,
          boxShadow: "none",
          border: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
        }}
      />
      {children}
    </MessageNotificationsContext.Provider>
  );
}

export function useMessageNotifications() {
  const context = useContext(MessageNotificationsContext);
  if (!context)
    throw new Error("Use mensagens dentro de MessageNotificationsProvider");
  return context;
}
