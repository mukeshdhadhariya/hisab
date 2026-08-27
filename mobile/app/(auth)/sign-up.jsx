import * as React from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSignUp, useSSO } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import AuthLogo from "@/components/AuthLogo";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";

WebBrowser.maybeCompleteAuthSession();

const onboardingHighlights = [
  "Fast social sign-up",
  "Secure email verification",
  "Track expenses from day one",
];

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { startSSOFlow } = useSSO();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [pendingVerification, setPendingVerification] =
    React.useState(false);

  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");

  const [showPassword, setShowPassword] = React.useState(false);

  const [isSigningUp, setIsSigningUp] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  /**
   * Convert Clerk's error into a useful UI message.
   *
   * IMPORTANT:
   * We also log the complete Clerk error because that is what
   * we need when debugging Clerk configuration problems.
   */
  const handleAuthError = React.useCallback(
    (err, fallbackMessage) => {
      console.error(
        "========== CLERK AUTH ERROR =========="
      );

      console.error(
        JSON.stringify(err, null, 2)
      );

      const clerkError = err?.errors?.[0];

      if (clerkError) {
        console.error("Clerk error code:", clerkError.code);
        console.error(
          "Clerk error message:",
          clerkError.message
        );
        console.error(
          "Clerk error longMessage:",
          clerkError.longMessage
        );

        setError(
          clerkError.longMessage ||
            clerkError.message ||
            fallbackMessage
        );

        return;
      }

      if (err instanceof Error) {
        setError(err.message);
        return;
      }

      setError(fallbackMessage);
    },
    []
  );

  /**
   * SIGN UP
   *
   * Clerk legacy flow:
   *
   * signUp.create()
   *        ↓
   * prepareEmailAddressVerification()
   *        ↓
   * show OTP screen
   */
  const onSignUpPress = async () => {
    if (!isLoaded || isSigningUp) return;

    setError("");
    setSuccessMessage("");

    const cleanEmail = emailAddress.trim();

    // IMPORTANT:
    // Do NOT trim passwords.
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword) {
      setError("Please enter both email and password.");
      return;
    }

    setIsSigningUp(true);

    try {
      console.log(
        "========== CLERK SIGNUP START =========="
      );

      console.log("Email:", cleanEmail);

      /**
       * STEP 1
       * Create Clerk signup attempt.
       */
      console.log("1. Creating signup...");

      const signupResult = await signUp.create({
        emailAddress: cleanEmail,
        password: cleanPassword,
      });

      console.log(
        "2. SIGNUP CREATED:",
        JSON.stringify(signupResult, null, 2)
      );

      /**
       * STEP 2
       * Ask Clerk to send email OTP.
       */
      console.log(
        "3. Preparing email verification..."
      );

      const verificationResult =
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });

      console.log(
        "4. VERIFICATION PREPARED:",
        JSON.stringify(
          verificationResult,
          null,
          2
        )
      );

      /**
       * STEP 3
       * Display OTP screen.
       */
      setCode("");
      setPendingVerification(true);

      console.log(
        "5. OTP screen displayed successfully."
      );
    } catch (err) {
      handleAuthError(
        err,
        "Unable to create your account. Please try again."
      );
    } finally {
      setIsSigningUp(false);
    }
  };

  /**
   * VERIFY EMAIL OTP
   */
  const onVerifyPress = async () => {
    if (!isLoaded || isVerifying) return;

    setError("");
    setSuccessMessage("");

    const cleanCode = code.replace(/\s/g, "");

    if (!cleanCode) {
      setError("Please enter the verification code.");
      return;
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setIsVerifying(true);

    try {
      console.log(
        "========== CLERK OTP VERIFICATION =========="
      );

      console.log("OTP:", cleanCode);

      /**
       * Verify the email OTP.
       */
      const signUpAttempt =
        await signUp.attemptEmailAddressVerification({
          code: cleanCode,
        });

      console.log(
        "OTP RESULT:",
        JSON.stringify(
          signUpAttempt,
          null,
          2
        )
      );

      console.log(
        "Signup status:",
        signUpAttempt.status
      );

      /**
       * SUCCESS
       */
      if (signUpAttempt.status === "complete") {
        console.log(
          "Signup completed successfully."
        );

        if (!signUpAttempt.createdSessionId) {
          console.error(
            "Signup completed but createdSessionId is missing."
          );

          setError(
            "Account verified, but the session could not be created. Please sign in."
          );

          return;
        }

        await setActive({
          session: signUpAttempt.createdSessionId,
        });

        console.log(
          "Clerk session activated."
        );

        router.replace("/");
        return;
      }

      /**
       * Clerk did not finish the signup.
       */
      console.log(
        "Signup is not complete:",
        JSON.stringify(
          signUpAttempt,
          null,
          2
        )
      );

      setError(
        "Verification was received, but your signup still requires another step."
      );
    } catch (err) {
      handleAuthError(
        err,
        "Invalid or expired verification code. Please try again."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * RESEND EMAIL OTP
   */
  const onResendCodePress = async () => {
    if (!isLoaded || isResending) return;

    setError("");
    setSuccessMessage("");
    setIsResending(true);

    try {
      console.log(
        "========== CLERK RESEND OTP =========="
      );

      const result =
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });

      console.log(
        "OTP RESEND RESULT:",
        JSON.stringify(
          result,
          null,
          2
        )
      );

      setCode("");
      setSuccessMessage(
        "A new verification code has been sent to your email."
      );
    } catch (err) {
      handleAuthError(
        err,
        "Could not resend the verification code. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  /**
   * GO BACK TO EMAIL/PASSWORD FORM
   */
  const onChangeEmailPress = () => {
    setPendingVerification(false);
    setCode("");
    setError("");
    setSuccessMessage("");
  };

  /**
   * GOOGLE SIGN UP
   */
  const onGooglePress = async () => {
    if (isGoogleLoading) return;

    setError("");
    setSuccessMessage("");
    setIsGoogleLoading(true);

    try {
      const {
        createdSessionId,
        setActive: setSSOActive,
      } = await startSSOFlow({
        strategy: "oauth_google",

        /**
         * Web:
         * use current browser origin.
         *
         * Native:
         * let Clerk handle the native flow.
         */
        redirectUrl:
          Platform.OS === "web"
            ? window.location.origin
            : Linking.createURL("/"),
      });

      if (createdSessionId) {
        await setSSOActive({
          session: createdSessionId,
        });

        router.replace("/");
        return;
      }

      setError(
        "Google sign-up could not be completed. Please try again."
      );
    } catch (err) {
      handleAuthError(
        err,
        "Google sign-up failed. Please try again."
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  /**
   * OTP SCREEN
   */
  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <AuthLogo />

            <Text style={styles.title}>
              Check your inbox
            </Text>

            <Text style={styles.subtitle}>
              We sent a verification code to:
            </Text>

            <Text style={styles.emailText}>
              {emailAddress.trim()}
            </Text>

            <Text style={styles.subtitle}>
              Enter the 6-digit code below to
              activate your account.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#b42318"
                />

                <Text style={styles.errorText}>
                  {error}
                </Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successBox}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#027a48"
                />

                <Text
                  style={styles.successText}
                >
                  {successMessage}
                </Text>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>
              Verification code
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.verificationInput,
              ]}
              value={code}
              placeholder="6-digit code"
              placeholderTextColor="#98a2b3"
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              onChangeText={(value) => {
                const digitsOnly =
                  value.replace(/\D/g, "");

                setCode(
                  digitsOnly.slice(0, 6)
                );
              }}
            />

            <TouchableOpacity
              style={[
                styles.button,
                isVerifying &&
                  styles.buttonDisabled,
              ]}
              onPress={onVerifyPress}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  Verify and continue
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onResendCodePress}
              disabled={isResending}
            >
              {isResending ? (
                <ActivityIndicator />
              ) : (
                <Text
                  style={styles.secondaryButtonText}
                >
                  Resend verification code
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.changeEmailButton}
              onPress={onChangeEmailPress}
            >
              <Text
                style={styles.changeEmailText}
              >
                Use a different email address
              </Text>
            </TouchableOpacity>

            <Text style={styles.helperText}>
              If you don't see the email, check
              your spam or junk folder.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /**
   * NORMAL SIGNUP SCREEN
   */
  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <AuthLogo />

          <Text style={styles.title}>
            Create your account
          </Text>

          <Text style={styles.subtitle}>
            Start tracking your expenses today.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#b42318"
              />

              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>
            Email address
          </Text>

          <TextInput
            style={styles.input}
            value={emailAddress}
            placeholder="Enter your email"
            placeholderTextColor="#98a2b3"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            onChangeText={setEmailAddress}
          />

          <Text style={styles.fieldLabel}>
            Password
          </Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              placeholder="Create a password"
              placeholderTextColor="#98a2b3"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              textContentType="newPassword"
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() =>
                setShowPassword(
                  (previous) => !previous
                )
              }
            >
              <Ionicons
                name={
                  showPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={22}
                color="#667085"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              isSigningUp &&
                styles.buttonDisabled,
            ]}
            onPress={onSignUpPress}
            disabled={isSigningUp}
          >
            {isSigningUp ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                Create account
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>
              OR
            </Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={[
              styles.googleButton,
              isGoogleLoading &&
                styles.buttonDisabled,
            ]}
            onPress={onGooglePress}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator />
            ) : (
              <>
                <FontAwesome
                  name="google"
                  size={18}
                  color="#4285F4"
                />

                <Text style={styles.googleText}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>
              Already have an account?{" "}
            </Text>

            <Link
              href="/sign-in"
              style={styles.loginLink}
            >
              Sign in
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },

  card: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#101828",
    marginTop: 20,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#667085",
    marginBottom: 8,
  },

  emailText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#344054",
    marginBottom: 8,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344054",
    marginBottom: 8,
    marginTop: 16,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#101828",
    backgroundColor: "#fff",
  },

  verificationInput: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 6,
  },

  passwordContainer: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 10,
    backgroundColor: "#fff",
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#101828",
  },

  eyeButton: {
    paddingHorizontal: 14,
    height: "100%",
    justifyContent: "center",
  },

  button: {
    height: 50,
    borderRadius: 10,
    backgroundColor:
      COLORS?.primary || "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3F2",
    borderWidth: 1,
    borderColor: "#FDA29B",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },

  errorText: {
    flex: 1,
    color: "#B42318",
    fontSize: 14,
    lineHeight: 20,
  },

  successBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#ECFDF3",
    borderWidth: 1,
    borderColor: "#ABEFC6",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },

  successText: {
    flex: 1,
    color: "#027A48",
    fontSize: 14,
    lineHeight: 20,
  },

  secondaryButton: {
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  secondaryButtonText: {
    color:
      COLORS?.primary || "#2563EB",
    fontSize: 15,
    fontWeight: "600",
  },

  changeEmailButton: {
    alignItems: "center",
    marginTop: 4,
  },

  changeEmailText: {
    color: "#667085",
    fontSize: 14,
  },

  helperText: {
    textAlign: "center",
    color: "#667085",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 16,
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#EAECF0",
  },

  dividerText: {
    marginHorizontal: 12,
    color: "#98A2B3",
    fontSize: 12,
    fontWeight: "600",
  },

  googleButton: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  googleText: {
    color: "#344054",
    fontSize: 15,
    fontWeight: "600",
  },

  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },

  loginText: {
    color: "#667085",
    fontSize: 14,
  },

  loginLink: {
    color:
      COLORS?.primary || "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },
});