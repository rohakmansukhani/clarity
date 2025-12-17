import { create } from 'zustand';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface UIStore {
    isQuickChatOpen: boolean;
    quickChatMessages: Message[];
    initialQuery: string | null;
    interactionCount: number;

    openQuickChat: (query?: string) => void;
    closeQuickChat: () => void;
    addMessage: (msg: Message) => void;
    incrementInteraction: () => void;
    resetQuickChat: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
    isQuickChatOpen: false,
    quickChatMessages: [],
    initialQuery: null,
    interactionCount: 0,

    openQuickChat: (query) => set({
        isQuickChatOpen: true,
        initialQuery: query || null
    }),
    closeQuickChat: () => set({ isQuickChatOpen: false }),
    addMessage: (msg) => set((state) => ({ quickChatMessages: [...state.quickChatMessages, msg] })),
    incrementInteraction: () => set((state) => ({ interactionCount: state.interactionCount + 1 })),
    resetQuickChat: () => set({
        isQuickChatOpen: false,
        quickChatMessages: [],
        interactionCount: 0,
        initialQuery: null
    })
}));
