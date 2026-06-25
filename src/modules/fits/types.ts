export type ClothingCategory =
  | 'tops' | 'bottoms' | 'dresses' | 'jackets'
  | 'shoes' | 'accessories' | 'watches' | 'bags';

export interface ClothingItem {
  id:          string;
  userId:      string;
  name:        string;
  category:    ClothingCategory;
  colorTags:   string[];
  brand?:      string;
  imageUri:    string;       // local or remote
  s3Key?:      string;
  notes?:      string;
  isFavourite: boolean;
  createdAt:   string;
}

export interface Outfit {
  id:             string;
  userId:         string;
  name:           string;
  clothingItemIds: string[];
  tags:           string[];
  notes?:         string;
  season?:        'spring' | 'summer' | 'autumn' | 'winter' | 'all';
  occasion?:      string;
  isFavourite:    boolean;
  createdAt:      string;
}

export interface PlannerEntry {
  date:     string;         // ISO date YYYY-MM-DD
  outfitId: string | null;
  notes?:   string;
}

export interface AISuggestion {
  id:             string;
  outfitItemIds:  string[];
  reason:         string;
  occasion?:      string;
  generatedAt:    string;
}

export type SkinTone = 'fair' | 'light' | 'medium' | 'tan' | 'dark' | 'deep';
export type BodyShape = 'hourglass' | 'pear' | 'apple' | 'rectangle' | 'inverted_triangle';
export type HairStyle = 'straight' | 'wavy' | 'curly' | 'short' | 'long' | 'updo';

export interface AvatarConfig {
  skinTone:   SkinTone;
  hairStyle:  HairStyle;
  hairColor:  string;
  bodyShape:  BodyShape;
  eyeColor:   string;
  accessories: string[];
}
