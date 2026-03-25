import type { Message } from "@langchain/langgraph-sdk";

export interface ChatItem {
  id: string;
  title: string;
  timestamp?: Date;
  preview: string;
  messages: Message[];
}

export interface ChatState {
  chats: ChatItem[];
  isLoading: boolean;
  error: string | null;
}

export interface ChatActions {
  createNewChat: () => string;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, newTitle: string) => void;
  updateChatMessages: (chatId: string, messages: Message[]) => void;
  clearError: () => void;
  setError: (error: string) => void;
  getChatById: (chatId: string) => ChatItem | undefined;
}

export interface ChatContextType extends ChatState, ChatActions {}

export interface SidebarChatItem {
  id: string;
  title: string;
  timestamp: Date;
  preview: string;
}
