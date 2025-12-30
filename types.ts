
export interface Treatment {
  id: string;
  name: string;
  description: string;
  price: number; // In UZS
  recommended: boolean;
  imageUrl?: string; // Optional base64 string for custom uploaded images
}

export interface CartItem extends Treatment {
  cartId: string;
  quantity: number;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: number;
  read: boolean;
}

export interface ChatSession {
  id: string; // deviceId / localStorage Id
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  userName?: string; // Optional, derived from first message or cart
}
