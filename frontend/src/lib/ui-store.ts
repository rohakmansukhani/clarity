import { create } from 'zustand';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    suggest_switch?: {
        to: 'advisor' | 'discovery_hub';
        reason: string;
        original_query?: string;
    };
}

interface UIStore {
    isQuickChatOpen: boolean;
    quickChatMessages: Message[];
    initialQuery: string | null;
    interactionCount: number;
    quickSessionId: string | null; // ID of the backend session for Quick Chat

    isSidebarOpen: boolean;
    openSidebar: () => void;
    closeSidebar: () => void;
    toggleSidebar: () => void;

    openQuickChat: (query?: string) => void;
    closeQuickChat: () => void;
    addMessage: (msg: Message) => void;
    incrementInteraction: () => void;
    setQuickSessionId: (id: string | null) => void;
    resetQuickChat: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
    isQuickChatOpen: false,
    quickChatMessages: [],
    initialQuery: null,
    interactionCount: 0,
    quickSessionId: null,
    isSidebarOpen: true, // Default open

    openSidebar: () => set({ isSidebarOpen: true }),
    closeSidebar: () => set({ isSidebarOpen: false }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    openQuickChat: (query) => set({
        isQuickChatOpen: true,
        initialQuery: query || null
    }),
    closeQuickChat: () => set({ isQuickChatOpen: false }),
    addMessage: (msg) => set((state) => ({ quickChatMessages: [...state.quickChatMessages, msg] })),
    incrementInteraction: () => set((state) => ({ interactionCount: state.interactionCount + 1 })),
    setQuickSessionId: (id) => set({ quickSessionId: id }),
    resetQuickChat: () => set({
        isQuickChatOpen: false,
        quickChatMessages: [],
        interactionCount: 0,
        initialQuery: null,
        quickSessionId: null
    })
}));
