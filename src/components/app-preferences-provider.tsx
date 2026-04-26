"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type AppLanguage = "en" | "bn"

type AppPreferencesContextValue = {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
  tx: (en: string, bn: string) => string
}

const AppPreferencesContext = createContext<AppPreferencesContextValue>({
  language: "en",
  setLanguage: () => {},
  tx: (en) => en,
})

const LANGUAGE_KEY = "uat:language"

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("en")

  useEffect(() => {
    if (typeof window === "undefined") return

    const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY)
    if (storedLanguage === "en" || storedLanguage === "bn") {
      setLanguageState(storedLanguage)
    }
  }, [])

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_KEY, nextLanguage)
    }
  }

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      language,
      setLanguage,
      tx: (en, bn) => (language === "bn" ? bn : en),
    }),
    [language],
  )

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>
}

export function useAppPreferences() {
  return useContext(AppPreferencesContext)
}
