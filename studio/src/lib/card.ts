import { buildCardHtml } from '../../shared/card.mjs';
import type { Appearance, CardItem } from './types';

export const SAMPLE_ITEM: CardItem = {
  quote: 'The secret of getting ahead is getting started.',
  author: 'Mark Twain',
  category: 'Motivation',
};

export function isDirectUrl(value: string) {
  return /^(data:|file:|ql:|https?:)/i.test(value);
}

export function displayImageUrl(value: string) {
  const image = String(value || '').trim();
  if (!image) return '';
  if (isDirectUrl(image)) return image;
  return `ql://local/${encodeURI(image.replace(/\\/g, '/'))}`;
}

export function buildPreviewHtml(item: CardItem, date: string, appearance: Appearance) {
  return buildCardHtml({
    width: 1920,
    height: 1080,
    item,
    date,
    appearance: {
      ...appearance,
      background: {
        ...appearance.background,
        image: displayImageUrl(appearance.background.image),
      },
    },
  });
}

export function buildExportPayload(item: CardItem, date: string, appearance: Appearance) {
  return {
    width: 1920,
    height: 1080,
    item,
    date,
    appearance: {
      ...appearance,
      background: { ...appearance.background },
    },
  };
}
