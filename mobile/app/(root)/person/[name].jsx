import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTransactions } from "../../../hooks/useTransactions";
import { getHasConfirmedDelete, setHasConfirmedDelete } from "../../../context/TransactionsContext";
import { useUser } from "@clerk/clerk-expo";
import { TransactionItem } from "../../../components/TransactionItem";
import { useTheme } from "../../../context/ThemeContext";
import { createHomeStyles } from "../../../assets/styles/home.styles";

export default function PersonTransactionsScreen() {
  const { name } = useLocalSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { theme } = useTheme();
  
  const styles = useMemo(() => createHomeStyles(theme), [theme]);

  const { transactions, isLoading, deleteTransaction, loadData } = useTransactions(user?.id);

  useFocusEffect(
    React.useCallback(() => {
      if (isLoaded && user?.id) {
        loadData();
      }
    }, [isLoaded, user?.id, loadData])
  );

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  
  const personTransactions = useMemo(() => {
    return safeTransactions.filter(t => t.person === name);
  }, [safeTransactions, name]);

  const stats = useMemo(() => {
    let totalGiven = 0;
    let totalReceived = 0;

    personTransactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (amt > 0) totalReceived += amt;
      else totalGiven += Math.abs(amt);
    });

    return { totalGiven, totalReceived, net: totalReceived - totalGiven };
  }, [personTransactions]);

  const handleDelete = useCallback(
    (id) => {
      if (!id) return;
      
      if (getHasConfirmedDelete()) {
        deleteTransaction(id);
        return;
      }

      Alert.alert(
        "Delete transaction",
        "Are you sure you want to delete this transaction?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive", 
            onPress: () => {
               setHasConfirmedDelete(true);
               deleteTransaction(id);
            }
          }
        ]
      );
    },
    [deleteTransaction]
  );

  const localStyles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
      backgroundColor: theme.background,
    },
    backButton: {
      marginRight: 15,
      padding: 5,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
    },
    statsContainer: {
      padding: 20,
      backgroundColor: theme.surface,
      marginHorizontal: 20,
      borderRadius: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    statLabel: {
      fontSize: 14,
      color: theme.textMuted,
      flexShrink: 1,
      marginRight: 10,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "600",
      flexShrink: 1,
      textAlign: "right",
    },
    netBalance: {
      fontSize: 18,
      fontWeight: "800",
      marginTop: 10,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 10,
    }
  });

  if (!isLoaded || isLoading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={localStyles.header}>
        <TouchableOpacity style={localStyles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={localStyles.headerTitle}>{name}'s Transactions</Text>
      </View>

      <FlatList
        data={personTransactions}
        keyExtractor={(item, index) => item?._id || item?.id?.toString() || `person-tx-${index}`}
        renderItem={({ item }) => (
          <TransactionItem item={item} onDelete={handleDelete} />
        )}
        ListHeaderComponent={
          <View>
            <View style={localStyles.statsContainer}>
              <View style={localStyles.statRow}>
                <Text style={localStyles.statLabel}>You Gave / Paid</Text>
                <Text style={[localStyles.statValue, { color: theme.expense }]}>
                  -₹{stats.totalGiven.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={localStyles.statRow}>
                <Text style={localStyles.statLabel}>You Received</Text>
                <Text style={[localStyles.statValue, { color: theme.income }]}>
                  +₹{stats.totalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={localStyles.divider} />
              <View style={localStyles.statRow}>
                <Text style={localStyles.statLabel}>Net Balance</Text>
                <Text style={[localStyles.netBalance, { color: stats.net >= 0 ? theme.income : theme.expense }]}>
                  {stats.net > 0 ? "They Owe You " : stats.net < 0 ? "You Owe Them " : ""}
                  ₹{Math.abs(stats.net).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
            <Text style={[styles.sectionTitle, { marginLeft: 20, marginBottom: 10 }]}>
              Transaction History
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
