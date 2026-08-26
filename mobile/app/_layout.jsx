import { Slot } from "expo-router";
import { Text, View } from "react-native";

import {
  ClerkProvider,
} from "@clerk/clerk-expo";

import {
  tokenCache,
} from "@clerk/clerk-expo/token-cache";

import SafeScreen from "@/components/SafeScreen";

import {
  ThemeProvider,
} from "@/context/ThemeContext";

import { TransactionsProvider } from "@/context/TransactionsContext";

const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// ==========================================================
// MISSING CLERK KEY
// ==========================================================

function MissingClerkKeyScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        backgroundColor: "#F8FAFC",
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          marginBottom: 12,
          color: "#0F172A",
          textAlign: "center",
        }}
      >
        Clerk key not configured
      </Text>

      <Text
        style={{
          fontSize: 15,
          textAlign: "center",
          lineHeight: 22,
          color: "#667085",
        }}
      >
        Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
        to mobile/.env and restart the Expo
        development server.
      </Text>
    </View>
  );
}

// ==========================================================
// APP CONTENT
// ==========================================================

function AppContent() {
  return (
    <SafeScreen>
      <Slot />
    </SafeScreen>
  );
}

// ==========================================================
// ROOT LAYOUT
// ==========================================================

export default function RootLayout() {
  if (!clerkPublishableKey) {
    return <MissingClerkKeyScreen />;
  }

  if (
    !clerkPublishableKey.startsWith("pk_test_") &&
    !clerkPublishableKey.startsWith("pk_live_")
  ) {
    console.warn(
      "[Clerk] Invalid publishable key format."
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      tokenCache={tokenCache}
    >
      <ThemeProvider>
        <TransactionsProvider>
          <AppContent />
        </TransactionsProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}