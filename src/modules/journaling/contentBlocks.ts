// contentBlocks — helpers for the ordered text/image block model that backs
// the WYSIWYG body (see ContentBlock in types.ts). Centralised here so both
// GuidedEntryScreen (editable) and EntryDetailScreen (read-only) build the
// exact same block sequence from an entry, and derive the exact same flat
// `body` string for hashtag detection / list-card previews / search.
import { ContentBlock, JournalEntry, ImagePlacement } from './types';

const gid = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

type SourceEntry = Pick<Partial<JournalEntry>, 'body' | 'contentBlocks' | 'imagePlacements'>;

// Build the ordered blocks to start editing/viewing an entry with. Prefers
// the new `contentBlocks` field; falls back to migrating `body` + any
// legacy freeform `imagePlacements` (in their saved order) into one text
// block followed by an image block per placement, so nothing from before
// inline images existed is lost — it just loses its old x/y position and
// lands at the end of the text instead.
export function blocksFromEntry(entry?: SourceEntry): ContentBlock[] {
  if (entry?.contentBlocks?.length) return entry.contentBlocks;
  const blocks: ContentBlock[] = [{ id: gid(), type: 'text', text: entry?.body ?? '' }];
  (entry?.imagePlacements ?? []).forEach((ip: ImagePlacement) => {
    blocks.push({ id: gid(), type: 'image', uri: ip.uri, isVideo: ip.isVideo });
    blocks.push({ id: gid(), type: 'text', text: '' });
  });
  return blocks;
}

// Flatten every text block's content (in reading order) into one plain
// string — this is what's saved as `entry.body`, so hashtag detection, the
// Recent Journal card preview, and search all keep working unchanged
// without needing to know blocks exist.
export function bodyFromBlocks(blocks: ContentBlock[]): string {
  return blocks
    .filter(b => b.type === 'text' && (b.text ?? '').trim().length > 0)
    .map(b => b.text!.trim())
    .join('\n\n');
}

export function newTextBlock(text = ''): ContentBlock {
  return { id: gid(), type: 'text', text };
}

export function newImageBlock(uri: string, isVideo?: boolean): ContentBlock {
  return { id: gid(), type: 'image', uri, isVideo };
}

export function newScribbleBlock(pageId: string): ContentBlock {
  return { id: gid(), type: 'scribble', pageId };
}
