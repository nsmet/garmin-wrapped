import React from "react";
import { jest, test, expect, beforeEach } from "@jest/globals";
import {
  AppState,
  BackHandler,
  View,
  Text,
  Pressable,
  Alert,
} from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import App from "../../App";
import { collectRecap } from "../../src/importer.mjs";
import { dataset as example } from "../../vendor/public/sample-data.mjs";
import { rememberedKey, sweepExports } from "../../src/native-storage";
let mockViewerProps: any;
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
jest.mock(
  "../../Viewer",
  () =>
    function FakeViewer(props: any) {
      mockViewerProps = props;
      const React = require("react");
      const { View, Text, Pressable } = require("react-native");
      return (
        <View>
          <Text>Native viewer</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Test share"
            onPress={() =>
              props.onShare({
                generation: props.presentation.generation,
                id: props.presentation.stories.find((s: any) => s.health).id,
              })
            }
          >
            <Text>Test share</Text>
          </Pressable>
        </View>
      );
    },
);
jest.mock("../../src/importer.mjs", () => ({ collectRecap: jest.fn() }));
jest.mock("../../src/native-storage", () => ({
  rememberedKey: {
    read: jest.fn(async () => null),
    forget: jest.fn(async () => {}),
    save: jest.fn(async () => {}),
  },
  sweepExports: jest.fn(),
  removeExport: jest.fn(),
  writeExport: jest.fn(async () => "file:///synthetic.png"),
}));
jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));
jest.mock("expo-screen-capture", () => ({
  enableAppSwitcherProtectionAsync: jest.fn(async () => {}),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockViewerProps = null;
  Object.defineProperty(AppState, "currentState", {
    configurable: true,
    value: "active",
    writable: true,
  });
});
async function startImport() {
  await fireEvent.changeText(
    screen.getByLabelText("Garmin Personal API key"),
    "synthetic-personal-key",
  );
  await fireEvent(
    screen.getByLabelText(/I allow MiniWatt/),
    "valueChange",
    true,
  );
  await fireEvent.press(screen.getByText("Build my recap ↗"));
}
test("cancelling an import prevents a late result from restoring a cleared recap", async () => {
  let resolve: any;
  const pending = new Promise<any>((r) => {
    resolve = r;
  });
  jest.mocked(collectRecap).mockReturnValue(pending);
  await render(<App />);
  await waitFor(() => expect(rememberedKey.read).toHaveBeenCalled());
  await startImport();
  await screen.findByText("Finding your highlights");
  await fireEvent.press(screen.getByText("Cancel import"));
  await act(async () => {
    resolve(example);
  });
  expect(screen.queryByText("Native viewer")).toBeNull();
  expect(
    screen.getByText("Import cancelled. No recap was saved."),
  ).toBeTruthy();
});
test("the import deadline exits even when secure-storage deletion is stalled", async () => {
  jest.useFakeTimers();
  let releaseStorage: any;
  jest.mocked(rememberedKey.forget).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        releaseStorage = resolve;
      }),
  );
  try {
    await render(<App />);
    await startImport();
    expect(screen.getByText("Finding your highlights")).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(300000);
    });
    expect(
      screen.getByText(/The import timed out after five minutes/),
    ).toBeTruthy();
    expect(screen.queryByText("Finding your highlights")).toBeNull();
    await act(async () => {
      releaseStorage();
    });
    expect(collectRecap).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});
test("unsupported native date formatting fails before deriving the year or importing", async () => {
  const parts = jest
    .spyOn(Intl.DateTimeFormat.prototype, "formatToParts")
    .mockReturnValue([]);
  try {
    await render(<App />);
    await startImport();
    await screen.findByText(/This device cannot format recap dates/);
    expect(collectRecap).not.toHaveBeenCalled();
  } finally {
    parts.mockRestore();
  }
});
test("backgrounding during import cancels it and drops a late result", async () => {
  let listener: any;
  const original = AppState.addEventListener;
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((type, callback) => {
      if (type === "change") listener = callback;
      return { remove: jest.fn() };
    });
  let resolve: any;
  jest.mocked(collectRecap).mockReturnValue(
    new Promise<any>((r) => {
      resolve = r;
    }),
  );
  await render(<App />);
  await startImport();
  await act(async () => listener("background"));
  expect(jest.mocked(collectRecap).mock.calls[0]?.[0]?.signal?.aborted).toBe(
    true,
  );
  await act(async () => {
    resolve(example);
  });
  expect(screen.queryByText("Native viewer")).toBeNull();
  AppState.addEventListener = original;
});
test("native code passes no source records to the viewer and clear-data removes the saved key and cache", async () => {
  jest.mocked(collectRecap).mockResolvedValue(example);
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(<App />);
  await startImport();
  await screen.findByText("Native viewer");
  const text = JSON.stringify(mockViewerProps.presentation);
  expect(text).not.toMatch(/activityAudit|evidence|fictional-1|utc|token/);
  await fireEvent.press(screen.getByText("Clear data"));
  const buttons = alert.mock.calls.at(-1)?.[2];
  await act(async () => {
    buttons?.find((b) => b.text === "Clear data")?.onPress?.();
  });
  await waitFor(() => expect(screen.queryByText("Native viewer")).toBeNull());
  expect(rememberedKey.forget).toHaveBeenCalled();
  expect(sweepExports).toHaveBeenCalledWith(true);
  alert.mockRestore();
});
test("a health share has no export command before explicit per-card consent", async () => {
  const realMode = {
    ...example,
    exampleOnly: false,
    chapters: example.chapters.map((c: any) => ({
      ...c,
      stories: c.stories.map((s: any) => ({
        ...s,
        evidence: ["synthetic:valid"],
      })),
    })),
  };
  jest.mocked(collectRecap).mockResolvedValue(realMode);
  await render(<App />);
  await startImport();
  await screen.findByText("Native viewer");
  await fireEvent.press(screen.getByText("Test share"));
  await screen.findByText("Share this health card?");
  expect(mockViewerProps.exportRequest).toBeNull();
  await fireEvent.press(screen.getByText("Allow this health card"));
  await waitFor(() => expect(mockViewerProps.exportRequest).not.toBeNull());
  expect(mockViewerProps.exportRequest.card).not.toHaveProperty("evidence");
  await fireEvent.press(screen.getByText("Close & remove preview"));
  await waitFor(() => expect(mockViewerProps.exportRequest).toBeNull());
});

test("Android Back dismisses a viewer chapter dialog before leaving the recap", async () => {
  let back: any;
  const subscription = jest
    .spyOn(BackHandler, "addEventListener")
    .mockImplementation((event, listener) => {
      back = listener;
      return { remove: jest.fn() };
    });
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(<App />);
  await fireEvent.press(screen.getByText("Explore a fictional example"));
  await screen.findByText("Native viewer");
  await act(async () => {
    await mockViewerProps.onDialogChange({
      generation: mockViewerProps.presentation.generation,
      open: true,
    });
    back();
  });
  expect(mockViewerProps.dismissDialog).toBe(1);
  expect(alert).not.toHaveBeenCalled();
  subscription.mockRestore();
  alert.mockRestore();
});
