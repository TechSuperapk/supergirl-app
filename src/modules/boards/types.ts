export type BoardType =
  | 'vision' | 'achievement' | 'mood' | 'travel' | 'personal' | 'custom';

export type ElementType = 'image' | 'text' | 'sticker' | 'shape';

export interface BoardElement {
  id:        string;
  type:      ElementType;
  x:         number;
  y:         number;
  width:     number;
  height:    number;
  rotation:  number;
  zIndex:    number;
  // type-specific
  imageUri?:  string;
  text?:      string;
  fontSize?:  number;
  fontFamily?: string;
  color?:     string;
  bgColor?:   string;
  emoji?:     string;
  opacity?:   number;
}

export interface Board {
  id:          string;
  userId:      string;
  title:       string;
  type:        BoardType;
  thumbnail?:  string;
  elements:    BoardElement[];
  isPublic:    boolean;
  bgColor:     string;
  createdAt:   string;
  updatedAt:   string;
}
