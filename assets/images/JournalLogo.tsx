import * as React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { SvgProps } from "react-native-svg";

const JournalLogo = (props: SvgProps) => {
  const width = typeof props.width === 'number' ? props.width : 40;
  const height = typeof props.height === 'number' ? props.height : 40;
  return (
    <Image
      source={require("./JournalLogo.png")}
      style={[{ width, height }, props.style as StyleProp<ImageStyle>]}
      resizeMode="stretch"
    />
  );
};
export default JournalLogo;
