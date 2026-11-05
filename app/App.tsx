import "./src/polyfills";
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
  Image,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { fetch as expoFetch } from "expo/fetch";
import * as Sharing from "expo-sharing";
import * as ScreenCapture from "expo-screen-capture";
import Viewer from "./Viewer";
import Constants from "expo-constants";
// @ts-ignore Pure navigation policy is tested separately.
import { allowViewerNavigation } from "./src/navigation.mjs";
import type { Presentation, ExportRequest, ExportPacket } from "./src/types";
import {
  rememberedKey,
  removeExport,
  sweepExports,
  writeExport,
} from "./src/native-storage";
import { Coverage } from "./src/Coverage";
// @ts-ignore App-owned JS modules are covered by domain and contract tests.
import { collectRecap } from "./src/importer.mjs";
// @ts-ignore
import {
  makePresentation,
  createShareAuthority,
  describe,
  colorways,
} from "./src/presentation.mjs";
// @ts-ignore
import { createTransfer } from "./src/export-transfer.mjs";
// @ts-ignore
import { abortError, abortable } from "./src/abort.mjs";
// @ts-ignore Native runtime preflight also runs in the synthetic iOS probe.
import { assertRecapRuntime } from "./src/runtime-check.mjs";
// @ts-ignore This is the website's explicitly fictional fixture.
import { dataset as example } from "./vendor/public/sample-data.mjs";

type Recap = { dataset: any; presentation: Presentation };
type ShareState = {
  id: string;
  allowed: boolean;
  colorway: string;
  busy: boolean;
  uri: string | null;
  error: string;
};
export default function App() {
  return (
    <SafeAreaProvider>
      <Wrapped />
    </SafeAreaProvider>
  );
}
function Wrapped() {
  const [key, setKey] = useState(""),
    [remember, setRemember] = useState(false),
    [consent, setConsent] = useState(false),
    [steps, setSteps] = useState(true),
    [health, setHealth] = useState(true);
  const [phase, setPhase] = useState<"connect" | "import" | "view">("connect"),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [recap, setRecap] = useState<Recap | null>(null),
    [privacy, setPrivacy] = useState(false),
    [reading, setReading] = useState(false),
    [help, setHelp] = useState(false);
  const [active, setActive] = useState(AppState.currentState === "active"),
    [reduced, setReduced] = useState(false),
    [viewerKey, setViewerKey] = useState(0),
    [share, setShare] = useState<ShareState | null>(null),
    [exportRequest, setExportRequest] = useState<ExportRequest | null>(null);
  const [viewerError, setViewerError] = useState(false);
  const [dismissDialog, setDismissDialog] = useState(0);
  const viewerDialog = useRef(false);
  const epoch = useRef(0),
    abort = useRef<AbortController | null>(null),
    currentRecap = useRef<Recap | null>(null),
    phaseRef = useRef(phase),
    selected = useRef(0),
    authority = useRef<any>(null),
    transfer = useRef<any>(null),
    shareRef = useRef<ShareState | null>(null),
    exportRef = useRef<ExportRequest | null>(null),
    exportTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    handedOff = useRef(new Set<string>()),
    sharing = useRef(false);
  currentRecap.current = recap;
  phaseRef.current = phase;
  shareRef.current = share;
  exportRef.current = exportRequest;
  const current = (id: number) => epoch.current === id;
  function safeSweep(all = false) {
    try {
      sweepExports(all);
    } catch {
      setError(
        "Some temporary exports could not be removed. Try Clear data again.",
      );
    }
  }
  function discardShare() {
    authority.current?.revoke();
    transfer.current?.clear();
    transfer.current = null;
    if (exportTimer.current) clearTimeout(exportTimer.current);
    exportTimer.current = null;
    exportRef.current = null;
    setExportRequest(null);
    const uri = shareRef.current?.uri;
    if (uri && !handedOff.current.has(uri)) {
      try {
        removeExport(uri);
      } catch {}
    }
    shareRef.current = null;
    setShare(null);
  }
  function stopImport(message = "Import cancelled. No recap was saved.") {
    epoch.current++;
    abort.current?.abort(abortError(message));
    abort.current = null;
    setKey("");
    setPhase("connect");
    setStatus("");
    setError(message);
  }
  async function clear() {
    viewerDialog.current = false;
    epoch.current++;
    abort.current?.abort();
    abort.current = null;
    discardShare();
    authority.current = null;
    currentRecap.current = null;
    selected.current = 0;
    setKey("");
    setRemember(false);
    setConsent(false);
    setRecap(null);
    setPrivacy(false);
    setReading(false);
    setHelp(false);
    setPhase("connect");
    setStatus("");
    setError("");
    safeSweep(true);
    handedOff.current.clear();
    try {
      await rememberedKey.forget();
    } catch {
      setError(
        "Your saved key could not be removed from secure storage. Try Clear data again.",
      );
    }
  }
  useEffect(() => {
    const id = epoch.current;
    let mounted = true;
    rememberedKey
      .read()
      .then((value) => {
        if (mounted && current(id) && value) {
          setKey(value);
          setRemember(true);
        }
      })
      .catch(() => {
        if (mounted)
          setError(
            "Secure storage is unavailable. Your key will stay in memory for this visit.",
          );
      });
    safeSweep();
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    if (Platform.OS === "ios")
      void ScreenCapture.enableAppSwitcherProtectionAsync(0.9).catch(() => {});
    const subscription = AppState.addEventListener("change", (state) => {
      setActive(state === "active");
      if (state !== "active" && phaseRef.current === "import")
        stopImport(
          "The app was interrupted. Reconnect to start a fresh import.",
        );
      if (state !== "active" && !sharing.current) discardShare();
      if (state === "active") safeSweep();
    });
    return () => {
      mounted = false;
      epoch.current++;
      abort.current?.abort();
      authority.current?.revoke();
      transfer.current?.clear();
      if (exportTimer.current) clearTimeout(exportTimer.current);
      motion.remove();
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (viewerDialog.current) {
          viewerDialog.current = false;
          setDismissDialog((value) => value + 1);
          return true;
        }
        if (shareRef.current) {
          discardShare();
          return true;
        }
        if (reading) {
          setReading(false);
          return true;
        }
        if (privacy) {
          setPrivacy(false);
          return true;
        }
        if (help) {
          setHelp(false);
          return true;
        }
        if (phase === "import") {
          stopImport();
          return true;
        }
        if (recap) {
          Alert.alert(
            "Clear this recap?",
            "Your recap stays only in memory. Reconnect to see it again.",
            [
              { text: "Keep viewing", style: "cancel" },
              {
                text: "Clear data",
                style: "destructive",
                onPress: () => void clear(),
              },
            ],
          );
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [phase, privacy, reading, help, recap]);
  function showRecap(plan: any, id: number) {
    viewerDialog.current = false;
    if (!current(id)) return;
    const prepared = makePresentation(
      plan,
      `session-${id}-${Date.now().toString(36)}`,
    ) as Recap;
    setViewerError(false);
    authority.current = createShareAuthority(
      prepared.dataset,
      prepared.presentation.generation,
    );
    selected.current = 0;
    setRecap(prepared);
    setViewerKey((n) => n + 1);
    setPhase("view");
  }
  async function connect() {
    if (phaseRef.current === "import") return;
    if (!consent) {
      setError("Allow Garmin access to build your recap.");
      return;
    }
    let credential = key.trim();
    if (!credential) {
      setError("Paste your Garmin Personal API key.");
      return;
    }
    Keyboard.dismiss();
    discardShare();
    const controller = new AbortController(),
      id = ++epoch.current;
    abort.current = controller;
    phaseRef.current = "import";
    setKey("");
    setError("");
    setPhase("import");
    setStatus("Connecting securely to Garmin…");
    const deadline = setTimeout(
      () =>
        controller.abort(
          abortError(
            "The import timed out after five minutes. Reconnect to try again.",
          ),
        ),
      300000,
    );
    try {
      if (!remember) await abortable(rememberedKey.forget(), controller.signal);
      assertRecapRuntime();
      const timeZone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const year = Number(
        new Intl.DateTimeFormat("en", { timeZone, year: "numeric" }).format(
          new Date(),
        ),
      );
      const result = await collectRecap({
        key: credential,
        year,
        timeZone,
        includeSteps: steps,
        includeHealth: health,
        fetcher: expoFetch,
        signal: controller.signal,
        onProgress: (message: string) => {
          if (current(id)) setStatus(message);
        },
        onConnected: async () => {
          if (remember)
            try {
              await rememberedKey.save(
                credential,
                () => current(id) && !controller.signal.aborted,
              );
            } catch {
              if (current(id) && !controller.signal.aborted) {
                setRemember(false);
                Alert.alert(
                  "Key was not saved",
                  "Your recap can continue. Secure storage was unavailable.",
                );
              }
            }
          credential = "";
        },
      });
      if (!controller.signal.aborted && current(id)) showRecap(result, id);
    } catch (caught: any) {
      if (current(id)) {
        setPhase("connect");
        setError(
          controller.signal.aborted
            ? controller.signal.reason?.message ||
                "Import cancelled. No recap was saved."
            : caught?.message ||
                "Your recap could not load. Reconnect to try again.",
        );
        if (
          ["GARMIN_AUTH", "KEY_INVALID", "TOKEN_INVALID"].includes(caught?.code)
        ) {
          setRemember(false);
          void rememberedKey
            .forget()
            .catch(() =>
              setError(
                "Your saved key could not be removed. Use Clear data to retry.",
              ),
            );
        }
      }
    } finally {
      credential = "";
      clearTimeout(deadline);
      if (current(id)) {
        abort.current = null;
        setStatus("");
      }
    }
  }
  function openShare(message: { generation: string; id: string }) {
    if (message.generation !== currentRecap.current?.presentation.generation)
      return;
    const story = currentRecap.current.dataset.stories.find(
      (s: any) => s.id === message.id,
    );
    if (!story || story.promotional) return;
    discardShare();
    setShare({
      id: story.id,
      allowed: !story.health || currentRecap.current.dataset.exampleOnly,
      colorway: "original",
      busy: false,
      uri: null,
      error: "",
    });
  }
  function preview(allowed = false) {
    const selection = shareRef.current,
      currentSession = currentRecap.current;
    if (!selection || !currentSession || selection.busy) return;
    try {
      if (selection.uri && !handedOff.current.has(selection.uri))
        removeExport(selection.uri);
      transfer.current?.clear();
      authority.current?.revoke();
      const request = authority.current.begin(
        selection.id,
        `share-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        {
          healthConsent: selection.allowed || allowed,
          colorway: selection.colorway,
        },
      );
      transfer.current = createTransfer((packet: ExportPacket) =>
        authority.current?.accepts(packet),
      );
      const next = {
        ...selection,
        allowed: selection.allowed || allowed,
        busy: true,
        uri: null,
        error: "",
      };
      shareRef.current = next;
      setShare(next);
      exportRef.current = request;
      setExportRequest(request);
      if (exportTimer.current) clearTimeout(exportTimer.current);
      exportTimer.current = setTimeout(() => {
        if (exportRef.current?.requestId === request.requestId)
          exportFailed(request);
      }, 20000);
    } catch {
      setShare({
        ...selection,
        busy: false,
        error: "This card needs permission before it can be prepared.",
      });
    }
  }
  function exportFailed(message: { generation: string; requestId: string }) {
    if (
      message.generation !== currentRecap.current?.presentation.generation ||
      message.requestId !== exportRef.current?.requestId
    )
      return;
    authority.current?.revoke();
    transfer.current?.clear();
    transfer.current = null;
    if (exportTimer.current) clearTimeout(exportTimer.current);
    exportRef.current = null;
    setExportRequest(null);
    setShare((value) =>
      value
        ? {
            ...value,
            busy: false,
            error:
              "The image could not be prepared. Try again or reopen your recap.",
          }
        : null,
    );
  }
  async function receiveChunk(packet: ExportPacket) {
    const request = exportRef.current;
    if (!request || packet.version !== 1 || !authority.current?.accepts(packet))
      return false;
    let uri: string | null = null;
    try {
      const bytes = transfer.current.receive(packet);
      if (!bytes) return true;
      uri = await writeExport(bytes, request.requestId);
      bytes.fill(0);
      if (
        exportRef.current?.requestId !== request.requestId ||
        !authority.current?.accepts(packet)
      ) {
        removeExport(uri);
        return false;
      }
      if (exportTimer.current) clearTimeout(exportTimer.current);
      transfer.current = null;
      exportRef.current = null;
      setExportRequest(null);
      setShare((value) =>
        value ? { ...value, busy: false, uri, error: "" } : null,
      );
      return true;
    } catch {
      if (uri)
        try {
          removeExport(uri);
        } catch {}
      exportFailed(request);
      return false;
    }
  }
  async function shareImage() {
    const selection = shareRef.current;
    if (!selection?.uri || selection.busy || sharing.current) return;
    const generation = currentRecap.current?.presentation.generation;
    sharing.current = true;
    try {
      if (!(await Sharing.isAvailableAsync()))
        throw Error("Native sharing is unavailable on this device.");
      if (
        generation !== currentRecap.current?.presentation.generation ||
        shareRef.current?.uri !== selection.uri ||
        AppState.currentState !== "active"
      )
        return;
      handedOff.current.add(selection.uri);
      await Sharing.shareAsync(selection.uri, {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: "Share your recap card",
      });
    } catch (caught: any) {
      setShare((value) =>
        value
          ? {
              ...value,
              error:
                caught?.message ||
                "The share sheet could not open. Please try again.",
            }
          : null,
      );
    } finally {
      sharing.current = false;
      authority.current?.revoke();
    }
  }
  const selectedStory = recap?.dataset.stories.find(
    (s: any) => s.id === share?.id,
  );
  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom", "left", "right"]}>
      <StatusBar barStyle="light-content" />
      {phase === "view" && recap ? (
        <>
          <View style={s.nativeHeader}>
            <Button
              label="Clear data"
              compact
              onPress={() =>
                Alert.alert(
                  "Clear all app data?",
                  "This removes the in-memory recap, saved key and temporary exports. Copies you already shared cannot be recalled.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Clear data",
                      style: "destructive",
                      onPress: () => void clear(),
                    },
                  ],
                )
              }
            />
            <Text style={s.brandSmall}>MINI WATT</Text>
            <Button label="Privacy" compact onPress={() => setPrivacy(true)} />
          </View>
          {recap.presentation.stories.length ? (
            <View style={s.viewer}>
              {viewerError && (
                <View style={{ padding: 16, gap: 12 }}>
                  <Text style={s.error}>
                    The viewer was interrupted. Your recap is still in memory.
                  </Text>
                  <Button
                    label="Reopen recap"
                    onPress={() => {
                      discardShare();
                      setViewerError(false);
                      setViewerKey((n) => n + 1);
                    }}
                  />
                </View>
              )}
              <Viewer
                key={viewerKey}
                presentation={recap.presentation}
                active={active && !privacy && !reading && !share}
                reducedMotion={reduced}
                initialIndex={selected.current}
                exportRequest={exportRequest}
                dismissDialog={dismissDialog}
                onDialogChange={async (message) => {
                  if (
                    message.generation ===
                      currentRecap.current?.presentation.generation &&
                    typeof message.open === "boolean"
                  )
                    viewerDialog.current = message.open;
                }}
                onSelect={async (message) => {
                  if (
                    message.generation ===
                      currentRecap.current?.presentation.generation &&
                    Number.isInteger(message.index) &&
                    currentRecap.current.presentation.stories[message.index]
                      ?.id === message.id
                  )
                    selected.current = message.index;
                }}
                onShare={async (message) => openShare(message)}
                onPrivacy={async () => setPrivacy(true)}
                onRead={async () => setReading(true)}
                onOffer={async () => {
                  await Linking.openURL(
                    "https://www.miniwatt.app/download",
                  ).catch(() =>
                    Alert.alert(
                      "Could not open MINI WATT",
                      "Please try again when you are online.",
                    ),
                  );
                }}
                onExportChunk={receiveChunk}
                onExportError={async (message) => exportFailed(message)}
                dom={{
                  style: { flex: 1 },
                  useExpoDOMWebView: false,
                  scrollEnabled: false,
                  webviewDebuggingEnabled: false,
                  incognito: true,
                  cacheEnabled: false,
                  sharedCookiesEnabled: false,
                  thirdPartyCookiesEnabled: false,
                  allowUniversalAccessFromFileURLs: false,
                  allowsLinkPreview: false,
                  onError: () => setViewerError(true),
                  unstable_useExpoModulesBridge: false,
                  onShouldStartLoadWithRequest: (request) =>
                    allowViewerNavigation(
                      request.url,
                      __DEV__,
                      Constants.expoConfig?.hostUri,
                    ),
                  onContentProcessDidTerminate: () => {
                    discardShare();
                    setViewerKey((n) => n + 1);
                  },
                  onRenderProcessGone: () => {
                    discardShare();
                    setViewerKey((n) => n + 1);
                  },
                }}
              />
            </View>
          ) : (
            <ScrollView contentContainerStyle={s.content}>
              <Text style={s.title}>No recorded activities.</Text>
              <Text style={s.copy}>
                Garmin returned no activities for this period. No annual totals
                were generated.
              </Text>
              <Coverage dataset={recap.dataset} />
            </ScrollView>
          )}
        </>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.brand}>MINI WATT · WRAPPED</Text>
          <Text accessibilityRole="header" style={s.title}>
            Your year{String.fromCharCode(10)}in motion.
          </Text>
          <Text style={s.copy}>
            The numbers. The sports. Your standout moments.
          </Text>
          {phase === "import" ? (
            <>
              <ActivityIndicator size="large" color="#ffb35c" />
              <Text accessibilityRole="header" style={s.heading}>
                Finding your highlights
              </Text>
              <Text accessibilityLiveRegion="polite" style={s.copy}>
                {status}
              </Text>
              <Text style={s.small}>
                Keep the app open. Leaving during import cancels it. Your recap
                and records are never saved.
              </Text>
              <Button label="Cancel import" onPress={() => stopImport()} />
            </>
          ) : (
            <>
              <Text nativeID="key-label" style={s.label}>
                GARMIN PERSONAL API KEY
              </Text>
              <TextInput
                accessibilityLabel="Garmin Personal API key"
                style={s.input}
                value={key}
                onChangeText={setKey}
                placeholder="Paste your personal API key"
                placeholderTextColor="#94a5bf"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                returnKeyType="done"
                onSubmitEditing={() => void connect()}
              />
              <Button
                label="Where do I find my key?"
                compact
                onPress={() => setHelp(true)}
              />
              <Toggle
                label="Include daily steps and floors"
                value={steps}
                onChange={setSteps}
              />
              <Toggle
                label="Include health stories: sleep, heart rate and HRV"
                value={health}
                onChange={setHealth}
              />
              <Toggle
                label="Remember my key securely on this device"
                value={remember}
                onChange={(value) => {
                  setRemember(value);
                  if (!value)
                    void rememberedKey
                      .forget()
                      .catch(() =>
                        setError(
                          "The saved key could not be removed. Use Clear data to retry.",
                        ),
                      );
                }}
              />
              <Toggle
                label={`I allow MiniWatt Wrapped to fetch my Garmin activities${steps ? " and daily movement" : ""}${health ? " and health records" : ""} for this recap.`}
                value={consent}
                onChange={setConsent}
              />
              <Text style={s.small}>
                Your key goes directly to Garmin. Your recap stays in memory.
                Health sharing asks separately for each card.
              </Text>
              <Button
                label="Build my recap ↗"
                onPress={() => void connect()}
                primary
              />
              <Button
                label="Explore a fictional example"
                onPress={() => {
                  setKey("");
                  const id = ++epoch.current;
                  showRecap(example, id);
                }}
              />
              <Button
                label="Privacy & clear data"
                compact
                onPress={() => setPrivacy(true)}
              />
            </>
          )}
          {!!error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
        </ScrollView>
      )}
      <Modal
        visible={reading}
        animationType={reduced ? "none" : "slide"}
        onRequestClose={() => setReading(false)}
      >
        <SafeAreaView style={s.screen}>
          <ScrollView contentContainerStyle={s.content}>
            <Text accessibilityRole="header" style={s.heading}>
              {recap?.presentation.stories[selected.current]?.title.join(" ")}
            </Text>
            <Text style={s.copy}>
              {recap?.presentation.stories[selected.current]
                ? describe(recap.presentation.stories[selected.current])
                : ""}
            </Text>
            <Text style={s.copy}>{recap?.presentation.notice}</Text>
            <Button label="Done" primary onPress={() => setReading(false)} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={privacy}
        animationType={reduced ? "none" : "slide"}
        onRequestClose={() => setPrivacy(false)}
      >
        <SafeAreaView style={s.screen}>
          <ScrollView contentContainerStyle={s.content}>
            <Text accessibilityRole="header" style={s.heading}>
              Privacy & coverage
            </Text>
            <Text style={s.copy}>
              MiniWatt Wrapped is an independent MINI WATT project by Nick Smet
              in Kalmthout, Belgium. It is not affiliated with or endorsed by
              Garmin.
            </Text>
            <Text style={s.copy}>
              Your personal key is sent only to Garmin over HTTPS to obtain a
              short-lived bearer token. The token is kept in memory and
              discarded after import. This app has no analytics, ads, cloud
              recap storage or recurring sync.
            </Text>
            <Text style={s.copy}>
              Records and recap stay in memory while this process runs. An
              interrupted import is cancelled. After the app is closed or its
              process is terminated, reconnect to build another recap.
            </Text>
            <Text style={s.copy}>
              Remembering a key is optional. It uses iOS Keychain or Android
              encrypted secure storage, never the viewer's storage. iOS Keychain
              may survive reinstall; use Clear data or revoke the key in Garmin
              to remove access.
            </Text>
            <Text style={s.copy}>
              The viewer receives only the words, values and chart data needed
              to draw cards. Activity identifiers, source evidence, tokens and
              locations stay outside the viewer and exported images.
            </Text>
            <Text style={s.copy}>
              Sharing creates a 1080 × 1920 PNG in app cache. Health cards
              require permission for that card before any share preview is
              generated. Unshared previews are removed on close. Handed-off
              files are kept for receiver compatibility, then removed on the
              first app launch or resume after 24 hours. Clear data removes them
              immediately. Copies saved or shared outside the app cannot be
              recalled.
            </Text>
            <Text style={s.copy}>
              Use the native share sheet to save to Files or a receiving app.
              Availability depends on your device. MiniWatt Wrapped does not
              request access to your photo library, Apple Health or Health
              Connect.
            </Text>
            <Text style={s.copy}>
              Garmin and receiving apps process data under their own policies.
              Support and privacy: info@miniwatt.app.
            </Text>
            <Coverage dataset={recap?.dataset} />
            <Button
              label="Forget saved key"
              onPress={() => {
                setKey("");
                setRemember(false);
                void rememberedKey
                  .forget()
                  .then(() => Alert.alert("Saved key removed"))
                  .catch(() =>
                    Alert.alert(
                      "Could not remove saved key",
                      "Please try Clear data again.",
                    ),
                  );
              }}
            />
            <Button label="Clear all app data" onPress={() => void clear()} />
            <Button label="Done" primary onPress={() => setPrivacy(false)} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={help}
        animationType={reduced ? "none" : "slide"}
        onRequestClose={() => setHelp(false)}
      >
        <SafeAreaView style={s.screen}>
          <ScrollView contentContainerStyle={s.content}>
            <Text accessibilityRole="header" style={s.heading}>
              Your Garmin Personal API key
            </Text>
            <Text style={s.copy}>
              Use a Garmin Personal API key for your own authorized account.
              Your Garmin password is never needed here. Create and manage your
              key in Garmin's official Personal API tools, then paste it into
              this app.
            </Text>
            <Text style={s.copy}>
              Keep the key private. You can revoke it through Garmin. A key that
              works on the website must still be verified on your phone;
              connectivity and Garmin access limits can differ.
            </Text>
            <Button
              label="Open Garmin Personal API"
              onPress={() =>
                void Linking.openURL(
                  "https://connect.garmin.com/app/settings/personalApiToken",
                ).catch(() =>
                  Alert.alert(
                    "Could not open Garmin",
                    "Check your connection and try again.",
                  ),
                )
              }
            />
            <Button label="Done" primary onPress={() => setHelp(false)} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={!!share}
        animationType={reduced ? "none" : "slide"}
        onRequestClose={discardShare}
      >
        <SafeAreaView style={s.screen}>
          <ScrollView contentContainerStyle={s.content}>
            <Text accessibilityRole="header" style={s.heading}>
              {share?.allowed ? "Share this card" : "Share this health card?"}
            </Text>
            <Text style={s.copy}>
              {selectedStory ? describe(selectedStory) : ""}
            </Text>
            {share && !share.allowed ? (
              <>
                <Text style={s.copy}>
                  This card contains health information. Allow a share preview
                  and export of this card? Permission ends when you close this
                  screen or leave the app.
                </Text>
                <Button
                  label="Allow this health card"
                  primary
                  onPress={() => preview(true)}
                />
              </>
            ) : (
              <>
                <Text style={s.small}>
                  1080 × 1920 PNG · only this card's displayed metric and
                  caption
                </Text>
                <View style={s.colors}>
                  {colorways.map((color: string) => (
                    <Button
                      key={color}
                      label={color[0].toUpperCase() + color.slice(1)}
                      selected={share?.colorway === color}
                      onPress={() => {
                        if (share?.busy) return;
                        authority.current?.revoke();
                        if (share?.uri && !handedOff.current.has(share.uri))
                          try {
                            removeExport(share.uri);
                          } catch {}
                        setShare((value) =>
                          value
                            ? {
                                ...value,
                                colorway: color,
                                uri: null,
                                error: "",
                              }
                            : null,
                        );
                      }}
                    />
                  ))}
                </View>
                {share?.busy ? (
                  <>
                    <ActivityIndicator color="#ffb35c" />
                    <Text accessibilityLiveRegion="polite" style={s.copy}>
                      Preparing your card…
                    </Text>
                  </>
                ) : share?.uri ? (
                  <>
                    <Image
                      source={{ uri: share.uri }}
                      accessibilityLabel={`Share preview: ${selectedStory?.title.join(" ")}`}
                      style={s.preview}
                    />
                    <Button
                      label="Open share sheet / save"
                      primary
                      onPress={() => void shareImage()}
                    />
                  </>
                ) : (
                  <Button
                    label="Prepare share preview"
                    primary
                    onPress={() => preview()}
                  />
                )}
              </>
            )}
            {!!share?.error && (
              <Text accessibilityRole="alert" style={s.error}>
                {share.error}
              </Text>
            )}
            <Button label="Close & remove preview" onPress={discardShare} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {!active && !sharing.current && (
        <View
          style={s.privacyCover}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={s.brand}>MINI WATT · WRAPPED</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
function Button({
  label,
  onPress,
  primary = false,
  compact = false,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  compact?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        primary && s.primary,
        compact && s.compact,
        selected && s.selected,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[s.buttonText, primary && { color: "#0b1222" }]}>
        {label}
      </Text>
    </Pressable>
  );
}
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={s.toggle}>
      <Text style={[s.copy, { flex: 1 }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: "#c57027", false: "#45536e" }}
        thumbColor={value ? "#ffca87" : "#e2e9f5"}
      />
    </View>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b1222" },
  nativeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  brandSmall: {
    color: "#ffb35c",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  viewer: { flex: 1 },
  content: { padding: 24, paddingBottom: 40, flexGrow: 1, gap: 18 },
  brand: {
    color: "#ffb35c",
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 18,
  },
  title: { color: "#fff", fontSize: 44, fontWeight: "800", lineHeight: 49 },
  heading: { color: "#fff", fontSize: 25, fontWeight: "700" },
  copy: { color: "#d0d9ed", fontSize: 15, lineHeight: 23 },
  small: { color: "#acbdd8", fontSize: 12, lineHeight: 19 },
  label: {
    color: "#bdcbe0",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 8,
  },
  input: {
    minHeight: 52,
    backgroundColor: "#17243d",
    color: "#fff",
    padding: 16,
    borderRadius: 10,
    fontSize: 16,
  },
  toggle: { flexDirection: "row", alignItems: "center", gap: 12 },
  button: {
    minHeight: 48,
    backgroundColor: "#17243d",
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  compact: { backgroundColor: "transparent", paddingHorizontal: 8 },
  primary: { backgroundColor: "#ffb35c" },
  selected: { borderWidth: 2, borderColor: "#ffb35c" },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },
  error: { color: "#ffbcc8", fontSize: 15, lineHeight: 23 },
  colors: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  preview: {
    width: "100%",
    aspectRatio: 9 / 16,
    resizeMode: "contain",
    maxHeight: 560,
  },
  privacyCover: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0b1222",
    alignItems: "center",
    justifyContent: "center",
  },
});
