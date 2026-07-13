import * as React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { SvgProps } from "react-native-svg";

const HomeIcon = (props: SvgProps) => {
  const width = typeof props.width === 'number' ? props.width : 51;
  const height = typeof props.height === 'number' ? props.height : 51;
  return (
    <Image
      source={require("./HomeIcon.png")}
      style={[{ width, height }, props.style as StyleProp<ImageStyle>]}
      resizeMode="stretch"
    />
  );
};
export default HomeIcon;
