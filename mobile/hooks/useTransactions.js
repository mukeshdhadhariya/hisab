import { useTransactionsContext } from "../context/TransactionsContext";

export const useTransactions = (userId) => {
  return useTransactionsContext();
};