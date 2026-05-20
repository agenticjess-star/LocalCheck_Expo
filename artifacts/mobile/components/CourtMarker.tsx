import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

interface CourtMarkerProps {
  count: number;
  active: boolean;
  selected?: boolean;
  hasFriends?: boolean;
}

export function CourtMarker({ count, active, selected, hasFriends }: CourtMarkerProps) {
  return (
    <View style={[styles.container, selected && styles.selected]}>
      {hasFriends && <View style={styles.friendDot} />}
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.label}>{active ? "ON COURT" : "EMPTY"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.black,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    alignItems: "center",
    minWidth: 64,
    position: "relative",
  },
  selected: {
    backgroundColor: Colors.accent,
  },
  friendDot: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  count: {
    fontFamily: Typography.heading,
    fontSize: 18,
    color: Colors.white,
    lineHeight: 20,
  },
  label: {
    fontFamily: Typography.bodyMedium,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
});
