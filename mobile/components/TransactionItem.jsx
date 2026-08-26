import React, { useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../context/ThemeContext";
import { createHomeStyles } from "../assets/styles/home.styles";
import { formatDate } from "../lib/utils";

const CATEGORY_ICONS = {
  "Food & Drinks": "fast-food-outline",
  Shopping: "cart-outline",
  Transportation: "car-outline",
  Entertainment: "film-outline",
  Bills: "receipt-outline",
  Income: "cash-outline",
  Other: "ellipsis-horizontal-circle-outline",
  Rent: "home-outline",
};

export const TransactionItem = React.memo(({ item, onDelete }) => {
  const { theme } = useTheme();

  // Memoize styles to prevent unnecessary object recalculations on scroll
  const styles = useMemo(() => createHomeStyles(theme), [theme]);

  const amount = Number(item?.amount) || 0;
  const isIncome = amount > 0;

  const transactionId = item?._id || item?.id;
  const category = item?.category || "Other";
  const title = item?.title || "Untitled transaction";
  const person = item?.person;
  const iconName = CATEGORY_ICONS[category] || "pricetag-outline";

  const amountColor = isIncome ? theme.income : theme.expense;
  const date = item?.created_at
                ? new Date(item.created_at)
                    .toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })
                    .replace(/,/g, "")
                : "";

  const formattedAmount = `${isIncome ? "+" : "-"}₹${Math.abs(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  // Dynamic soft-tint background matching transaction status
  const iconBgColor = isIncome
    ? theme.incomeLight || "rgba(34, 197, 94, 0.12)"
    : theme.expenseLight || "rgba(239, 68, 68, 0.12)";

  return (
    <View style={styles.transactionCard}>
      {/* CATEGORY ICON */}
      <View style={[styles.categoryIconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={iconName} size={18} color={amountColor} />
      </View>

      {/* MAIN INFORMATION */}
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>

        <View style={styles.transactionMeta}>
          <Text style={styles.transactionCategory} numberOfLines={1}>
            {category}
          </Text>
          {person && (
            <Text style={[styles.transactionCategory, { marginLeft: 6, color: theme.text }]} numberOfLines={1}>
              • {person}
            </Text>
          )}
        </View>
      </View>

      {/* AMOUNT */}
      <View style={styles.transactionAmountContainer}>
        <Text
          style={[styles.transactionAmount, { color: amountColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {formattedAmount}
        </Text>
          <Text style={styles.transactionDate} numberOfLines={1}>
            {date}
          </Text>
      </View>

      {/* DELETE BUTTON */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete?.(transactionId)}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${title}`}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      >
        <Ionicons name="trash-outline" size={16} color={theme.textMuted || theme.textLight} />
      </TouchableOpacity>
    </View>
  );
});

export default TransactionItem;