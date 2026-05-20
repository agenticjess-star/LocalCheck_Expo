import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

interface PlayerAvatarProps {
  initials: string;
  size?: number;
  style?: ViewStyle;
  invert?: boolean;
  accent?: boolean;
}

export function PlayerAvatar({ initials, size = 40, style, invert = false, accent = false }: PlayerAvatarProps) {
  const bg = accent ? Colors.accent : invert ? Colors.surfaceHigh : Colors.surfaceHigh;
  const textColor = accent ? Colors.black : Colors.text;
  const radius = Math.round(size * 0.18);

  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor: bg, borderRadius: radius }, style]}>
      <Text style={[styles.initials, { fontSize: size * 0.33, color: textColor }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: Typography.heading,
    letterSpacing: 0.5,
  },
});
