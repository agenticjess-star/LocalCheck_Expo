import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { MatchResult } from "@/constants/data";
import { Typography } from "@/constants/typography";

interface MatchRowProps {
  match: MatchResult;
}

export function MatchRow({ match }: MatchRowProps) {
  const isWin = match.result === "WIN";
  const deltaStr = match.eloDelta > 0 ? `+${match.eloDelta}` : `${match.eloDelta}`;

  return (
    <View style={styles.container}>
      <View style={[styles.resultBar, { backgroundColor: isWin ? Colors.win : Colors.loss }]} />
      <Text style={styles.date}>{match.date}</Text>
      <View style={styles.center}>
        <Text style={[styles.result, { color: isWin ? Colors.win : Colors.loss }]}>{match.result}</Text>
        <Text style={styles.score}>{match.teamScore} — {match.opposingScore}</Text>
        <Text style={styles.court}>{match.courtName} · {match.sport}</Text>
      </View>
      <View style={[styles.deltaBlock, { backgroundColor: isWin ? Colors.winDim : Colors.lossDim }]}>
        <Text style={[styles.delta, { color: isWin ? Colors.win : Colors.loss }]}>{deltaStr}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1, borderColor: Colors.border,
    gap: 12,
  },
  resultBar: { width: 3, height: 40, borderRadius: 1 },
  date: {
    fontFamily: Typography.bodyBold, fontSize: 10, color: Colors.muted,
    letterSpacing: 1, width: 50, textTransform: "uppercase" as const,
  },
  center: { flex: 1 },
  result: { fontFamily: Typography.heading, fontSize: 16, letterSpacing: 2, lineHeight: 18 },
  score: { fontFamily: Typography.bodyBold, fontSize: 11, color: Colors.text, marginTop: 1 },
  court: { fontFamily: Typography.body, fontSize: 10, color: Colors.muted, marginTop: 1 },
  deltaBlock: { paddingHorizontal: 10, paddingVertical: 6, minWidth: 52, alignItems: "center" },
  delta: { fontFamily: Typography.heading, fontSize: 18, letterSpacing: 1 },
});
