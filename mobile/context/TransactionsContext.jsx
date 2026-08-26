import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { API_URL } from "../constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// In-memory fallback if AsyncStorage native module is missing (Expo Go restart required)
const memoryCache = new Map();

const safeAsyncStorage = {
  getItem: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return memoryCache.get(key) || null;
    }
  },
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      memoryCache.set(key, value);
    }
  }
};

const TransactionsContext = createContext(null);

const INITIAL_SUMMARY = {
  balance: 0,
  income: 0,
  expenses: 0,
};

// Storage Keys
const getTxKey = (uid) => `@transactions_${uid}`;
const getSummaryKey = (uid) => `@summary_${uid}`;
const getQueueKey = (uid) => `@sync_queue_${uid}`;

export const TransactionsProvider = ({ children }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  
  const userId = user?.id;

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [isLoading, setIsLoading] = useState(true); // True initially for offline load
  const [error, setError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [hasLoaded, setHasLoaded] = useState(false);
  const getTokenRef = useRef(getToken);
  
  // Keep track of sync state to avoid parallel syncs
  const isSyncingRef = useRef(false);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // Load from AsyncStorage instantly on boot
  useEffect(() => {
    if (userId) {
      const loadLocalData = async () => {
        try {
          const localTx = await safeAsyncStorage.getItem(getTxKey(userId));
          const localSummary = await safeAsyncStorage.getItem(getSummaryKey(userId));
          
          if (localTx) setTransactions(JSON.parse(localTx));
          if (localSummary) setSummary(JSON.parse(localSummary));
        } catch (e) {
          console.error("Failed to load local data:", e);
        } finally {
          setIsLoading(false);
        }
      };
      loadLocalData();
    }
  }, [userId]);

  // Sync Queue Processor
  const processSyncQueue = useCallback(async () => {
    if (!userId || isSyncingRef.current) return;
    
    try {
      isSyncingRef.current = true;
      setIsSyncing(true);
      
      const token = await getTokenRef.current();
      if (!token) return;

      const queueStr = await safeAsyncStorage.getItem(getQueueKey(userId));
      let queue = queueStr ? JSON.parse(queueStr) : [];
      
      if (queue.length === 0) return;

      const headers = { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      let newQueue = [...queue];

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        try {
          if (item.action === "CREATE") {
            const url = `${API_URL}/transactions`;
            const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(item.payload) });
            
            if (response.ok) {
              const createdTx = await response.json();
              // Replace temp ID with real ID in state
              setTransactions(prev => {
                const updated = prev.map(t => t.id === item.tempId ? createdTx : t);
                safeAsyncStorage.setItem(getTxKey(userId), JSON.stringify(updated));
                return updated;
              });
              newQueue = newQueue.filter(q => q.tempId !== item.tempId);
            }
          } else if (item.action === "DELETE") {
            // If it was a temporary transaction, we can just remove it from queue
            if (item.tempId && String(item.payload).startsWith('temp_')) {
               newQueue = newQueue.filter(q => q.id !== item.id);
               continue;
            }
            
            const url = `${API_URL}/transactions/${encodeURIComponent(item.payload)}`;
            const response = await fetch(url, { method: "DELETE", headers });
            
            if (response.ok || response.status === 404) {
              newQueue = newQueue.filter(q => q.id !== item.id);
            }
          } else if (item.action === "UPDATE_STATUS") {
            if (item.tempId && String(item.tempId).startsWith('temp_')) {
               // Temporary transactions will get created with the updated status anyway
               newQueue = newQueue.filter(q => q.id !== item.id);
               continue;
            }
            
            const url = `${API_URL}/transactions/${encodeURIComponent(item.payload.id)}/status`;
            const response = await fetch(url, { 
              method: "PATCH", 
              headers, 
              body: JSON.stringify({ is_paid: item.payload.is_paid }) 
            });
            
            if (response.ok || response.status === 404) {
              newQueue = newQueue.filter(q => q.id !== item.id);
            }
          }
        } catch (err) {
          console.log("[Sync Error] Will retry later:", err);
          break; // Stop syncing on network error, try again later
        }
      }
      
      await safeAsyncStorage.setItem(getQueueKey(userId), JSON.stringify(newQueue));
    } catch (e) {
      console.error("[Sync Queue] Error processing queue:", e);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [userId]);

  const loadData = useCallback(async (force = false) => {
    if (!userId) return false;
    
    // Fire offline sync queue whenever we try to load data
    processSyncQueue();

    if (!force && hasLoaded) return true;

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
      if (!transactionsResponse.ok) throw new Error(transactionsData?.message || `Transactions request failed`);

      const summaryText = await summaryResponse.text();
      let summaryData = summaryText ? JSON.parse(summaryText) : {};
      if (!summaryResponse.ok) throw new Error(summaryData?.message || `Summary request failed`);

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
      
      // Update cache
      safeAsyncStorage.setItem(getTxKey(userId), JSON.stringify(normalizedTransactions));
      safeAsyncStorage.setItem(getSummaryKey(userId), JSON.stringify(normalizedSummary));
      
      return true;
    } catch (err) {
      setError(err?.message || "Unable to load transactions.");
      // We don't block the UI, they just see offline data
      return false;
    }
  }, [userId, hasLoaded, processSyncQueue]);

  // Optimistic Create
  const createTransaction = useCallback(async (txPayload) => {
    if (!userId) return false;
    
    const tempId = `temp_${Date.now()}`;
    const optimisticTx = {
      ...txPayload,
      id: tempId,
      _id: tempId, // Some components might use _id
      created_at: new Date().toISOString(),
    };

    // Update state instantly
    setTransactions(prev => {
      const updated = [optimisticTx, ...prev];
      safeAsyncStorage.setItem(getTxKey(userId), JSON.stringify(updated));
      return updated;
    });
    
    setSummary(prev => {
      const amount = Number(txPayload.amount);
      const updated = {
        balance: prev.balance + amount,
        income: amount > 0 ? prev.income + amount : prev.income,
        expenses: amount < 0 ? prev.expenses + Math.abs(amount) : prev.expenses,
      };
      safeAsyncStorage.setItem(getSummaryKey(userId), JSON.stringify(updated));
      return updated;
    });

    // Add to sync queue
    const queueStr = await safeAsyncStorage.getItem(getQueueKey(userId));
    const queue = queueStr ? JSON.parse(queueStr) : [];
    queue.push({ id: Date.now().toString(), action: "CREATE", payload: txPayload, tempId });
    await safeAsyncStorage.setItem(getQueueKey(userId), JSON.stringify(queue));

    // Try syncing silently in background
    processSyncQueue();
    
    return true;
  }, [userId, processSyncQueue]);

  // Optimistic Delete
  const deleteTransaction = useCallback(async (id) => {
    if (!id || !userId) return false;

    // Find the tx to delete so we can revert summary
    const txToDelete = transactions.find(t => String(t.id) === String(id) || String(t._id) === String(id));
    
    // Update state instantly
    setTransactions(prev => {
      const updated = prev.filter(t => String(t.id) !== String(id) && String(t._id) !== String(id));
      safeAsyncStorage.setItem(getTxKey(userId), JSON.stringify(updated));
      return updated;
    });
    
    if (txToDelete) {
      setSummary(prev => {
        const amount = Number(txToDelete.amount);
        const updated = {
          balance: prev.balance - amount,
          income: amount > 0 ? prev.income - amount : prev.income,
          expenses: amount < 0 ? prev.expenses - Math.abs(amount) : prev.expenses,
        };
        safeAsyncStorage.setItem(getSummaryKey(userId), JSON.stringify(updated));
        return updated;
      });
    }

    // Add to sync queue
    const queueStr = await safeAsyncStorage.getItem(getQueueKey(userId));
    const queue = queueStr ? JSON.parse(queueStr) : [];
    queue.push({ id: Date.now().toString(), action: "DELETE", payload: id, tempId: id });
    await safeAsyncStorage.setItem(getQueueKey(userId), JSON.stringify(queue));

    // Try syncing silently in background
    processSyncQueue();
    
    return true;
  }, [userId, transactions, processSyncQueue]);

  // Optimistic Mark as Paid
  const markTransactionAsPaid = useCallback(async (id) => {
    if (!id || !userId) return false;

    // Update state instantly
    setTransactions(prev => {
      const updated = prev.map(t => {
        if (String(t.id) === String(id) || String(t._id) === String(id)) {
          return { ...t, is_paid: true };
        }
        return t;
      });
      safeAsyncStorage.setItem(getTxKey(userId), JSON.stringify(updated));
      return updated;
    });

    // Add to sync queue
    const tx = transactions.find(t => String(t.id) === String(id) || String(t._id) === String(id));
    if (!tx || tx.is_paid) return;

    const queueStr = await safeAsyncStorage.getItem(getQueueKey(userId));
    const queue = queueStr ? JSON.parse(queueStr) : [];
    queue.push({ 
      id: Date.now().toString(), 
      action: "UPDATE_STATUS", 
      payload: { id, is_paid: true }, 
      tempId: id 
    });
    await safeAsyncStorage.setItem(getQueueKey(userId), JSON.stringify(queue));

    // Try syncing silently in background
    processSyncQueue();
    
    return true;
  }, [userId, transactions, processSyncQueue]);

  const refresh = useCallback(() => loadData(true), [loadData]);

  return (
    <TransactionsContext.Provider value={{
      transactions,
      summary,
      isLoading,
      isSyncing,
      error,
      loadData,
      hasLoaded,
      refresh,
      createTransaction,
      deleteTransaction,
      markTransactionAsPaid,
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
