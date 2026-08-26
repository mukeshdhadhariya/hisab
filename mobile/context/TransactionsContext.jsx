import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { API_URL } from "../constants/api";
import { Alert } from "react-native";

const TransactionsContext = createContext(null);

const INITIAL_SUMMARY = {
  balance: 0,
  income: 0,
  expenses: 0,
};

export const TransactionsProvider = ({ children }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  
  const userId = user?.id;

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [hasLoaded, setHasLoaded] = useState(false);
  const requestRef = useRef(null);
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const loadData = useCallback(async (force = false) => {
    if (!userId) return false;
    if (!force && hasLoaded) return true; // Caching logic
    if (requestRef.current) return requestRef.current;

    const request = (async () => {
      if (force || !hasLoaded) setIsLoading(true);
      setError(null);

      try {
        const token = await getTokenRef.current();
        if (!token) throw new Error("Authentication token is not available.");

        const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };
        const transactionsUrl = `${API_URL}/transactions/${encodeURIComponent(userId)}`;
        const summaryUrl = `${API_URL}/transactions/summary/${encodeURIComponent(userId)}`;

        const [transactionsResponse, summaryResponse] = await Promise.all([
          fetch(transactionsUrl, { method: "GET", headers }),
          fetch(summaryUrl, { method: "GET", headers }),
        ]);

        const transactionsText = await transactionsResponse.text();
        let transactionsData = transactionsText ? JSON.parse(transactionsText) : [];
        if (!transactionsResponse.ok) throw new Error(transactionsData?.message || `Transactions request failed (${transactionsResponse.status})`);

        const summaryText = await summaryResponse.text();
        let summaryData = summaryText ? JSON.parse(summaryText) : {};
        if (!summaryResponse.ok) throw new Error(summaryData?.message || `Summary request failed (${summaryResponse.status})`);

        const normalizedTransactions = Array.isArray(transactionsData) ? transactionsData : (Array.isArray(transactionsData?.transactions) ? transactionsData.transactions : []);
        const normalizedSummary = {
          balance: Number(summaryData?.balance) || 0,
          income: Number(summaryData?.income) || 0,
          expenses: Number(summaryData?.expenses) || 0,
        };

        setTransactions(normalizedTransactions);
        setSummary(normalizedSummary);
        setError(null);
        setHasLoaded(true);
        return true;
      } catch (err) {
        setError(err?.message || "Unable to load transactions.");
        return false;
      } finally {
        setIsLoading(false);
        requestRef.current = null;
      }
    })();

    requestRef.current = request;
    return request;
  }, [userId, hasLoaded]);

  const deleteTransaction = useCallback(async (id) => {
    if (!id) return false;
    try {
      const token = await getTokenRef.current();
      if (!token) throw new Error("Authentication token is not available.");
      
      const url = `${API_URL}/transactions/${encodeURIComponent(id)}`;
      const response = await fetch(url, { method: "DELETE", headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}

      if (!response.ok) throw new Error(data?.message || `Delete failed (${response.status})`);

      await loadData(true); // Force refresh
      Alert.alert("Success", "Transaction deleted successfully.");
      return true;
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to delete transaction.");
      return false;
    }
  }, [loadData]);

  // Expose force refresh for pull-to-refresh
  const refresh = useCallback(() => loadData(true), [loadData]);

  return (
    <TransactionsContext.Provider value={{
      transactions,
      summary,
      isLoading,
      error,
      loadData,
      refresh,
      deleteTransaction
    }}>
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactionsContext = () => {
  const context = useContext(TransactionsContext);
  if (!context) throw new Error("useTransactionsContext must be used inside TransactionsProvider");
  return context;
};
