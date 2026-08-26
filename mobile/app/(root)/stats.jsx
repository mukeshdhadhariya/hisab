import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PieChart } from "react-native-chart-kit";

import { useTransactions } from "../../hooks/useTransactions";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "../../context/ThemeContext";
import { createHomeStyles } from "../../assets/styles/home.styles";

export default function StatsScreen() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { theme } = useTheme();
  
  const styles = useMemo(() => createHomeStyles(theme), [theme]);
  const [activeTab, setActiveTab] = useState("category"); // 'category' | 'person'

  const { transactions, isLoading, loadData, hasLoaded } = useTransactions(user?.id);

  useFocusEffect(
    React.useCallback(() => {
      if (isLoaded && user?.id && !hasLoaded) {
        loadData();
      }
    }, [isLoaded, user?.id, loadData, hasLoaded])
  );

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  
  const personStatsData = useMemo(() => {
    const stats = {};
    safeTransactions.forEach((t) => {
      if (t.person) {
        if (!stats[t.person]) stats[t.person] = 0;
        stats[t.person] += Math.abs(Number(t.amount));
      }
    });

    const colors = [
      "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#C9CBCF",
      "#FF9FF3", "#FDCB6E", "#00B894", "#0984E3", "#6C5CE7", "#E17055"
    ];

    const data = Object.entries(stats).map(([name, amount], index) => ({
      name,
      population: amount,
      color: colors[index % colors.length],
      legendFontColor: theme.text,
      legendFontSize: 12,
      rawName: name,
      rawAmount: amount
    }));
    
    return data.sort((a, b) => b.population - a.population);
  }, [safeTransactions, theme.text]);

  const categoryStatsData = useMemo(() => {
    const stats = {};
    safeTransactions.forEach((t) => {
      if (t.category) {
        if (!stats[t.category]) stats[t.category] = 0;
        // Group everything by absolute value so expenses and incomes both show volume
        stats[t.category] += Math.abs(Number(t.amount));
      }
    });

    const colors = [
      "#4BC0C0", "#FFCE56", "#36A2EB", "#FF6384", "#9966FF", "#FF9F40", "#C9CBCF",
      "#FF9FF3", "#FDCB6E", "#00B894", "#0984E3", "#6C5CE7", "#E17055"
    ];

    const data = Object.entries(stats).map(([name, amount], index) => ({
      name,
      population: amount,
      color: colors[index % colors.length],
      legendFontColor: theme.text,
      legendFontSize: 12,
      rawName: name,
      rawAmount: amount
    }));
    
    return data.sort((a, b) => b.population - a.population);
  }, [safeTransactions, theme.text]);

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
    tabsContainer: {
      flexDirection: "row",
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 20,
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 8,
    },
    activeTab: {
      backgroundColor: theme.primarySoft || theme.border,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    activeTabText: {
      color: theme.primary,
      fontWeight: "700",
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    emptyText: {
      fontSize: 16,
      color: theme.textMuted,
      textAlign: "center",
      marginTop: 20,
      lineHeight: 24,
    }
  });

  if (!isLoaded || isLoading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const renderPieChart = (data, emptyMessage) => {
    if (!data || data.length === 0) {
      return (
        <View style={localStyles.emptyState}>
          <Ionicons name="pie-chart-outline" size={64} color={theme.textLight} />
          <Text style={localStyles.emptyText}>{emptyMessage}</Text>
        </View>
      );
    }

    return (
      <View style={{ alignItems: "center" }}>
        <PieChart
          data={data}
          width={Dimensions.get("window").width - 40}
          height={220}
          chartConfig={{
            backgroundColor: theme.surface,
            backgroundGradientFrom: theme.surface,
            backgroundGradientTo: theme.surface,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"15"}
          center={[10, 0]}
          absolute
        />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={localStyles.header}>
        <TouchableOpacity style={localStyles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={localStyles.headerTitle}>Statistics</Text>
      </View>

      <View style={localStyles.tabsContainer}>
        <TouchableOpacity 
          style={[localStyles.tab, activeTab === "category" && localStyles.activeTab]}
          onPress={() => setActiveTab("category")}
          activeOpacity={0.7}
        >
          <Text style={[localStyles.tabText, activeTab === "category" && localStyles.activeTabText]}>By Category</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[localStyles.tab, activeTab === "person" && localStyles.activeTab]}
          onPress={() => setActiveTab("person")}
          activeOpacity={0.7}
        >
          <Text style={[localStyles.tabText, activeTab === "person" && localStyles.activeTabText]}>By Person</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {activeTab === "category" && (
          <View style={{ marginTop: 10 }}>
            {renderPieChart(categoryStatsData, "You have no transactions to show categories for.")}
            
            {categoryStatsData.length > 0 && (
              <View style={{ width: "100%", marginTop: 25, paddingHorizontal: 20 }}>
                <Text style={[styles.sectionSubtitle, { marginBottom: 15 }]}>Category Breakdown (Total Volume)</Text>
                {categoryStatsData.map((category) => (
                  <View
                    key={category.rawName}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      elevation: 1,
                      shadowColor: theme.shadow,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: category.color, marginRight: 12 }} />
                      <Text style={{ fontSize: 16, color: theme.text, fontWeight: "600" }}>{category.rawName}</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: theme.text }}>
                      ₹{category.rawAmount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === "person" && (
          <View style={{ marginTop: 10 }}>
            {renderPieChart(personStatsData, 'You have no person-to-person transactions yet. Add a "Person Name" to see stats here!')}
            
            {personStatsData.length > 0 && (
              <View style={{ width: "100%", marginTop: 25, paddingHorizontal: 20 }}>
                <Text style={[styles.sectionSubtitle, { marginBottom: 15 }]}>Tap a person for detailed transaction history</Text>
                {personStatsData.map((person) => (
                  <TouchableOpacity
                    key={person.rawName}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      elevation: 1,
                      shadowColor: theme.shadow,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                    }}
                    onPress={() => router.push(`/person/${encodeURIComponent(person.rawName)}`)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: person.color, marginRight: 12 }} />
                      <Text style={{ fontSize: 16, color: theme.text, fontWeight: "600" }}>{person.rawName}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: person.rawAmount >= 0 ? theme.income : theme.expense, marginRight: 8 }}>
                        {person.rawAmount > 0 ? "+" : ""}₹{Math.abs(person.rawAmount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.textLight} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
