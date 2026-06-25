import { TextStyle } from 'react-native';
export const FontFamily = { regular:'DMSans-Regular', medium:'DMSans-Medium', bold:'DMSans-Bold', semiBold:'DMSans-Bold', light:'DMSans-Regular', extraLight:'DMSans-Regular', italic:'DMSans-Italic', boldItalic:'DMSans-Italic' } as const;
export const FontSize = { xs:11, sm:13, base:15, md:17, lg:20, xl:24, '2xl':28, '3xl':34, '4xl':40 } as const;
export const LineHeight = { tight:1.2, snug:1.35, normal:1.5, relaxed:1.65 } as const;
export const TextStyles = {
  displayLarge:  { fontFamily:'DMSans-Bold',    fontSize:34, lineHeight:41, letterSpacing:0.3 } as TextStyle,
  displayMedium: { fontFamily:'DMSans-Bold',    fontSize:28, lineHeight:38 } as TextStyle,
  headingLarge:  { fontFamily:'DMSans-Bold',    fontSize:24, lineHeight:32 } as TextStyle,
  headingMedium: { fontFamily:'DMSans-Bold',    fontSize:20, lineHeight:27 } as TextStyle,
  headingSmall:  { fontFamily:'DMSans-Bold',    fontSize:17, lineHeight:25 } as TextStyle,
  bodyLarge:     { fontFamily:'DMSans-Regular', fontSize:17, lineHeight:28 } as TextStyle,
  body:          { fontFamily:'DMSans-Regular', fontSize:15, lineHeight:24 } as TextStyle,
  bodySmall:     { fontFamily:'DMSans-Regular', fontSize:13, lineHeight:19 } as TextStyle,
  caption:       { fontFamily:'DMSans-Regular', fontSize:11, lineHeight:16, letterSpacing:0.2 } as TextStyle,
  label:         { fontFamily:'DMSans-Medium',  fontSize:13, lineHeight:19, letterSpacing:0.3 } as TextStyle,
  button:        { fontFamily:'DMSans-Bold',    fontSize:15, letterSpacing:0.3 } as TextStyle,
  tabLabel:      { fontFamily:'DMSans-Regular', fontSize:11, marginTop:2 } as TextStyle,
} as const;
