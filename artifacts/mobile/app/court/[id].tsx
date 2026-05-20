import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrutalistButton } from "@/components/BrutalistButton";
import { LivePulse } from "@/components/LivePulse";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RunCard } from "@/components/RunCard";
import { StatBlock } from "@/components/StatBlock";
import { Colors } from "@/constants/colors";
import { SAMPLE_PLAYERS, getSportColor } from "@/constants/data";
import { Typography } from "@/constants/typography";
import { useApp } from "@/context/AppContext";

export default function CourtProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { courts, runs, checkIn, checkOut, checkedInCourtId } = useApp();
  const { top, bottom } = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : top;

  const court = courts.find((c) => c.id === id);
  const courtRuns = runs.filter((r) => r.courtId === id);
  const isCheckedIn = checkedInCourtId === id;

  if (!court) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>COURT NOT FOUND</Text>
        <BrutalistButton label="GO BACK" onPress={() => router.back()} variant="outline" />
      </View>
    );
  }

  const sportColor = getSportColor(court.sport);
  const activePlayers = SAMPLE_PLAYERS.slice(0, court.activeCount);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : bottom) + 100 }}
      >
        <View style={styles.hero}>
          <Image
            source={require("@/assets/images/court-placeholder.png")}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay}>
            <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: topPad + 12 }]}>
              <Text style={styles.backText}>‹ BACK</Text>
            </Pressable>
            <View style={styles.heroBottom}>
              <View style={styles.heroMeta}>
                <View style={styles.sportTag}>
                  <View style={[styles.sportDot, { backgroundColor: sportColor }]} />
                  <Text style={styles.sportText}>{court.sport}</Text>
                </View>
                {court.activeCount > 0 && (
                  <View style={styles.liveChip}>
                    <LivePulse size={5} color={Colors.black} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.heroName}>{court.name.toUpperCase()}</Text>
              <Text style={styles.heroAddress}>{court.neighborhood} · {court.city}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsBar}>
          <StatBlock value={court.activeCount} label="On Court" />
          <View style={styles.statDiv} />
          <StatBlock value={court.maxCapacity} label="Max" />
          <View style={styles.statDiv} />
          <StatBlock value={`${court.rating} ★`} label={`${court.ratingCount} ratings`} />
          <View style={styles.statDiv} />
          <StatBlock value={court.surface} label="Surface" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LIVE ROSTER</Text>
          {activePlayers.length === 0 ? (
            <Text style={styles.emptyText}>NO PLAYERS CHECKED IN YET</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.rosterRow}>
                {activePlayers.map((player) => (
                  <View key={player.id} style={styles.rosterItem}>
                    <PlayerAvatar initials={player.avatar} size={44} />
                    <Text style={styles.rosterName}>{player.name.split(" ")[0].toUpperCase()}</Text>
                    <Text style={styles.rosterElo}>{player.elo}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPCOMING RUNS</Text>
          {courtRuns.length === 0 ? (
            <View style={styles.hostCTA}>
              <View>
                <Text style={styles.hostCTATitle}>BE THE FIRST{"\n"}TO HOST</Text>
                <Text style={styles.hostCTASub}>Set a time. Build the run.</Text>
              </View>
              <Text style={styles.hostCTAArrow}>→</Text>
            </View>
          ) : (
            courtRuns.map((run) => <RunCard key={run.id} run={run} />)
          )}
        </View>

        <View style={styles.sectionFlat}>
          <Text style={styles.sectionTitle}>DETAILS</Text>
          <View style={styles.detailsGrid}>
            {[
              { k: "Surface", v: court.surface },
              { k: "Lights", v: court.lights ? "YES" : "NO" },
              { k: "Covered", v: court.covered ? "YES" : "NO" },
              { k: "Max Players", v: String(court.maxCapacity) },
            ].map(({ k, v }) => (
              <View key={k} style={styles.detailRow}>
                <Text style={styles.detailKey}>{k}</Text>
                <Text style={styles.detailVal}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: (Platform.OS === "web" ? 34 : bottom) + 12 }]}>
        <BrutalistButton
          label={isCheckedIn ? "CHECKED IN ✓" : "CHECK IN"}
          onPress={async () => { isCheckedIn ? await checkOut() : await checkIn(court.id); }}
          variant={isCheckedIn ? "outline" : "accent"}
          style={{ flex: 1 }}
          testID="court-check-in-btn"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notFound: { flex: 1, justifyContent: "center", alignItems: "center", gap: 20, padding: 40 },
  notFoundText: { fontFamily: Typography.heading, fontSize: 24, color: Colors.text, letterSpacing: 2 },
  hero: { height: 340, position: "relative" },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay, justifyContent: "flex-end" },
  backBtn: { position: "absolute", left: 20 },
  backText: { fontFamily: Typography.heading, fontSize: 14, color: Colors.white, letterSpacing: 1 },
  heroBottom: { padding: 20 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  sportTag: { flexDirection: "row", alignItems: "center", gap: 5 },
  sportDot: { width: 7, height: 7, borderRadius: 3.5 },
  sportText: {
    fontFamily: Typography.bodyBold, fontSize: 10, color: Colors.white,
    letterSpacing: 2, textTransform: "uppercase" as const,
  },
  liveChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.accent, paddingHorizontal: 8, paddingVertical: 3,
  },
  liveText: { fontFamily: Typography.bodyBold, fontSize: 9, color: Colors.black, letterSpacing: 2 },
  heroName: { fontFamily: Typography.heading, fontSize: 38, color: Colors.white, letterSpacing: 1, lineHeight: 40 },
  heroAddress: { fontFamily: Typography.body, fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 },
  statsBar: {
    flexDirection: "row", borderBottomWidth: 1, borderColor: Colors.border,
    paddingVertical: 14, backgroundColor: Colors.surface,
  },
  statDiv: { width: 1, backgroundColor: Colors.border },
  section: {
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 16,
    borderBottomWidth: 1, borderColor: Colors.border,
  },
  sectionFlat: { paddingHorizontal: 20, paddingTop: 22 },
  sectionTitle: {
    fontFamily: Typography.heading, fontSize: 13, color: Colors.text,
    letterSpacing: 3, marginBottom: 14, textTransform: "uppercase" as const,
    borderBottomWidth: 1, borderColor: Colors.border, paddingBottom: 8,
  },
  emptyText: {
    fontFamily: Typography.bodyMedium, fontSize: 12, color: Colors.muted,
    letterSpacing: 1.5, textTransform: "uppercase" as const, paddingVertical: 8,
  },
  rosterRow: { flexDirection: "row", gap: 12 },
  rosterItem: { alignItems: "center" },
  rosterName: { fontFamily: Typography.bodyBold, fontSize: 9, color: Colors.text, marginTop: 5, letterSpacing: 0.5 },
  rosterElo: { fontFamily: Typography.heading, fontSize: 12, color: Colors.muted, marginTop: 1 },
  hostCTA: {
    borderWidth: 1, borderColor: Colors.border, padding: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: Colors.surfaceHigh,
  },
  hostCTATitle: { fontFamily: Typography.heading, fontSize: 20, color: Colors.text, letterSpacing: 2 },
  hostCTASub: { fontFamily: Typography.body, fontSize: 12, color: Colors.muted, marginTop: 4 },
  hostCTAArrow: { fontFamily: Typography.heading, fontSize: 28, color: Colors.muted },
  detailsGrid: {},
  detailRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1, borderColor: Colors.border,
  },
  detailKey: { fontFamily: Typography.bodyMedium, fontSize: 12, color: Colors.muted },
  detailVal: { fontFamily: Typography.heading, fontSize: 14, color: Colors.text, letterSpacing: 1 },
  stickyFooter: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderColor: Colors.border,
    flexDirection: "row",
  },
});
