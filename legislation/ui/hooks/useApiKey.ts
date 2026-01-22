"use client"

import * as React from "react"

export const useApiKey = () => {
    const [apiKey, setApiKeyState] = React.useState("")

    React.useEffect(() => {
        // Load initial
        const stored = sessionStorage.getItem("gemini_api_key")
        if (stored) setApiKeyState(stored)

        // Listen for local changes
        const handleLocalChange = (e: CustomEvent) => {
            setApiKeyState(e.detail)
        }

        // Listen for other tabs (optional, but good)
        const handleStorage = (e: StorageEvent) => {
            if (e.key === "gemini_api_key") {
                setApiKeyState(e.newValue || "")
            }
        }

        // FIXME: Issue #26 (https://github.com/LDFLK/research/issues/26) - Unsafe Type Casting
        window.addEventListener("local-apikey-change", handleLocalChange as EventListener)
        window.addEventListener("storage", handleStorage)

        return () => {
            window.removeEventListener("local-apikey-change", handleLocalChange as EventListener)
            window.removeEventListener("storage", handleStorage)
        }
    }, [])

    const setApiKey = (key: string) => {
        setApiKeyState(key)
        sessionStorage.setItem("gemini_api_key", key)
        window.dispatchEvent(new CustomEvent("local-apikey-change", { detail: key }))
    }

    return { apiKey, setApiKey }
}
