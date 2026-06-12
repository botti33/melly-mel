export type BrushType = 'pencil' | 'pen' | 'watercolor' | 'sparkle' | 'stamp' | 'eraser' | 'quill' | 'marker' | 'glow' | 'spilled_ink';

export interface Point {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface Stroke {
  points: Point[];
  tool: BrushType;
  color: string;
  size: number;
  opacity: number;
  stampType?: string; // used for stamp emoji
}

export interface TextBlock {
  id: string;
  content: string; // rich HTML/Text snapshot
  font: 'serif' | 'sans' | 'mono' | 'handwritten';
  color: string;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface JournalPage {
  id: string;
  bookId: string;
  drawingDataUrl: string; // Transparent PNG of drawings
  strokeHistory: Stroke[]; // For memory replay construction
  textBlocks: TextBlock[]; // Embedded rich text blocks
  storyText?: string; // Optional plain text story fallback
  timestamp: number; // Page timestamp
  moodEmoji: string;
  paperTone: string; // natural | parchment | rose | sage | dusk
  createdAt: number;
  updatedAt: number;
}

export interface Book {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  lastModified: number;
  theme: {
    color: string; // hex cover color
    texture: 'parchment' | 'paper' | 'inkwash' | 'leather' | 'cardboard';
    styleId: string; // aesthetic style profile
  };
  pages: JournalPage[];
}

export interface StampConfig {
  id: string;
  emoji: string;
  label: string;
}

export const PLAYFUL_STAMPS: StampConfig[] = [
  { id: 'feather', emoji: '🪶', label: 'Quill Plume' },
  { id: 'key', emoji: '🗝️', label: 'Iron Key' },
  { id: 'fern', emoji: '🌿', label: 'Wild Fern' },
  { id: 'crest', emoji: '⚜️', label: 'Library Crest' },
  { id: 'moon_crest', emoji: '🌙', label: 'Crescent Arc' },
  { id: 'owl_study', emoji: '🦉', label: 'Biological Owl' },
  { id: 'compass', emoji: '🧭', label: 'Astro Compass' },
  { id: 'hour-glass', emoji: '⏳', label: 'Gilded Hourglass' },
];

export const PAPER_TONES = [
  { id: 'natural', name: 'Preserved Ivory', value: '#FAF7F0', text: 'text-stone-900', border: 'border-stone-300/40', accent: '#E3DFD4' },
  { id: 'parchment', name: 'Aged Vellum', value: '#ECDDB9', text: 'text-amber-950', border: 'border-amber-900/10', accent: '#D6C495' },
  { id: 'rose', name: 'Dried Carnation', value: '#F6EAE6', text: 'text-rose-950', border: 'border-rose-900/10', accent: '#ECD0C8' },
  { id: 'sage', name: 'Pressed Rosemary', value: '#E7ECE4', text: 'text-emerald-950', border: 'border-emerald-900/10', accent: '#C8D6C2' },
  { id: 'dusk', name: 'Midnight Obsidian', value: '#1C1917', text: 'text-amber-100', border: 'border-stone-800', accent: '#331B29' }
];

export const EMOTIONAL_MESSAGES = [
  "Unravel the threads of silence, Mel; the ink retains what the soul cannot hold. 🪶",
  "A sketch is a shadow cast by the light of a fleeting thought. Keep exploring. 🧭",
  "Amidst the dust and leather bindings, every quiet stroke of graphite leaves an eternal echo. 🏛️",
  "To preserve a memory is to let the quill dance with the ghosts of yesterday. 📜",
  "Even the finest ink will age, but the truth of the heart remains carved in fiber. 🗝️",
  "Rest here, Melly. The world moves too fast, but the vellum is patient. 🌿"
];
