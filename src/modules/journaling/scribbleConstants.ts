// Shared drawing-canvas dimensions for the Scribble pad. Every place that
// renders a scribble's saved paths (the small AttachmentGrid tile, the
// full-screen preview modal, and the new inline block in JournalCanvas)
// must set its <Svg viewBox> to these same dimensions — the paths' x/y
// coordinates were recorded against this exact canvas size, so without a
// matching viewBox the SVG has no scaling info and just shows the raw
// pixels 1:1, clipping out almost the entire drawing in any smaller
// preview box instead of scaling it down to fit.
import { Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

export const SCRIBBLE_CANVAS_WIDTH = SW;
export const SCRIBBLE_CANVAS_HEIGHT = SH * 0.72;
export const SCRIBBLE_VIEW_BOX = `0 0 ${SCRIBBLE_CANVAS_WIDTH} ${SCRIBBLE_CANVAS_HEIGHT}`;
