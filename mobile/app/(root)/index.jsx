import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Ionicons } from "@expo/vector-icons";
import { PieChart } from "react-native-chart-kit";

import { useTransactions } from "../../hooks/useTransactions";
import { BalanceCard } from "../../components/BalanceCard";
import { TransactionItem } from "../../components/TransactionItem";
import { DeleteModal } from "../../components/DeleteModal";
import NoTransactionsFound from "../../components/NoTransactionsFound";

import { useTheme } from "../../context/ThemeContext";
import { createHomeStyles } from "../../assets/styles/home.styles";

export default function Page() {
  // ==========================================================
  // AUTH
  // ==========================================================

  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  // ==========================================================
  // THEME
  // ==========================================================

  const { theme, cycleTheme } = useTheme();

  const styles = useMemo(
    () => createHomeStyles(theme),
    [theme]
  );

  // ==========================================================
  // STATE
  // ==========================================================

  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ==========================================================
  // USER
  // ==========================================================

  const userId = user?.id;

  // ==========================================================
  // TRANSACTIONS
  // ==========================================================

  const {
    transactions,
    summary,
    isLoading,
    error,
    loadData,
    refresh,
    deleteTransaction,
    markTransactionAsPaid,
  } = useTransactions(userId);

  // ==========================================================
  // LOAD DATA ONCE
  // ==========================================================

  const loadedUserRef = useRef(null);

  useEffect(() => {
    // Basic checks.
    if (!isLoaded || !userId) {
      return;
    }

    // Prevent fetching again if already fetched for this user.
    if (loadedUserRef.current === userId) {
      return;
    }

    // Mark BEFORE starting request.
    loadedUserRef.current = userId;

    let cancelled = false;

    const loadInitialData = async () => {
      if (cancelled) {
        return;
      }

      try {
        await loadData();
      } catch (error) {
        console.error(
          "[Home] Initial load failed:",
          error
        );
      }
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId, loadData]);

  // ==========================================================
  // REFRESH
  // ==========================================================

  const onRefresh = useCallback(async () => {
    if (!userId || refreshing || isLoading) {
      return;
    }

    try {
      setRefreshing(true);

      await refresh();
    } catch (error) {
      console.error(
        "[Home] Refresh failed:",
        error
      );
    } finally {
      setRefreshing(false);
    }
  }, [
    userId,
    refreshing,
    isLoading,
    refresh,
  ]);

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = useCallback(() => {
    if (loggingOut) {
      return;
    }

    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            try {
              setLoggingOut(true);

              await signOut();
            } catch (error) {
              console.error(
                "[Auth] Sign out failed:",
                error
              );

              Alert.alert(
                "Sign out failed",
                error?.message ||
                  "Unable to sign out. Please try again."
              );
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  }, [loggingOut, signOut]);

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete = useCallback((id) => {
    if (!id) return;
    setDeletingId(id);
    setDeleteModalVisible(true);
  }, []);

  // ==========================================================
  // USER INFO
  // ==========================================================

  const email =
    user?.emailAddresses?.[0]
      ?.emailAddress || "";

  const username =
    email
      ? email.split("@")[0]
      : user?.firstName || "there";

  const displayName =
    username.charAt(0).toUpperCase() +
    username.slice(1);

  const avatarLetter =
    displayName.charAt(0).toUpperCase() || "U";

  // ==========================================================
  // SAFE DATA
  // ==========================================================

  const safeTransactions = Array.isArray(
    transactions
  )
    ? transactions
    : [];

  const transactionCount =
    safeTransactions.length;

  const showInitialLoader =
    isLoading &&
    transactionCount === 0 &&
    !refreshing;

  // ==========================================================
  // HEADER
  // ==========================================================

  const ListHeader = useMemo(
    () => (
      <View>
        {/* ====================================================
            TOP HEADER
        ==================================================== */}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push("/stats")}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {avatarLetter}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.welcomeContainer}>
              <Text
                style={styles.usernameText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayName}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* THEME */}

            <TouchableOpacity
              style={styles.iconButton}
              onPress={cycleTheme}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Change theme"
            >
              <Text style={styles.themeIcon}>
                {theme.icon}
              </Text>
            </TouchableOpacity>

            {/* ADD */}

            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                router.push("/create")
              }
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Add transaction"
            >
              <Ionicons
                name="add"
                size={22}
                color={
                  theme.textOnPrimary ||
                  "#FFFFFF"
                }
              />
            </TouchableOpacity>

            {/* LOGOUT */}

            <TouchableOpacity
              style={[
                styles.iconButton,
                loggingOut &&
                  styles.buttonDisabled,
              ]}
              onPress={handleLogout}
              disabled={loggingOut}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              {loggingOut ? (
                <ActivityIndicator
                  size="small"
                  color={theme.text}
                />
              ) : (
                <Ionicons
                  name="log-out-outline"
                  size={21}
                  color={theme.text}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ====================================================
            BALANCE
        ==================================================== */}

        <View style={styles.balanceWrapper}>
          <BalanceCard summary={summary} />
        </View>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error ? (
          <View style={styles.errorBox}>
            <View
              style={styles.errorIconContainer}
            >
              <Ionicons
                name="cloud-offline-outline"
                size={19}
                color={theme.expense}
              />
            </View>

            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>
                Couldn't update your data
              </Text>

              <Text
                style={styles.errorText}
                numberOfLines={2}
              >
                {error}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadData}
              disabled={isLoading}
              activeOpacity={0.75}
            >
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={
                    theme.textOnPrimary ||
                    "#FFFFFF"
                  }
                />
              ) : (
                <Text
                  style={styles.retryText}
                >
                  Retry
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ====================================================
            TRANSACTIONS SECTION HEADER
        ==================================================== */}

        <View
          style={
            styles.transactionsHeaderContainer
          }
        >
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              Recent transactions
            </Text>

            <Text
              style={styles.sectionSubtitle}
            >
              Your latest activity
            </Text>
          </View>

          {transactionCount > 0 ? (
            <View
              style={styles.viewAllButton}
            >
              <Text
                style={styles.viewAllText}
              >
                {transactionCount}{" "}
                {transactionCount === 1
                  ? "transaction"
                  : "transactions"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    ),
    [
      avatarLetter,
      displayName,
      summary,
      theme,
      error,
      isLoading,
      transactionCount,
      router,
      cycleTheme,
      loadData,
      styles,
      handleLogout,
      loggingOut,
    ]
  );

  // ==========================================================
  // LIST
  // ==========================================================

  // CLERK LOADING
  if (!isLoaded) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingCard}>
          <ActivityIndicator
            size="large"
            color={theme.primary}
          />

          <Text style={styles.loadingTitle}>
            Loading your account
          </Text>

          <Text style={styles.loadingText}>
            Just a moment...
          </Text>
        </View>
      </View>
    );
  }

  // NO USER
  if (!userId) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.authCard}>
          <View style={styles.authIcon}>
            <Ionicons
              name="person-outline"
              size={28}
              color={theme.primary}
            />
          </View>

          <Text style={styles.authTitle}>
            Sign in required
          </Text>

          <Text style={styles.authMessage}>
            Please sign in to continue managing
            your transactions.
          </Text>

          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => router.push("/sign-in")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionText}>
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={safeTransactions}
        keyExtractor={(item, index) => {
          const id =
            item?._id ||
            item?.id;

          return id
            ? String(id)
            : `transaction-${index}`;
        }}
        renderItem={({ item }) => (
          <TransactionItem
            item={item}
            onDelete={handleDelete}
            onMarkPaid={markTransactionAsPaid}
          />
        )}
        ListHeaderComponent={
          ListHeader
        }
        ListEmptyComponent={
          showInitialLoader ? (
            <View
              style={styles.emptyLoading}
            >
              <ActivityIndicator
                size="small"
                color={theme.primary}
              />

              <Text
                style={styles.loadingText}
              >
                Loading transactions...
              </Text>
            </View>
          ) : (
            <NoTransactionsFound />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.transactionsListContent
        }
        style={styles.transactionsList}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
      />

      <DeleteModal 
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={() => {
          if (deletingId) {
            deleteTransaction(deletingId);
            setDeletingId(null);
          }
        }}
      />
    </View>
  );
}