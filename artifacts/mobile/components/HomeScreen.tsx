import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { BrutalistButton } from "@/components/BrutalistButton";
import { LivePulse } from "@/components/LivePulse";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Colors, Radius } from "@/constants/colors";
import { getSportColor, SAMPLE_PLAYERS, SAMPLE_RUNS } from "@/constants/data";
import { Typography } from "@/constants/typography";
import { useApp } from "@/context/AppContext";

// BACKEND NOTE: weather stub → GET /api/v1/weather?lat=&lng= (or device-side WeatherKit / OpenWeather)
const WEATHER_STUB = "72° ☀";

export function HomeScreen() {
  const { courts, localCourtId, checkedInCourtId, checkIn, checkOut, feed } = useApp();
  const { top, bottom } = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : top;

  const localCourt = localCourtId ? courts.find((c) => c.id === localCourtId) ?? null : null;
  const isCheckedIn = checkedInCourtId === localCourt?.id;

  if (!localCourt) {
    return <NoCourtState topPad={topPad} />;
  }

  const sportColor = getSportColor(localCourt.sport);
  const activePlayers = SAMPLE_PLAYERS.filter((p) => p.courtId === localCourt.id).slice(0, 8);
  const overflowCount = Math.max(0, localCourt.activeCount - activePlayers.length);
  const courtRuns = SAMPLE_RUNS.filter((r) => r.courtId === localCourt.id);
  const courtFeed = feed.filter((f) => f.courtId === localCourt.id).slice(0, 5);

  const handleCheckIn = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isCheckedIn) {
      await checkOut();
    } else {
      await checkIn(localCourt.id);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const courtDetails: { label: string; value: string }[] = [
    { label: "COURTS", value: String(localCourt.courtCount ?? 1) },
    { label: "HOOPS", value: localCourt.hoopCount != null ? String(localCourt.hoopCount) : "—" },
    { label: "NET", value: localCourt.netType ?? "—" },
    { label: "RIM", value: localCourt.rimType ?? "—" },
    { label: "SURFACE", value: localCourt.surface },
    { label: "LIGHTS", value: localCourt.lights ? "YES" : "NO" },
    { label: "WATER", value: localCourt.waterFountain ? "YES" : "NO" },
    { label: "ADDED", value: localCourt.addedDate ?? "—" },
  ];

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={styles.headerEyebrow}>HOME</Text>
          <Text style={styles.headerCourtName} numberOfLines={1}>
            {localCourt.name.toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.weatherText}>{WEATHER_STUB}</Text>
          <Pressable
            hitSlop={12}
            onPress={() => router.push(`/court/${localCourt.id}`)}
            style={styles.settingsBtn}
          >
            <Feather name="settings" size={17} color={Colors.muted} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 : bottom + 96 }}
      >
        {/* ── Court Hero ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.sportTag}>
              <View style={[styles.sportDot, { backgroundColor: sportColor }]} />
              <Text style={[styles.sportText, { color: sportColor }]}>{localCourt.sport}</Text>
            </View>
            {localCourt.activeCount > 0 && (
              <View style={styles.liveChip}>
                <LivePulse size={4} color={Colors.black} style={{ marginRight: 4 }} />
                <Text style={styles.liveChipText}>{localCourt.activeCount} ON COURT</Text>
              </View>
            )}
          </View>

          <View style={[styles.courtAccentBar, { backgroundColor: sportColor }]} />
          <Text style={styles.courtName}>{localCourt.name.toUpperCase()}</Text>
          <Text style={styles.courtAddress}>
            {localCourt.neighborhood} · {localCourt.city}
          </Text>

          {/* Tags */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsScroll}
            contentContainerStyle={styles.tagsContent}
          >
            {localCourt.status === "community" && (
              <View style={styles.communityTag}>
                <View style={styles.communityDot} />
                <Text style={styles.communityTagText}>COMMUNITY COURT</Text>
              </View>
            )}
            {localCourt.status === "confirmed" && (
              <View style={styles.confirmedTag}>
                <View style={styles.confirmedRing} />
                <Text style={styles.confirmedTagText}>CONFIRMED</Text>
              </View>
            )}
            <View style={styles.tag}>
              <Text style={styles.tagText}>{localCourt.surface}</Text>
            </View>
            {localCourt.lights && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>LIGHTS</Text>
              </View>
            )}
            {localCourt.covered && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>COVERED</Text>
              </View>
            )}
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {localCourt.localCount} LOCAL{localCourt.localCount !== 1 ? "S" : ""}
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* ── Check In ── */}
        <View style={styles.checkInRow}>
          <BrutalistButton
            label={isCheckedIn ? "CHECKED IN ✓" : "CHECK IN"}
            onPress={handleCheckIn}
            variant={isCheckedIn ? "outline" : "accent"}
            style={styles.checkInBtn}
            testID="home-check-in-btn"
          />
          <Pressable
            style={styles.viewBtn}
            onPress={() => router.push(`/court/${localCourt.id}`)}
          >
            <Text style={styles.viewBtnText}>VIEW</Text>
          </Pressable>
        </View>

        {/* ── Who's Here ── */}
        {localCourt.activeCount > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>WHO'S HERE</Text>
              <Text style={styles.sectionAccent}>{localCourt.activeCount} ACTIVE</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rosterRow}
            >
              {activePlayers.map((p) => (
                <View key={p.id} style={styles.rosterItem}>
                  <PlayerAvatar initials={p.avatar} size={40} />
                  <Text style={styles.rosterName}>{p.avatar}</Text>
                  <Text style={styles.rosterElo}>{p.elo}</Text>
                </View>
              ))}
              {overflowCount > 0 && (
                <View style={styles.rosterItem}>
                  <View style={styles.rosterMore}>
                    <Text style={styles.rosterMoreText}>+{overflowCount}</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* ── Court Details ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>COURT DETAILS</Text>
          </View>
          <View style={styles.detailsGrid}>
            {courtDetails.map(({ label, value }, i) => (
              <View
                key={label}
                style={[
                  styles.detailCell,
                  i % 2 === 1 && styles.detailCellRight,
                  i >= courtDetails.length - 2 && styles.detailCellLast,
                ]}
              >
                <Text style={styles.detailValue}>{value}</Text>
                <Text style={styles.detailLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Upcoming Run ── */}
        {courtRuns.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>NEXT RUN</Text>
            </View>
            {courtRuns.slice(0, 1).map((run) => (
              <Pressable
                key={run.id}
                style={({ pressed }) => [styles.runCard, pressed && styles.pressed]}
                onPress={() => router.push(`/run/${run.id}`)}
              >
                <View style={styles.runCardLeft}>
                  <Text style={styles.runTitle}>{run.title}</Text>
                  <Text style={styles.runMeta}>
                    {run.date} · {run.time} · {run.skillLevel}
                  </Text>
                </View>
                <View style={styles.runPlayers}>
                  <Text style={styles.runPlayerCount}>
                    {run.teamA.filter(Boolean).length + run.teamB.filter(Boolean).length}
                    <Text style={styles.runPlayerMax}>/{run.maxPlayers}</Text>
                  </Text>
                  <Text style={styles.runPlayersLabel}>IN</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Recent Activity ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
          </View>
          {courtFeed.length === 0 ? (
            <Text style={styles.emptyText}>No activity yet. Be the first.</Text>
          ) : (
            courtFeed.map((item) => {
              const isWin =
                item.message.includes("WON") || item.message.includes("WIN");
              const isLoss =
                item.message.includes("LOST") || item.message.includes("LOSS");
              const barColor = isWin
                ? Colors.win
                : isLoss
                ? Colors.loss
                : Colors.accent;
              return (
                <View key={item.id} style={styles.feedItem}>
                  <View style={[styles.feedBar, { backgroundColor: barColor }]} />
                  <View style={styles.feedContent}>
                    <Text style={styles.feedMessage}>{item.message}</Text>
                    <Text style={styles.feedTime}>{item.timestamp}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function NoCourtState({ topPad }: { topPad: number }) {
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerEyebrow}>HOME</Text>
      </View>
      <View style={styles.noCourtContainer}>
        <Feather name="map-pin" size={28} color={Colors.mutedDark} style={styles.noCourtIcon} />
        <Text style={styles.noCourtTitle}>SET YOUR LOCAL COURT</Text>
        <Text style={styles.noCourtSub}>
          Claim a court as your home base.{"\n"}Get live updates and check in fast.
        </Text>
        <Pressable
          style={styles.findCourtBtn}
          onPress={() => router.push("/(tabs)/explore")}
        >
          <Text style={styles.findCourtBtnText}>FIND A COURT →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerEyebrow: {
    fontFamily: Typography.bodyBold,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2.5,
    textTransform: "uppercase" as const,
    marginBottom: 3,
  },
  headerCourtName: {
    fontFamily: Typography.heading,
    fontSize: 20,
    color: Colors.text,
    letterSpacing: 0.3,
    maxWidth: 220,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 2,
  },
  weatherText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 12,
    color: Colors.muted,
  },
  settingsBtn: {
    padding: 2,
  },

  // ── Hero ──
  heroCard: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  sportTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sportDot: { width: 6, height: 6, borderRadius: 3 },
  sportText: {
    fontFamily: Typography.bodyBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  liveChipText: {
    fontFamily: Typography.bodyBold,
    fontSize: 9,
    color: Colors.black,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
  courtAccentBar: {
    height: 2,
    width: 32,
    marginBottom: 8,
    borderRadius: 1,
  },
  courtName: {
    fontFamily: Typography.heading,
    fontSize: 30,
    color: Colors.text,
    letterSpacing: 0.5,
    lineHeight: 32,
    marginBottom: 4,
  },
  courtAddress: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.muted,
    marginBottom: 14,
  },
  tagsScroll: { marginBottom: 2 },
  tagsContent: { gap: 6 },
  tag: {
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  tagText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  communityTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 0.5,
    borderColor: Colors.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  communityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.textSecondary,
  },
  communityTagText: {
    fontFamily: Typography.bodyBold,
    fontSize: 9,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  confirmedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  confirmedRing: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  confirmedTagText: {
    fontFamily: Typography.bodyBold,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },

  // ── Check In ──
  checkInRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  checkInBtn: { flex: 3 },
  viewBtn: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  viewBtnText: {
    fontFamily: Typography.heading,
    fontSize: 13,
    color: Colors.muted,
    letterSpacing: 1.5,
  },

  // ── Section ──
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: Typography.heading,
    fontSize: 12,
    color: Colors.text,
    letterSpacing: 3,
    textTransform: "uppercase" as const,
  },
  sectionAccent: {
    fontFamily: Typography.bodyBold,
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },

  // ── Roster ──
  rosterRow: { gap: 12, paddingVertical: 2 },
  rosterItem: { alignItems: "center" },
  rosterName: {
    fontFamily: Typography.bodyBold,
    fontSize: 9,
    color: Colors.text,
    marginTop: 5,
    letterSpacing: 0.5,
  },
  rosterElo: {
    fontFamily: Typography.heading,
    fontSize: 11,
    color: Colors.muted,
    marginTop: 1,
  },
  rosterMore: {
    width: 40,
    height: 40,
    borderWidth: 0.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.xs,
    marginTop: 0,
  },
  rosterMoreText: {
    fontFamily: Typography.heading,
    fontSize: 11,
    color: Colors.muted,
  },

  // ── Court Details ──
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  detailCell: {
    width: "50%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  detailCellRight: {
    borderLeftWidth: 0.5,
    borderLeftColor: Colors.border,
  },
  detailCellLast: {
    borderBottomWidth: 0,
  },
  detailValue: {
    fontFamily: Typography.heading,
    fontSize: 14,
    color: Colors.text,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },

  // ── Run Card ──
  runCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 14,
    backgroundColor: Colors.surface,
  },
  pressed: { backgroundColor: Colors.surfaceHigh },
  runCardLeft: { flex: 1 },
  runTitle: {
    fontFamily: Typography.heading,
    fontSize: 16,
    color: Colors.text,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  runMeta: {
    fontFamily: Typography.bodyMedium,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  runPlayers: { alignItems: "center", paddingLeft: 14 },
  runPlayerCount: {
    fontFamily: Typography.heading,
    fontSize: 22,
    color: Colors.text,
    lineHeight: 24,
  },
  runPlayerMax: {
    fontFamily: Typography.heading,
    fontSize: 14,
    color: Colors.muted,
  },
  runPlayersLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    marginTop: 2,
  },

  // ── Activity Feed ──
  feedItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  feedBar: {
    width: 2.5,
    marginRight: 12,
    borderRadius: 1,
  },
  feedContent: { flex: 1 },
  feedMessage: {
    fontFamily: Typography.bodyMedium,
    fontSize: 12,
    color: Colors.text,
    letterSpacing: 0.2,
    lineHeight: 18,
    marginBottom: 3,
  },
  feedTime: {
    fontFamily: Typography.body,
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  emptyText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 12,
    color: Colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    paddingVertical: 12,
  },

  // ── No Court State ──
  noCourtContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  noCourtIcon: { marginBottom: 20 },
  noCourtTitle: {
    fontFamily: Typography.heading,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 10,
  },
  noCourtSub: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  findCourtBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: Radius.xs,
  },
  findCourtBtnText: {
    fontFamily: Typography.heading,
    fontSize: 14,
    color: Colors.black,
    letterSpacing: 2,
  },
});
