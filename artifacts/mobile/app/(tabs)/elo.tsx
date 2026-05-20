import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MatchRow } from "@/components/MatchRow";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Colors } from "@/constants/colors";
import { getTierColor } from "@/constants/data";
import { Typography } from "@/constants/typography";
import { useApp } from "@/context/AppContext";

export default function EloScreen() {
  const { currentUser, matches } = useApp();
  const { top } = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : top;

  const [displayElo, setDisplayElo] = useState(currentUser.elo - 80);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const target = currentUser.elo;
    const start = target - 80;
    const duration = 900;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayElo(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    Animated.timing(barAnim, { toValue: 1, duration: 1000, delay: 200, useNativeDriver: false }).start();
  }, [currentUser.elo]);

  const tierColor = getTierColor(currentUser.tier);
  const total = currentUser.wins + currentUser.losses;
  const winRate = total > 0 ? Math.round((currentUser.wins / total) * 100) : 0;
  const isUnranked = total < 5;

  const tierRanges: Record<string, [number, number]> = {
    BRONZE: [0, 1499], SILVER: [1500, 1699], GOLD: [1700, 1899], PLATINUM: [1900, 2200],
  };
  const [tierMin, tierMax] = tierRanges[currentUser.tier] ?? [0, 2200];
  const tierPct = Math.min(1, Math.max(0, (currentUser.elo - tierMin) / (tierMax - tierMin)));
  const tierBarWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${tierPct * 100}%`] });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 : 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { paddingTop: topPad + 16 }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>ELO RANK</Text>
            <Text style={styles.heroName}>{currentUser.name.toUpperCase()}</Text>
          </View>
          <PlayerAvatar initials={currentUser.avatar} size={52} />
        </View>

        {isUnranked ? (
          <View style={styles.unranked}>
            <Text style={styles.unrankedNum}>—</Text>
            <Text style={styles.unrankedText}>UNRANKED</Text>
            <Text style={styles.unrankedSub}>PLAY {5 - total} MORE GAMES TO RANK</Text>
          </View>
        ) : (
          <>
            <View style={styles.eloRow}>
              <Text style={styles.eloNumber}>{displayElo}</Text>
              <View style={styles.tierPill}>
                <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
                <Text style={[styles.tierLabel, { color: tierColor }]}>{currentUser.tier}</Text>
              </View>
            </View>
            <View style={styles.tierBarTrack}>
              <Animated.View style={[styles.tierBarFill, { width: tierBarWidth, backgroundColor: tierColor }]} />
            </View>
            <View style={styles.tierBarLabels}>
              <Text style={styles.tierBarMin}>{tierMin}</Text>
              <Text style={styles.tierBarMax}>{tierMax}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCell}>
          <Text style={[styles.statVal, { color: Colors.win }]}>W {currentUser.wins}</Text>
          <Text style={styles.statLbl}>WINS</Text>
        </View>
        <View style={[styles.statCell, styles.statCellBorder]}>
          <Text style={[styles.statVal, { color: Colors.loss }]}>L {currentUser.losses}</Text>
          <Text style={styles.statLbl}>LOSSES</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statVal}>{winRate}%</Text>
          <Text style={styles.statLbl}>WIN RATE</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCell}>
          <Text style={styles.statVal}>{currentUser.checkIns}</Text>
          <Text style={styles.statLbl}>CHECK-INS</Text>
        </View>
        <View style={[styles.statCell, styles.statCellBorder]}>
          <Text style={styles.statVal}>{total}</Text>
          <Text style={styles.statLbl}>GAMES</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={[styles.statVal, { color: tierColor }]}>{currentUser.tier}</Text>
          <Text style={styles.statLbl}>TIER</Text>
        </View>
      </View>

      <View style={styles.matchSection}>
        <Text style={styles.matchTitle}>RECENT MATCHES</Text>
        {matches.length === 0 ? (
          <Text style={styles.noMatch}>NO MATCHES YET. FIND A RUN.</Text>
        ) : (
          matches.slice(0, 10).map((m) => <MatchRow key={m.id} match={m} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    paddingHorizontal: 20, paddingBottom: 20,
    backgroundColor: Colors.black,
    borderBottomWidth: 0,
  },
  heroTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 20,
  },
  heroLabel: {
    fontFamily: Typography.bodyMedium, fontSize: 10, color: Colors.mutedDark,
    letterSpacing: 3, textTransform: "uppercase" as const,
  },
  heroName: { fontFamily: Typography.heading, fontSize: 22, color: Colors.white, letterSpacing: 1 },
  eloRow: { flexDirection: "row", alignItems: "flex-end", gap: 16, marginBottom: 14 },
  eloNumber: {
    fontFamily: Typography.heading,
    fontSize: Platform.OS === "web" ? 80 : 88,
    color: Colors.white,
    lineHeight: Platform.OS === "web" ? 82 : 90,
    letterSpacing: -2,
  },
  tierPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5,
    borderColor: Colors.border, marginBottom: 8,
  },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierLabel: { fontFamily: Typography.heading, fontSize: 13, letterSpacing: 2 },
  tierBarTrack: { height: 3, backgroundColor: Colors.border, marginBottom: 6 },
  tierBarFill: { height: 3 },
  tierBarLabels: { flexDirection: "row", justifyContent: "space-between" },
  tierBarMin: { fontFamily: Typography.bodyMedium, fontSize: 9, color: Colors.mutedDark, letterSpacing: 1 },
  tierBarMax: { fontFamily: Typography.bodyMedium, fontSize: 9, color: Colors.mutedDark, letterSpacing: 1 },
  unranked: { paddingVertical: 20 },
  unrankedNum: { fontFamily: Typography.heading, fontSize: 96, color: Colors.mutedDark, lineHeight: 88 },
  unrankedText: { fontFamily: Typography.heading, fontSize: 32, color: Colors.white, letterSpacing: 2 },
  unrankedSub: {
    fontFamily: Typography.bodyMedium, fontSize: 11, color: Colors.mutedDark,
    letterSpacing: 2, textTransform: "uppercase" as const, marginTop: 6,
  },
  statsGrid: {
    flexDirection: "row",
    borderBottomWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  statCell: { flex: 1, alignItems: "center", paddingVertical: 18 },
  statCellBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statVal: { fontFamily: Typography.heading, fontSize: 26, color: Colors.text, letterSpacing: 0.5 },
  statLbl: {
    fontFamily: Typography.bodyMedium, fontSize: 9, color: Colors.muted,
    letterSpacing: 2, textTransform: "uppercase" as const, marginTop: 3,
  },
  matchSection: { paddingHorizontal: 20, paddingTop: 20 },
  matchTitle: {
    fontFamily: Typography.heading, fontSize: 16, color: Colors.text,
    letterSpacing: 3, marginBottom: 4, textTransform: "uppercase" as const,
    borderBottomWidth: 1, borderColor: Colors.border, paddingBottom: 10,
  },
  noMatch: {
    fontFamily: Typography.bodyMedium, fontSize: 12, color: Colors.muted,
    letterSpacing: 2, textTransform: "uppercase" as const, paddingVertical: 24,
  },
});
