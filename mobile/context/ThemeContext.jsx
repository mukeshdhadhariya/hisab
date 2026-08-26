import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  THEMES,
  THEME_KEYS,
} from "../constants/colors";

const ThemeContext =
  createContext(null);

export const ThemeProvider = ({
  children,
}) => {
  const [themeName, setThemeName] =
    useState("light");

  const theme =
    THEMES[themeName] ??
    THEMES.light;

  const cycleTheme = () => {
    setThemeName((current) => {
      const currentIndex =
        THEME_KEYS.indexOf(current);

      const nextIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + 1) %
            THEME_KEYS.length;

      return THEME_KEYS[nextIndex];
    });
  };

  const value = useMemo(
    () => ({
      themeName,
      theme,
      cycleTheme,
      setTheme: setThemeName,
    }),
    [
      themeName,
      theme,
    ]
  );

  return (
    <ThemeContext.Provider
      value={value}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
};