import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, Radius } from "@/constants/colors";
import { Court, getSportColor } from "@/constants/data";
import { Typography } from "@/constants/typography";
import { LivePulse } from "./LivePulse";

interface CourtListItemProps {
  court: Court;
  onPress: (court: Court) => void;
  isCheckedIn?: boolean;
}

export function CourtListItem({ court, onPress, isCheckedIn }: CourtListItemProps) {
  const isActive = court.activeCount > 0;
  const sportColor = getSportColor(court.sport);

  return (
    <Pressable
      onPress={() => onPress(court)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      testID={`court-${court.id}`}
    >
      <View style={[styles.sportBar, { backgroundColor: sportColor }]} />
      <View style={styles.body}>
        <View style={styles.left}>
          <Text style={styles.name}>{court.name}</Text>
          <Text style={styles.meta}>{court.neighborhood} · {court.sport}</Text>
          <View style={styles.badges}>
            <Text style={styles.surface}>{court.surface}</Text>
            {isCheckedIn && (
              <View style={styles.checkedInBadge}>
                <Text style={styles.checkedInText}>HERE</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.right}>
          {isActive ? (
            <>
              <LivePulse size={5} color={Colors.accent} style={{ marginBottom: 4 }} />
              <Text style={styles.activeCount}>{court.activeCount}</Text>
              <Text style={styles.activeLabel}>PLAYING</Text>
            </>
          ) : (
            <Text style={styles.emptyLabel}>EMPTY</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    marginHorizontal: 16,
    marginVertical: 2,
    overflow: "hidden",
  },
  pressed: { backgroundColor: Colors.surfaceHigh },
  sportBar: { width: 3 },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  left: { flex: 1 },
  name: {
    fontFamily: Typography.heading,
    fontSize: 17,
    color: Colors.text,
    letterSpacing: 0.2,
  },
  meta: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.muted,
    marginTop: 3,
  },
  badges: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 },
  surface: {
    fontFamily: Typography.bodyMedium,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  checkedInBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  checkedInText: {
    fontFamily: Typography.bodyBold,
    fontSize: 9,
    color: Colors.black,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
  right: { alignItems: "center", minWidth: 52 },
  activeCount: { fontFamily: Typography.heading, fontSize: 28, color: Colors.text, lineHeight: 30 },
  activeLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
  emptyLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: 9,
    color: Colors.mutedDark,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
});
