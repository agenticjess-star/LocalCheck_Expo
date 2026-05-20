import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LivePulse } from "@/components/LivePulse";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Colors } from "@/constants/colors";
import { CourtSport, Player, SAMPLE_PLAYERS, getSportColor, getTierColor } from "@/constants/data";
import { Typography } from "@/constants/typography";
import { useApp } from "@/context/AppContext";

const SPORT_TABS: (CourtSport | "ALL")[] = ["ALL", "BASKETBALL", "PICKLEBALL"];

export default function ExploreScreen() {
  const { courts } = useApp();
  const { top } = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : top;
  const [sportTab, setSportTab] = useState<CourtSport | "ALL">("ALL");

  const nearbyCourts = courts.filter((c) => sportTab === "ALL" || c.sport === sportTab);
  const activeCourts = nearbyCourts.filter((c) => c.activeCount > 0);
  const emptyCourts = nearbyCourts.filter((c) => c.activeCount === 0);

  const leaderboard = [...SAMPLE_PLAYERS]
    .filter((p) => sportTab === "ALL" || p.sport === sportTab)
    .sort((a, b) => b.elo - a.elo);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 : 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={styles.headerTitle}>EXPLORE</Text>
        <Text style={styles.headerSub}>COURTS + RANKINGS</Text>
        <View style={styles.tabs}>
          {SPORT_TABS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setSportTab(t)}
              style={[styles.tab, sportTab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, sportTab === t && styles.tabTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {activeCourts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>LIVE NEAR YOU</Text>
            <LivePulse size={5} color={Colors.accent} />
          </View>
          {activeCourts.map((court) => {
            const sportColor = getSportColor(court.sport);
            return (
              <Pressable
                key={court.id}
                style={({ pressed }) => [styles.courtRow, pressed && styles.pressed]}
                onPress={() => router.push(`/court/${court.id}`)}
              >
                <View style={[styles.courtSportBar, { backgroundColor: sportColor }]} />
                <View style={styles.courtRowBody}>
                  <View style={styles.courtRowLeft}>
                    <Text style={styles.courtName}>{court.name.toUpperCase()}</Text>
                    <Text style={styles.courtMeta}>{court.sport} · {court.neighborhood}</Text>
                  </View>
                  <View style={styles.courtCountBlock}>
                    <Text style={styles.courtCount}>{court.activeCount}</Text>
                    <Text style={styles.courtCountLabel}>PLAYING</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {emptyCourts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>NEARBY COURTS</Text>
          </View>
          {emptyCourts.map((court) => {
            const sportColor = getSportColor(court.sport);
            return (
              <Pressable
                key={court.id}
                style={({ pressed }) => [styles.courtRow, pressed && styles.pressed]}
                onPress={() => router.push(`/court/${court.id}`)}
              >
                <View style={[styles.courtSportBar, { backgroundColor: sportColor, opacity: 0.4 }]} />
                <View style={styles.courtRowBody}>
                  <View style={styles.courtRowLeft}>
                    <Text style={styles.courtName}>{court.name.toUpperCase()}</Text>
                    <Text style={styles.courtMeta}>{court.sport} · {court.neighborhood}</Text>
                  </View>
                  <Text style={styles.emptyLabel}>EMPTY</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LEADERBOARD</Text>
        </View>
        {leaderboard.map((player, index) => (
          <LeaderRow key={player.id} player={player} rank={index + 1} />
        ))}
      </View>
    </ScrollView>
  );
}

function LeaderRow({ player, rank }: { player: Player; rank: number }) {
  const tierColor = getTierColor(player.tier);
  const isTop = rank <= 3;
  return (
    <View style={[styles.leaderRow, rank === 1 && styles.leaderRowFirst]}>
      <Text style={[styles.rank, isTop && styles.rankTop]}>{rank}</Text>
      <PlayerAvatar initials={player.avatar} size={38} accent={rank === 1} />
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{player.name.toUpperCase()}</Text>
        <View style={styles.playerBadges}>
          <Text style={[styles.playerTier, { color: tierColor }]}>{player.tier}</Text>
          {player.sport && (
            <Text style={[styles.playerSport, { color: getSportColor(player.sport) }]}>{player.sport}</Text>
          )}
        </View>
      </View>
      <View style={styles.eloBlock}>
        <Text style={styles.playerElo}>{player.elo}</Text>
        <Text style={styles.playerEloLabel}>ELO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20, paddingBottom: 0,
    borderBottomWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerTitle: { fontFamily: Typography.heading, fontSize: 40, color: Colors.text, letterSpacing: 1.5 },
  headerSub: {
    fontFamily: Typography.bodyMedium, fontSize: 10, color: Colors.muted,
    letterSpacing: 3, textTransform: "uppercase" as const, marginTop: 1, marginBottom: 14,
  },
  tabs: { flexDirection: "row", marginBottom: -1 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderRightWidth: 1, borderColor: Colors.border,
  },
  tabActive: { borderBottomWidth: 3, borderBottomColor: Colors.accent },
  tabText: { fontFamily: Typography.heading, fontSize: 11, color: Colors.muted, letterSpacing: 1.5 },
  tabTextActive: { color: Colors.text },
  section: { paddingHorizontal: 20, paddingTop: 24, marginBottom: 8 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderBottomWidth: 1, borderColor: Colors.border,
    paddingBottom: 10, marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: Typography.heading, fontSize: 13, color: Colors.text,
    letterSpacing: 3, flex: 1, textTransform: "uppercase" as const,
  },
  courtRow: {
    flexDirection: "row", borderBottomWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  pressed: { backgroundColor: Colors.surfaceHigh },
  courtSportBar: { width: 3 },
  courtRowBody: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 14,
  },
  courtRowLeft: { flex: 1 },
  courtName: { fontFamily: Typography.heading, fontSize: 15, color: Colors.text, letterSpacing: 0.3 },
  courtMeta: { fontFamily: Typography.body, fontSize: 11, color: Colors.muted, marginTop: 2 },
  courtCountBlock: { alignItems: "center" },
  courtCount: { fontFamily: Typography.heading, fontSize: 24, color: Colors.text, lineHeight: 26 },
  courtCountLabel: {
    fontFamily: Typography.bodyMedium, fontSize: 8, color: Colors.muted,
    letterSpacing: 1.5, textTransform: "uppercase" as const,
  },
  emptyLabel: {
    fontFamily: Typography.bodyMedium, fontSize: 9, color: Colors.mutedDark,
    letterSpacing: 1.5, textTransform: "uppercase" as const,
  },
  leaderRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderColor: Colors.border,
  },
  leaderRowFirst: { backgroundColor: `${Colors.accent}0A` },
  rank: { fontFamily: Typography.heading, fontSize: 18, color: Colors.muted, width: 28, textAlign: "center" },
  rankTop: { color: Colors.text, fontSize: 22 },
  playerInfo: { flex: 1 },
  playerName: { fontFamily: Typography.heading, fontSize: 15, color: Colors.text, letterSpacing: 0.3 },
  playerBadges: { flexDirection: "row", gap: 8, marginTop: 2 },
  playerTier: {
    fontFamily: Typography.bodyBold, fontSize: 9,
    letterSpacing: 1.5, textTransform: "uppercase" as const,
  },
  playerSport: {
    fontFamily: Typography.bodyBold, fontSize: 9,
    letterSpacing: 1.5, textTransform: "uppercase" as const,
  },
  eloBlock: { alignItems: "flex-end" },
  playerElo: { fontFamily: Typography.heading, fontSize: 20, color: Colors.text },
  playerEloLabel: {
    fontFamily: Typography.bodyMedium, fontSize: 8, color: Colors.muted,
    letterSpacing: 2, textTransform: "uppercase" as const,
  },
});
