import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { CourtBottomSheet } from "@/components/CourtBottomSheet";
import { CourtListItem } from "@/components/CourtListItem";
import { LivePulse } from "@/components/LivePulse";
import { MapScreen } from "@/components/MapScreen";
import { Colors, Radius } from "@/constants/colors";
import { Court, getSportColor, SAMPLE_RUNS } from "@/constants/data";
import { Typography } from "@/constants/typography";
import { useApp } from "@/context/AppContext";

export function CourtsScreen() {
  const { courts, checkedInCourtId, lastVisitedCourtId, checkIn, checkOut, visitCourt } = useApp();
  const { top, bottom } = useSafeAreaInsets();
  const [mode, setMode] = useState<"COURTS" | "MAP">("COURTS");
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const topPad = Platform.OS === "web" ? 67 : top;
  const [mapMounted, setMapMounted] = useState(false);
  const mapAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mode === "MAP" && !mapMounted) setMapMounted(true);
    Animated.timing(mapAnim, {
      toValue: mode === "MAP" ? 1 : 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [mode, mapAnim, mapMounted]);

  const activeCourts = courts.filter((c) => c.activeCount > 0);
  const checkedInCourt = checkedInCourtId ? courts.find((c) => c.id === checkedInCourtId) ?? null : null;
  const lastVisitedCourt = lastVisitedCourtId ? courts.find((c) => c.id === lastVisitedCourtId) ?? null : null;
  const featuredCourt = checkedInCourt ?? lastVisitedCourt ?? activeCourts[0] ?? courts[0] ?? null;
  const isCheckedIn = checkedInCourtId === featuredCourt?.id;
  const sportColor = featuredCourt ? getSportColor(featuredCourt.sport) : Colors.accent;
  const nearbyCourts = courts
    .filter((c) => c.id !== featuredCourt?.id)
    .sort((a, b) => b.activeCount - a.activeCount);
  const nextRun = featuredCourt
    ? SAMPLE_RUNS.find((r) => r.courtId === featuredCourt.id) ?? null
    : null;

  const handleCheckIn = async () => {
    if (!featuredCourt) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isCheckedIn) {
      await checkOut();
    } else {
      await checkIn(featuredCourt.id);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const mapOpacity = mapAnim;
  const mapTranslateX = mapAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={styles.headerTitle}>COURTS</Text>
          <Text style={styles.headerSub}>
            {activeCourts.length > 0
              ? `${activeCourts.length} LIVE NEARBY`
              : "YOUR LOCAL COURTS"}
          </Text>
        </View>
        <Pressable
          onPress={() => setMode("MAP")}
          style={styles.mapToggleBtn}
          testID="map-toggle-btn"
        >
          <Feather name="map" size={14} color={Colors.muted} />
          <Text style={styles.mapToggleText}>MAP</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 84 : 100 },
        ]}
      >
        {featuredCourt && (
          <View style={styles.myCourtSection}>
            <Text style={styles.sectionLabel}>
              {isCheckedIn ? "YOU'RE HERE" : "YOUR COURT"}
            </Text>

            <View style={[styles.myCourtCard, { borderLeftColor: sportColor }]}>
              <View style={styles.myCourtTop}>
                <View style={styles.myCourtInfo}>
                  <View style={styles.sportRow}>
                    <View style={[styles.sportDot, { backgroundColor: sportColor }]} />
                    <Text style={[styles.sportLabel, { color: sportColor }]}>
                      {featuredCourt.sport}
                    </Text>
                  </View>
                  <Text style={styles.myCourtName}>{featuredCourt.name}</Text>
                  <Text style={styles.myCourtMeta}>
                    {featuredCourt.neighborhood} · {featuredCourt.city}
                  </Text>
                </View>

                <View style={styles.myCourtLiveBadge}>
                  {featuredCourt.activeCount > 0 ? (
                    <>
                      <LivePulse size={5} color={Colors.accent} style={{ marginBottom: 5 }} />
                      <Text style={styles.liveCount}>{featuredCourt.activeCount}</Text>
                      <Text style={styles.liveLabel}>PLAYING</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.emptyDash}>—</Text>
                      <Text style={styles.liveLabel}>EMPTY</Text>
                    </>
                  )}
                </View>
              </View>

              {nextRun && (
                <View style={styles.nextRunBanner}>
                  <Text style={styles.nextRunEyebrow}>NEXT RUN</Text>
                  <Text style={styles.nextRunDetails}>
                    {nextRun.date} · {nextRun.time} · {nextRun.title}
                  </Text>
                </View>
              )}

              <View style={styles.cardActions}>
                <BrutalistButton
                  label={isCheckedIn ? "CHECKED IN ✓" : "CHECK IN"}
                  onPress={handleCheckIn}
                  variant={isCheckedIn ? "outline" : "accent"}
                  style={styles.checkInBtn}
                  testID="home-check-in-btn"
                />
                <BrutalistButton
                  label="VIEW"
                  onPress={() => {
                    setSelectedCourt(featuredCourt);
                    if (featuredCourt) visitCourt(featuredCourt.id);
                  }}
                  variant="dark"
                  style={styles.viewCourtBtn}
                />
              </View>
            </View>
          </View>
        )}

        {nearbyCourts.length > 0 && (
          <View style={styles.nearbySection}>
            <Text style={[styles.sectionLabel, styles.sectionLabelPad]}>
              NEARBY COURTS
            </Text>
            {nearbyCourts.map((court) => (
              <CourtListItem
                key={court.id}
                court={court}
                onPress={(c) => {
                  setSelectedCourt(c);
                  visitCourt(c.id);
                }}
                isCheckedIn={checkedInCourtId === court.id}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <CourtBottomSheet court={selectedCourt} onClose={() => setSelectedCourt(null)} />

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: mapOpacity,
            transform: [{ translateX: mapTranslateX }],
            pointerEvents: mode === "MAP" ? "auto" : "none",
          },
        ]}
      >
        {mapMounted && <MapScreen />}
        <Pressable
          style={[styles.mapBackBtn, { top: topPad + 14 }]}
          onPress={() => setMode("COURTS")}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={16} color={Colors.white} />
        </Pressable>
      </Animated.View>
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
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontFamily: Typography.heading,
    fontSize: 34,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontFamily: Typography.bodyMedium,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginTop: 2,
  },
  mapToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 3,
  },
  mapToggleText: {
    fontFamily: Typography.heading,
    fontSize: 11,
    color: Colors.muted,
    letterSpacing: 1.5,
  },

  mapBackBtn: {
    position: "absolute",
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13,13,16,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    zIndex: 200,
  },

  scrollContent: {},

  myCourtSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontFamily: Typography.bodyBold,
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 2.5,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  sectionLabelPad: {
    paddingHorizontal: 16,
  },

  myCourtCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    overflow: "hidden",
    padding: 16,
  },
  myCourtTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  myCourtInfo: { flex: 1 },
  sportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
  },
  sportDot: { width: 7, height: 7, borderRadius: 4 },
  sportLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  myCourtName: {
    fontFamily: Typography.heading,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: 0.2,
    lineHeight: 26,
  },
  myCourtMeta: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.muted,
    marginTop: 4,
  },
  myCourtLiveBadge: {
    alignItems: "center",
    minWidth: 56,
    paddingLeft: 12,
    paddingTop: 2,
  },
  liveCount: {
    fontFamily: Typography.heading,
    fontSize: 32,
    color: Colors.text,
    lineHeight: 34,
  },
  emptyDash: {
    fontFamily: Typography.heading,
    fontSize: 28,
    color: Colors.mutedDark,
    lineHeight: 32,
    marginBottom: 5,
  },
  liveLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    marginTop: 2,
  },

  nextRunBanner: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  nextRunEyebrow: {
    fontFamily: Typography.bodyBold,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginBottom: 3,
  },
  nextRunDetails: {
    fontFamily: Typography.bodyMedium,
    fontSize: 13,
    color: Colors.text,
    letterSpacing: 0.1,
  },

  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
  checkInBtn: { flex: 2 },
  viewCourtBtn: { flex: 1 },

  nearbySection: {
    marginTop: 22,
  },
});
