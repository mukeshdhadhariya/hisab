import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSignIn, useSSO } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { FontAwesome, Ionicons } from "@expo/vector-icons";

import AuthLogo from "@/components/AuthLogo";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [showPassword, setShowPassword] = React.useState(false);

  const [error, setError] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");

  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] =
    React.useState(false);

  // --------------------------------------------------
  // CLERK ERROR HANDLER
  // --------------------------------------------------

  const handleAuthError = React.useCallback(
    (err, fallbackMessage) => {
      console.error(
        "========== CLERK AUTH ERROR =========="
      );

      /*
       * Do NOT rely only on:
       *
       * JSON.stringify(err)
       *
       * Clerk error objects can serialize to {}
       * even though useful properties exist.
       */

      console.error("RAW ERROR:", err);
      console.error("ERROR NAME:", err?.name);
      console.error("ERROR MESSAGE:", err?.message);
      console.error("ERROR STATUS:", err?.status);
      console.error(
        "CLERK TRACE ID:",
        err?.clerkTraceId
      );
      console.error("ERROR CODE:", err?.code);
      console.error("ERRORS:", err?.errors);

      const clerkError = err?.errors?.[0];

      if (clerkError) {
        console.error(
          "CLERK ERROR CODE:",
          clerkError?.code
        );

        console.error(
          "CLERK ERROR MESSAGE:",
          clerkError?.message
        );

        console.error(
          "CLERK ERROR LONG MESSAGE:",
          clerkError?.longMessage
        );

        console.error(
          "CLERK ERROR META:",
          clerkError?.meta
        );

        setError(
          clerkError?.longMessage ||
            clerkError?.message ||
            fallbackMessage
        );

        return;
      }

      if (err?.message) {
        setError(err.message);
        return;
      }

      setError(fallbackMessage);
    },
    []
  );

  // --------------------------------------------------
  // COMPLETE SIGN IN
  // --------------------------------------------------

  const completeSignIn = async (sessionId) => {
    if (!sessionId) {
      console.error(
        "Clerk sign-in completed without a session ID."
      );

      setError(
        "Sign-in completed, but no session was created. Please try again."
      );

      return false;
    }

    try {
      console.log(
        "Activating Clerk session:",
        sessionId
      );

      await setActive({
        session: sessionId,
      });

      console.log(
        "Clerk session activated successfully."
      );

      router.replace("/");

      return true;
    } catch (err) {
      console.error(
        "========== SESSION ACTIVATION ERROR =========="
      );

      console.error("SESSION ERROR:", err);

      handleAuthError(
        err,
        "Your sign-in was successful, but we could not activate your session."
      );

      return false;
    }
  };

  // --------------------------------------------------
  // EMAIL + PASSWORD SIGN IN
  // --------------------------------------------------

  const onSignInPress = async () => {
    if (!isLoaded || isSigningIn) {
      return;
    }

    setError("");
    setSuccessMessage("");

    const cleanEmail = emailAddress.trim();

    /*
     * IMPORTANT:
     *
     * Never trim passwords.
     *
     * If the user's password intentionally contains
     * spaces, trimming would change the password.
     */
    const cleanPassword = password;

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!cleanPassword) {
      setError("Please enter your password.");
      return;
    }

    /*
     * Basic email validation.
     */
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    setIsSigningIn(true);

    try {
      console.log(
        "========== CLERK SIGN IN START =========="
      );

      console.log(
        "1. Creating password sign-in..."
      );

      console.log(
        "Identifier:",
        cleanEmail
      );

      /*
       * IMPORTANT FIX
       *
       * Explicitly tell Clerk that this is a
       * password authentication attempt.
       */
      const signInAttempt = await signIn.create({
        strategy: "password",
        identifier: cleanEmail,
        password: cleanPassword,
      });

      console.log(
        "2. SIGN-IN RESULT:",
        signInAttempt
      );

      console.log(
        "Sign-in status:",
        signInAttempt?.status
      );

      // ------------------------------------------------
      // NORMAL SUCCESS
      // ------------------------------------------------

      if (signInAttempt?.status === "complete") {
        console.log(
          "3. Password sign-in completed."
        );

        await completeSignIn(
          signInAttempt.createdSessionId
        );

        return;
      }

      // ------------------------------------------------
      // ADDITIONAL VERIFICATION
      // ------------------------------------------------

      if (
        signInAttempt?.status ===
        "needs_second_factor"
      ) {
        /*
         * In Clerk's legacy SignIn API, the supported
         * second-factor strategies are not email_code.
         *
         * We therefore don't incorrectly call:
         *
         * prepareSecondFactor({
         *   strategy: "email_code"
         * })
         *
         * Instead, tell the user that another configured
         * factor is required.
         */

        console.log(
          "Additional second-factor verification required."
        );

        console.log(
          "Supported second factors:",
          signInAttempt?.supportedSecondFactors
        );

        setError(
          "Additional verification is required for this account. Please use your configured MFA method."
        );

        return;
      }

      // ------------------------------------------------
      // CLIENT TRUST
      // ------------------------------------------------

      if (
        signInAttempt?.status ===
        "needs_client_trust"
      ) {
        console.log(
          "Clerk requires client trust verification."
        );

        setError(
          "This device requires additional verification before you can sign in."
        );

        return;
      }

      // ------------------------------------------------
      // NEW PASSWORD REQUIRED
      // ------------------------------------------------

      if (
        signInAttempt?.status ===
        "needs_new_password"
      ) {
        console.log(
          "Clerk requires the user to set a new password."
        );

        setError(
          "Your password needs to be updated before you can sign in."
        );

        return;
      }

      // ------------------------------------------------
      // UNKNOWN INCOMPLETE STATE
      // ------------------------------------------------

      console.error(
        "Incomplete Clerk sign-in:",
        signInAttempt
      );

      setError(
        "Sign-in could not be completed. Please try again."
      );
    } catch (err) {
      handleAuthError(
        err,
        "Unable to sign in. Please check your email and password."
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  // --------------------------------------------------
  // GOOGLE SIGN IN
  // --------------------------------------------------

  const onGooglePress = async () => {
    if (isGoogleLoading) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsGoogleLoading(true);

    try {
      console.log(
        "========== CLERK GOOGLE SIGN IN =========="
      );

      const {
        createdSessionId,
        setActive: setSSOActive,
      } = await startSSOFlow({
        strategy: "oauth_google",

        /*
         * React Native Web:
         * use the browser origin.
         *
         * Native:
         * let Clerk handle the native OAuth flow.
         */
        redirectUrl:
          Platform.OS === "web"
            ? window.location.origin
            : Linking.createURL("/"),
      });

      console.log(
        "Google OAuth session:",
        createdSessionId
      );

      if (createdSessionId) {
        await setSSOActive({
          session: createdSessionId,
        });

        console.log(
          "Google session activated successfully."
        );

        router.replace("/");

        return;
      }

      setError(
        "Google sign-in could not be completed. Please try again."
      );
    } catch (err) {
      handleAuthError(
        err,
        "Google sign-in failed. Please try again."
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // --------------------------------------------------
  // LOADING SCREEN
  // --------------------------------------------------

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingLogoContainer}>
          <AuthLogo />
        </View>

        <ActivityIndicator
          size="small"
          color="#4A6CF7"
        />

        <Text style={styles.loadingText}>
          Loading authentication...
        </Text>
      </View>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* ------------------------------------------ */}
          {/* HEADER */}
          {/* ------------------------------------------ */}

          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <AuthLogo />
            </View>

            <Text style={styles.title}>
              Welcome back
            </Text>

            <Text style={styles.subtitle}>
              Sign in to continue managing your
              expenses.
            </Text>
          </View>

          {/* ------------------------------------------ */}
          {/* ERROR */}
          {/* ------------------------------------------ */}

          {error ? (
            <View style={styles.errorBox}>
              <View style={styles.messageIcon}>
                <Ionicons
                  name="alert-circle"
                  size={19}
                  color="#B42318"
                />
              </View>

              <Text style={styles.errorText}>
                {error}
              </Text>

              <Pressable
                onPress={() => setError("")}
                hitSlop={10}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color="#B42318"
                />
              </Pressable>
            </View>
          ) : null}

          {/* ------------------------------------------ */}
          {/* SUCCESS */}
          {/* ------------------------------------------ */}

          {successMessage ? (
            <View style={styles.successBox}>
              <Ionicons
                name="checkmark-circle"
                size={19}
                color="#027A48"
              />

              <Text style={styles.successText}>
                {successMessage}
              </Text>
            </View>
          ) : null}

          {/* ------------------------------------------ */}
          {/* GOOGLE */}
          {/* ------------------------------------------ */}

          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed &&
                styles.googleButtonPressed,
              isGoogleLoading &&
                styles.buttonDisabled,
            ]}
            onPress={onGooglePress}
            disabled={
              isGoogleLoading ||
              isSigningIn
            }
          >
            {isGoogleLoading ? (
              <ActivityIndicator
                size="small"
                color="#4285F4"
              />
            ) : (
              <FontAwesome
                name="google"
                size={18}
                color="#4285F4"
              />
            )}

            <Text style={styles.googleButtonText}>
              {isGoogleLoading
                ? "Connecting..."
                : "Continue with Google"}
            </Text>
          </Pressable>

          {/* ------------------------------------------ */}
          {/* DIVIDER */}
          {/* ------------------------------------------ */}

          <View style={styles.dividerRow}>
            <View style={styles.divider} />

            <View style={styles.dividerBadge}>
              <Text style={styles.dividerText}>
                OR
              </Text>
            </View>

            <View style={styles.divider} />
          </View>

          {/* ------------------------------------------ */}
          {/* EMAIL */}
          {/* ------------------------------------------ */}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Email address
            </Text>

            <View
              style={[
                styles.inputContainer,
                error &&
                  styles.inputContainerNormal,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color="#667085"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                value={emailAddress}
                placeholder="you@example.com"
                placeholderTextColor="#98A2B3"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType="next"
                onChangeText={(value) => {
                  setEmailAddress(value);

                  if (error) {
                    setError("");
                  }
                }}
              />
            </View>
          </View>

          {/* ------------------------------------------ */}
          {/* PASSWORD */}
          {/* ------------------------------------------ */}

          <View style={styles.field}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.fieldLabel}>
                Password
              </Text>

              {/* Keep this as visual text for now.
                  Add password-reset flow separately. */}
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#667085"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                value={password}
                placeholder="Enter your password"
                placeholderTextColor="#98A2B3"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onChangeText={(value) => {
                  setPassword(value);

                  if (error) {
                    setError("");
                  }
                }}
                onSubmitEditing={onSignInPress}
              />

              <Pressable
                onPress={() =>
                  setShowPassword(
                    (previous) => !previous
                  )
                }
                style={styles.eyeButton}
                hitSlop={8}
              >
                <Ionicons
                  name={
                    showPassword
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={21}
                  color="#667085"
                />
              </Pressable>
            </View>
          </View>

          {/* ------------------------------------------ */}
          {/* SIGN IN BUTTON */}
          {/* ------------------------------------------ */}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed &&
                styles.buttonPressed,
              isSigningIn &&
                styles.buttonDisabled,
            ]}
            onPress={onSignInPress}
            disabled={
              isSigningIn ||
              isGoogleLoading
            }
          >
            {isSigningIn ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text
                  style={styles.buttonText}
                >
                  Signing in...
                </Text>
              </>
            ) : (
              <>
                <Text
                  style={styles.buttonText}
                >
                  Sign in
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color="#FFFFFF"
                />
              </>
            )}
          </Pressable>

          {/* ------------------------------------------ */}
          {/* SECURITY NOTE */}
          {/* ------------------------------------------ */}

          <View style={styles.securityRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color="#667085"
            />

            <Text style={styles.securityText}>
              Your account is protected by Clerk
              authentication.
            </Text>
          </View>

          {/* ------------------------------------------ */}
          {/* SIGN UP */}
          {/* ------------------------------------------ */}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?
            </Text>

            <Link
              href="/sign-up"
              asChild
            >
              <Pressable>
                <Text style={styles.link}>
                  Sign up
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
  },

  card: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingLogoContainer: {
    marginBottom: 22,
  },

  loadingText: {
    marginTop: 12,
    color: "#667085",
    fontSize: 14,
  },

  // --------------------------------------------------
  // HEADER
  // --------------------------------------------------

  header: {
    alignItems: "center",
    marginBottom: 28,
  },

  logoWrapper: {
    marginBottom: 8,
  },

  title: {
    color: "#101828",
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },

  subtitle: {
    color: "#667085",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 330,
  },

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3F2",
    borderWidth: 1,
    borderColor: "#FDA29B",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 16,
  },

  messageIcon: {
    marginRight: 8,
  },

  errorText: {
    flex: 1,
    color: "#B42318",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    marginRight: 8,
  },

  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF3",
    borderWidth: 1,
    borderColor: "#ABEFC6",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },

  successText: {
    flex: 1,
    color: "#027A48",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },

  // --------------------------------------------------
  // GOOGLE
  // --------------------------------------------------

  googleButton: {
    minHeight: 54,
    width: "100%",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
  },

  googleButtonPressed: {
    opacity: 0.75,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  googleButtonText: {
    color: "#1D2939",
    fontSize: 16,
    fontWeight: "600",
  },

  // --------------------------------------------------
  // DIVIDER
  // --------------------------------------------------

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 22,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E4E7EC",
  },

  dividerBadge: {
    paddingHorizontal: 14,
  },

  dividerText: {
    color: "#98A2B3",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },

  // --------------------------------------------------
  // FIELDS
  // --------------------------------------------------

  field: {
    width: "100%",
    marginBottom: 17,
  },

  fieldLabel: {
    color: "#344054",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    marginBottom: 8,
  },

  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  inputContainer: {
    width: "100%",
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 12,
  },

  inputContainerNormal: {
    borderColor: "#D0D5DD",
  },

  inputIcon: {
    marginLeft: 15,
    marginRight: 9,
  },

  input: {
    flex: 1,
    height: "100%",
    color: "#101828",
    fontSize: 16,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },

  eyeButton: {
    height: "100%",
    width: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  // --------------------------------------------------
  // MAIN BUTTON
  // --------------------------------------------------

  button: {
    minHeight: 54,
    width: "100%",
    borderRadius: 12,
    backgroundColor: "#4A6CF7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 4,

    shadowColor: "#4A6CF7",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // SECURITY
  // --------------------------------------------------

  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 10,
    gap: 6,
  },

  securityText: {
    color: "#667085",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  // --------------------------------------------------
  // FOOTER
  // --------------------------------------------------

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
  },

  footerText: {
    color: "#667085",
    fontSize: 14,
  },

  link: {
    color: "#4A6CF7",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 5,
  },
});