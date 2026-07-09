// attachmentOrder — merges photos/videos/scribbles into one chronologically
// ordered list instead of two separate "always media, then scribbles"
// sections, so attachments show up in the order they were actually placed.
import { ScribblePage } from './types';

export type AttachmentRef =
  | { kind: 'image';    uri: string }
  | { kind: 'video';    uri: string }
  | { kind: 'scribble'; page: ScribblePage };

export const isVideoUri = (u: string) =>
  ['.mp4', '.mov', '.avi', '.mkv'].some(x => u.toLowerCase().endsWith(x)) || u.includes('video');

// `order` is a token list recorded at the moment each item was added:
// `media:<uri>` or `scribble:<pageId>`. When present it's authoritative;
// entries saved before this existed have no order info, so we fall back to
// the old grouping (all media, then all scribbles).
export function mergeAttachments(media: string[], scribblePages: ScribblePage[], order?: string[]): AttachmentRef[] {
  if (!order || order.length === 0) {
    return [
      ...media.map(uri => (isVideoUri(uri) ? { kind: 'video' as const, uri } : { kind: 'image' as const, uri })),
      ...scribblePages.map(page => ({ kind: 'scribble' as const, page })),
    ];
  }

  const out: AttachmentRef[] = [];
  for (const tok of order) {
    if (tok.startsWith('media:')) {
      const uri = tok.slice('media:'.length);
      if (media.includes(uri)) out.push(isVideoUri(uri) ? { kind: 'video', uri } : { kind: 'image', uri });
    } else if (tok.startsWith('scribble:')) {
      const id = tok.slice('scribble:'.length);
      const page = scribblePages.find(p => p.id === id);
      if (page) out.push({ kind: 'scribble', page });
    }
  }
  // Anything missing from `order` (e.g. added by an older code path) still
  // shows, appended at the end so nothing silently disappears.
  const seenUris  = new Set(out.filter((a): a is { kind: 'image' | 'video'; uri: string } => a.kind !== 'scribble').map(a => a.uri));
  const seenPages = new Set(out.filter((a): a is { kind: 'scribble'; page: ScribblePage } => a.kind === 'scribble').map(a => a.page.id));
  media.forEach(uri => { if (!seenUris.has(uri)) out.push(isVideoUri(uri) ? { kind: 'video', uri } : { kind: 'image', uri }); });
  scribblePages.forEach(page => { if (!seenPages.has(page.id)) out.push({ kind: 'scribble', page }); });
  return out;
}
