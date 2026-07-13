import * as React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { SvgProps } from "react-native-svg";

const CalenderTopLogo = (props: SvgProps) => {
  const width = typeof props.width === 'number' ? props.width : 24;
  const height = typeof props.height === 'number' ? props.height : 26;
  return (
    <Image
      source={require("./CalenderTopLogo.png")}
      style={[{ width, height }, props.style as StyleProp<ImageStyle>]}
      resizeMode="stretch"
    />
  );
};
export default CalenderTopLogo;
