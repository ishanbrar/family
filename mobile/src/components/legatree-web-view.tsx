import * as Haptics from "expo-haptics";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";

import { getAppWebUrl } from "@/lib/config";
import { HAPTICS_INJECTED_SCRIPT } from "@/lib/haptics-inject";

type HapticStyle = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error";

function triggerHaptic(style: HapticStyle) {
  if (Platform.OS === "web") return;
  switch (style) {
    case "heavy":
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case "medium":
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case "selection":
      void Haptics.selectionAsync();
      break;
    case "success":
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case "warning":
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case "error":
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    default:
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function isAllowedOrigin(url: string, appOrigin: string): boolean {
  try {
    const parsed = new URL(url);
    const allowed = new URL(appOrigin);
    if (parsed.origin === allowed.origin) return true;
    if (parsed.hostname.endsWith(".supabase.co")) return true;
    if (parsed.hostname === "accounts.google.com") return true;
    return false;
  } catch {
    return false;
  }
}

export function LegatreeWebView() {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const appUrl = getAppWebUrl();
  const [entryUrl] = useState(`${appUrl}/dashboard`);
  const [canGoBack, setCanGoBack] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const onNavigationStateChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
    setLoadError(null);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    triggerHaptic("light");
    webRef.current?.reload();
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        style?: HapticStyle;
      };
      if (payload.type === "haptic") {
        triggerHaptic(payload.style ?? "light");
      }
    } catch {
      // ignore non-JSON messages
    }
  }, []);

  if (loadError) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>Could not load Legatree</Text>
        <Text style={styles.errorBody}>{loadError}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            triggerHaptic("medium");
            setLoadError(null);
            webRef.current?.reload();
          }}>
          <Text style={styles.retryLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <WebView
        ref={webRef}
        source={{ uri: entryUrl }}
        style={styles.webview}
        onNavigationStateChange={onNavigationStateChange}
        onMessage={onMessage}
        injectedJavaScriptBeforeContentLoaded={HAPTICS_INJECTED_SCRIPT}
        injectedJavaScript={HAPTICS_INJECTED_SCRIPT}
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        pullToRefreshEnabled={Platform.OS === "ios"}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#9caf88" />
          </View>
        )}
        onError={(syntheticEvent) => {
          setLoadError(syntheticEvent.nativeEvent.description || "Network error");
        }}
        onHttpError={(syntheticEvent) => {
          if (syntheticEvent.nativeEvent.statusCode >= 400) {
            setLoadError(`HTTP ${syntheticEvent.nativeEvent.statusCode}`);
          }
        }}
        onShouldStartLoadWithRequest={(request) => {
          if (isAllowedOrigin(request.url, appUrl)) return true;
          return false;
        }}
        onLoadEnd={() => {
          webRef.current?.injectJavaScript(HAPTICS_INJECTED_SCRIPT);
        }}
      />
      {canGoBack ? (
        <Pressable
          accessibilityLabel="Go back"
          style={[styles.backFab, { top: insets.top + 8 }]}
          onPress={() => {
            triggerHaptic("light");
            webRef.current?.goBack();
          }}>
          <Text style={styles.backFabLabel}>‹</Text>
        </Pressable>
      ) : null}
      {Platform.OS === "android" ? (
        <ScrollView
          style={styles.refreshOverlay}
          contentContainerStyle={styles.refreshOverlayContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9caf88" />
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eef5ee" },
  webview: { flex: 1, backgroundColor: "#eef5ee" },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef5ee",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#eef5ee",
  },
  errorTitle: { fontSize: 20, fontWeight: "600", color: "#1a2e1a", marginBottom: 8 },
  errorBody: { fontSize: 15, color: "#4a5c4a", textAlign: "center", marginBottom: 20 },
  retryButton: {
    backgroundColor: "#9caf88",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryLabel: { color: "#fff", fontWeight: "600", fontSize: 16 },
  backFab: {
    position: "absolute",
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  backFabLabel: { fontSize: 28, lineHeight: 30, color: "#1a2e1a", marginTop: -2 },
  refreshOverlay: { position: "absolute", top: 0, left: 0, right: 0, height: 80 },
  refreshOverlayContent: { flex: 1 },
});
