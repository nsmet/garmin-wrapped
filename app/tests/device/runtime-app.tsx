// Separate preview-only app entry. Never used by the normal product entry.
import { registerRootComponent } from "expo";
import React, { useEffect, useState } from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  StyleSheet,
} from "react-native";
// @ts-ignore Pure synthetic checks also run through the matching Hermes CLI.
import { runDomainChecks } from "../hermes/domain-checks.mjs";

function RuntimeProbe() {
  const [result, setResult] = useState("RUNNING");
  const hermes = !!(globalThis as any).HermesInternal;
  useEffect(() => {
    try {
      if (Platform.OS !== "ios" || !hermes)
        throw Error("Run this probe in native iOS Hermes.");
      const { checks } = runDomainChecks();
      setResult(`PASS: ${checks} synthetic domain checks`);
    } catch (error) {
      // The checks never load accounts, networking, secure storage or personal data.
      setResult(
        `FAIL: ${error instanceof Error ? error.message : "Runtime check failed"}`,
      );
    }
  }, [hermes]);
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>MiniWatt iOS runtime probe</Text>
        <Text accessibilityRole="alert" selectable style={styles.result}>
          {result}
        </Text>
        <Text style={styles.text}>
          iOS {String(Platform.Version)} · Hermes{" "}
          {hermes ? "enabled" : "missing"}
        </Text>
        <Text style={styles.text}>
          Synthetic data only. Checks native Intl, DST/year boundaries,
          normalization, calculation precision, coverage, privacy and share
          authority.
        </Text>
        <Text style={styles.text}>
          This is a separate test app. It does not connect to Garmin or validate
          the viewer, graphics, secure storage or sharing. Install and validate
          the normal candidate separately.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B1222" },
  content: { padding: 24, gap: 24 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "700" },
  result: { color: "#BBFF56", fontSize: 22, fontWeight: "700" },
  text: { color: "#FFFFFF", fontSize: 18, lineHeight: 27 },
});
registerRootComponent(RuntimeProbe);
