import * as React from "react";
import Svg, { Path, Rect, Defs, LinearGradient, Stop, SvgProps } from "react-native-svg";

/**
 * GlassIcon — the single glass used by every quick-add tile in the Water
 * tracker (250 ml / 500 ml / 750 ml / 1 L).
 *
 * One static glass by design: the amount is carried by the label underneath,
 * not by the fill level. (The previous `GlassGlyph` varied its fill per tile,
 * which meant the four glasses differed but none of them matched a real
 * measure — 0.3 of a glass didn't mean 250 ml of anything.)
 *
 * Gradient id is prefixed `gi` because ids in react-native-svg are global to
 * the screen — a generic `paint0_linear` collides with any other SVG rendered
 * alongside it and silently steals its fill.
 */
const GlassIcon = (props: SvgProps) => (
  <Svg width={34} height={51} viewBox="0 0 40 60" fill="none" {...props}>
    <Defs>
      <LinearGradient id="giWater" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#8FCDF9" />
        <Stop offset="1" stopColor="#2E90FA" />
      </LinearGradient>
    </Defs>

    {/* Water sits behind the outline so the rim stays crisp over it. */}
    <Rect x={6} y={18} width={28} height={35} rx={3} fill="url(#giWater)" opacity={0.9} />

    {/* Tapered tumbler */}
    <Path
      d="M5 5h30l-3 46a4 4 0 0 1-4 3.6H12A4 4 0 0 1 8 51L5 5Z"
      stroke="#BBD9F2"
      strokeWidth={1.8}
      strokeLinejoin="round"
      fill="none"
    />

    {/* Surface line, so the water reads as liquid rather than a filled block */}
    <Path d="M6.6 18h26.8" stroke="#FFFFFF" strokeWidth={1.4} strokeOpacity={0.7} strokeLinecap="round" />
  </Svg>
);

export default GlassIcon;
