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