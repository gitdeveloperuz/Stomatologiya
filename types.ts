export interface Treatment {
  id: string;
  name: string;
  description: string;
  price: number; // In UZS
  recommended: boolean;
}

export interface CartItem extends Treatment {
  cartId: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}