
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

import { useCallback, useMemo, useRef, useState } from "react";

import { Ionicons } from "@expo/vector-icons";

import { API_URL } from "../../constants/api";
import { createCreateStyles } from "../../assets/styles/create.styles";
import { useTheme } from "../../context/ThemeContext";


// ============================================================
// CATEGORIES
// ============================================================

const CATEGORIES = [
  {
    id: "food",
    name: "Food & Drinks",
    icon: "fast-food",
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: "cart",
  },
  {
    id: "transportation",
    name: "Transportation",
    icon: "car",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    icon: "film",
  },
  {
    id: "bills",
    name: "Bills",
    icon: "receipt",
  },
  {
    id: "income",
    name: "Income",
    icon: "cash",
  },
  {
    id: "rent",
    name: "Rent",
    icon: "home",
  },
  {
    id: "other",
    name: "Other",
    icon: "ellipsis-horizontal",
  },
];


// ============================================================
// HELPERS
// ============================================================

const parseApiResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
};


// ============================================================
// SCREEN
// ============================================================

const CreateScreen = () => {
  const router = useRouter();

  const {
    user,
    isLoaded,
  } = useUser();

  const {
    getToken,
  } = useAuth();

  const {
    theme,
  } = useTheme();

  const styles = useMemo(
    () => createCreateStyles(theme),
    [theme]
  );


  // ==========================================================
  // FORM STATE
  // ==========================================================

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    person,
    setPerson,
  ] = useState("");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("");

  const [
    isExpense,
    setIsExpense,
  ] = useState(true);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);


  // ==========================================================
  // REQUEST LOCK
  // ==========================================================
  //
  // Important:
  //
  // isLoading is React state and updates asynchronously.
  // A user can technically press Save twice before the
  // first state update is reflected.
  //
  // The ref prevents that completely.
  //
  
  const submittingRef =
    useRef(false);


  // ==========================================================
  // CREATE TRANSACTION
  // ==========================================================

  const handleCreate =
    useCallback(async () => {

      // ----------------------------------------------
      // PREVENT DOUBLE SUBMIT
      // ----------------------------------------------

      if (submittingRef.current) {
        return;
      }

      // ----------------------------------------------
      // CLERK LOADING
      // ----------------------------------------------

      if (!isLoaded) {
        Alert.alert(
          "Please wait",
          "Authentication is still loading."
        );

        return;
      }

      // ----------------------------------------------
      // USER
      // ----------------------------------------------

      if (!user?.id) {
        Alert.alert(
          "Authentication required",
          "Please sign in before creating a transaction."
        );

        return;
      }

      // ----------------------------------------------
      // TITLE
      // ----------------------------------------------

      const cleanTitle =
        title.trim();

      if (!cleanTitle) {
        Alert.alert(
          "Missing title",
          "Please enter a transaction title."
        );

        return;
      }

      // ----------------------------------------------
      // AMOUNT
      // ----------------------------------------------

      const cleanAmount =
        amount
          .replace(/,/g, "")
          .trim();

      const parsedAmount =
        Number(cleanAmount);

      if (
        !cleanAmount ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0
      ) {
        Alert.alert(
          "Invalid amount",
          "Please enter a valid amount greater than zero."
        );

        return;
      }

      // ----------------------------------------------
      // CATEGORY
      // ----------------------------------------------

      if (!selectedCategory) {
        Alert.alert(
          "Missing category",
          "Please select a category."
        );

        return;
      }

      // ----------------------------------------------
      // LOCK
      // ----------------------------------------------

      submittingRef.current = true;
      setIsLoading(true);

      try {

        // ============================================
        // CLERK TOKEN
        // ============================================

        const token =
          await getToken();

        if (!token) {
          throw new Error(
            "Authentication token is not available."
          );
        }


        // ============================================
        // AMOUNT
        // ============================================

        const formattedAmount =
          isExpense
            ? -Math.abs(parsedAmount)
            : Math.abs(parsedAmount);


        // ============================================
        // URL
        // ============================================

        const url =
          `${API_URL}/transactions`;

        console.log(
          "[CreateTransaction] POST:",
          url
        );


        // ============================================
        // REQUEST
        // ============================================

        const response =
          await fetch(
            url,
            {
              method: "POST",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify({
                user_id: user.id,

                title:
                  cleanTitle,

                amount:
                  formattedAmount,

                category:
                  selectedCategory,
                  
                person: person.trim() || null,
              }),
            }
          );


        // ============================================
        // RESPONSE
        // ============================================

        const data =
          await parseApiResponse(
            response
          );


        console.log(
          "[CreateTransaction] Status:",
          response.status
        );


        // ============================================
        // API ERROR
        // ============================================

        if (!response.ok) {
          throw new Error(
            data?.message ||
              data?.error ||
              data?.raw ||
              `Failed to create transaction (${response.status})`
          );
        }


        // ============================================
        // SUCCESS
        // ============================================

        console.log(
          "[CreateTransaction] Created successfully"
        );


        Alert.alert(
          "Success",
          "Transaction created successfully.",
          [
            {
              text: "OK",
              onPress: () => {
                router.back();
              },
            },
          ]
        );

      } catch (error) {

        console.error(
          "[CreateTransaction] Error:",
          error
        );


        let message =
          error?.message ||
          "Something went wrong.";


        // Network request failed
        if (
          error?.message ===
          "Network request failed"
        ) {
          message =
            "Unable to connect to the server. Please check your internet connection and try again.";
        }


        Alert.alert(
          "Unable to create transaction",
          message
        );

      } finally {

        submittingRef.current =
          false;

        setIsLoading(false);
      }

    }, [
      isLoaded,
      user,
      title,
      amount,
      selectedCategory,
      isExpense,
      person,
      getToken,
      router,
    ]);


  // ==========================================================
  // CLERK LOADING
  // ==========================================================

  if (!isLoaded) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={
            theme.primary
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading...
        </Text>
      </View>
    );
  }


  // ==========================================================
  // NOT AUTHENTICATED
  // ==========================================================

  if (!user?.id) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <Ionicons
          name="lock-closed-outline"
          size={42}
          color={
            theme.textLight
          }
        />

        <Text
          style={
            styles.authTitle
          }
        >
          Please sign in
        </Text>

        <Text
          style={
            styles.authSubtitle
          }
        >
          You need to be signed in to create a transaction.
        </Text>

        <TouchableOpacity
          style={
            styles.secondaryButton
          }
          onPress={() =>
            router.back()
          }
          activeOpacity={0.8}
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <KeyboardAvoidingView
      style={
        styles.container
      }
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <View
          style={
            styles.header
          }
        >

          {/* BACK */}

          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
            disabled={
              isLoading
            }
            activeOpacity={
              0.7
          }
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={
                theme.text
              }
            />
          </TouchableOpacity>


          {/* TITLE */}

          <View
            style={
              styles.headerCenter
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              New Transaction
            </Text>

          </View>


          {/* SAVE */}

          <TouchableOpacity
            style={[
              styles.saveButtonContainer,

              isLoading &&
                styles.saveButtonDisabled,
            ]}
            onPress={
              handleCreate
            }
            disabled={
              isLoading
            }
            activeOpacity={
              0.8
            }
          >
            {isLoading ? (
              <ActivityIndicator
                size="small"
                color={
                  theme.textOnPrimary
                }
              />
            ) : (
              <>
                <Text
                  style={
                    styles.saveButton
                  }
                >
                  Save
                </Text>


              </>
            )}
          </TouchableOpacity>

        </View>


        {/* ==================================================
            CARD
        ================================================== */}

        <View
          style={
            styles.card
          }
        >

          {/* ==================================================
              TYPE SELECTOR
          ================================================== */}

          <View
            style={
              styles.typeSelector
            }
          >

            {/* EXPENSE */}

            <TouchableOpacity
              style={[
                styles.typeButton,

                isExpense &&
                  styles.typeButtonActive,
              ]}
              onPress={() =>
                setIsExpense(true)
              }
              disabled={
                isLoading
              }
              activeOpacity={
                0.8
              }
            >
              <Ionicons
                name="arrow-down-circle"
                size={21}
                color={
                  isExpense
                    ? theme.textOnPrimary
                    : theme.expense
                }
                style={
                  styles.typeIcon
                }
              />

              <Text
                style={[
                  styles.typeButtonText,

                  isExpense &&
                    styles.typeButtonTextActive,
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>


            {/* INCOME */}

            <TouchableOpacity
              style={[
                styles.typeButton,

                !isExpense &&
                  styles.typeButtonActive,
              ]}
              onPress={() =>
                setIsExpense(false)
              }
              disabled={
                isLoading
              }
              activeOpacity={
                0.8
              }
            >
              <Ionicons
                name="arrow-up-circle"
                size={21}
                color={
                  !isExpense
                    ? theme.textOnPrimary
                    : theme.income
                }
                style={
                  styles.typeIcon
                }
              />

              <Text
                style={[
                  styles.typeButtonText,

                  !isExpense &&
                    styles.typeButtonTextActive,
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>

          </View>


          {/* ==================================================
              AMOUNT
          ================================================== */}

          <View
            style={[
              styles.amountContainer,

              isExpense
                ? styles.amountExpense
                : styles.amountIncome,
            ]}
          >

            <Text
              style={[
                styles.currencySymbol,

                {
                  color: isExpense
                    ? theme.expense
                    : theme.income,
                },
              ]}
            >
              ₹
            </Text>

            <TextInput
              style={
                styles.amountInput
              }
              placeholder="0.00"
              placeholderTextColor={
                theme.textLight
              }
              value={
                amount
              }
              onChangeText={
                setAmount
              }
              keyboardType={
                Platform.OS === "ios"
                  ? "decimal-pad"
                  : "numeric"
              }
              editable={
                !isLoading
              }
              maxLength={
                12
              }
              returnKeyType="next"
            />

          </View>


          {/* ==================================================
              TITLE
          ================================================== */}

          <View
            style={
              styles.inputContainer
            }
          >
            <Ionicons
              name="create-outline"
              size={21}
              color={
                theme.textLight
              }
              style={
                styles.inputIcon
              }
            />

            <TextInput
              style={
                styles.input
              }
              placeholder="Transaction title"
              placeholderTextColor={
                theme.textLight
              }
              value={
                title
              }
              onChangeText={
                setTitle
              }
              editable={
                !isLoading
              }
              maxLength={
                100
              }
              autoCapitalize="sentences"
              returnKeyType="done"
            />
          </View>

          {/* ==================================================
              PERSON
          ================================================== */}

          <View
            style={
              styles.inputContainer
            }
          >
            <Ionicons
              name="person-outline"
              size={21}
              color={
                theme.textLight
              }
              style={
                styles.inputIcon
              }
            />

            <TextInput
              style={
                styles.input
              }
              placeholder="Person Name (Optional)"
              placeholderTextColor={
                theme.textLight
              }
              value={
                person
              }
              onChangeText={
                setPerson
              }
              editable={
                !isLoading
              }
              maxLength={
                100
              }
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>


          {/* ==================================================
              CATEGORY TITLE
          ================================================== */}

          <Text
            style={
              styles.sectionTitle
            }
          >
            <Ionicons
              name="pricetag-outline"
              size={15}
              color={
                theme.text
              }
            />{" "}
            Category
          </Text>


          {/* ==================================================
              CATEGORY GRID
          ================================================== */}

          <View
            style={
              styles.categoryGrid
            }
          >

            {CATEGORIES.map(
              (category) => {

                const active =
                  selectedCategory ===
                  category.name;

                return (
                  <TouchableOpacity
                    key={
                      category.id
                    }
                    style={[
                      styles.categoryButton,

                      active &&
                        styles.categoryButtonActive,
                    ]}
                    onPress={() =>
                      setSelectedCategory(
                        category.name
                      )
                    }
                    disabled={
                      isLoading
                    }
                    activeOpacity={
                      0.8
                    }
                  >

                    <View
                      style={[
                        styles.categoryIconWrapper,

                        active &&
                          styles.categoryIconWrapperActive,
                      ]}
                    >
                      <Ionicons
                        name={
                          category.icon
                        }
                        size={19}
                        color={
                          active
                            ? theme.textOnPrimary
                            : theme.primary
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.categoryButtonText,

                        active &&
                          styles.categoryButtonTextActive,
                      ]}
                      numberOfLines={
                        2
                      }
                    >
                      {
                        category.name
                      }
                    </Text>

                    {active && (
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={
                          theme.textOnPrimary
                        }
                        style={
                          styles.categoryCheck
                        }
                      />
                    )}

                  </TouchableOpacity>
                );
              }
            )}

          </View>

        </View>


        {/* ==================================================
            SAVING INDICATOR
        ================================================== */}

        {isLoading && (
          <View
            style={
              styles.loadingContainer
            }
          >
            <ActivityIndicator
              size="small"
              color={
                theme.primary
              }
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Saving transaction...
            </Text>
          </View>
        )}

      </ScrollView>

    </KeyboardAvoidingView>
  );
};


export default CreateScreen;