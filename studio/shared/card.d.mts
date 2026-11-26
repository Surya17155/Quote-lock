export interface CardPalette {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
}

export interface CardBackground {
  kind: 'solid' | 'gradient' | 'image';
  color: string;
  from: string;
  to: string;
  angle: number;
  image: string;
  blur: number;
  dim: number;
  position: string;
}

export interface CardAppearance {
  theme: 'dark' | 'light';
  preset: string;
  palette: CardPalette;
  background: CardBackground;
  layout: 'center' | 'left' | 'editorial' | 'minimal';
  frame: 'none' | 'hairline' | 'inset';
  texture: 'none' | 'grain' | 'vignette';
  showQuoteMarks: boolean;
  showRule: boolean;
  showFooter: boolean;
  fontFamily: string;
  fontScale: number;
  lineHeight: number;
}

export interface CardItem {
  quote: string;
  author: string;
  category: string;
}

export interface CardPayload {
  width?: number;
  height?: number;
  item: CardItem;
  date: string;
  dateText?: string;
  appearance?: Partial<CardAppearance>;
  edge?: string;
}

export declare const DEFAULT_APPEARANCE: CardAppearance;
export declare function buildCardHtml(input: CardPayload): string;
