"use client"

import { redirect } from "next/navigation"
import { CheckProviderMain, EmptyProjectMain } from "./_components/main-empty"

import { useSettingsStore } from "@/store/useSettingsStore"
import { useProjectStore } from "@/store/useProjectStore"

export default function Home() {
  const { settings, isHydrated: isSettingsHydrated } = useSettingsStore()
  const { projects, isHydrated: isProjectsHydrated } = useProjectStore()

  if (!isSettingsHydrated || !isProjectsHydrated) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  const providerEnabled = [
    settings.provider.gemini, 
    settings.provider.claude, 
    settings.provider.openAI, 
    settings.provider.custom.apiKey
  ].some((value) => value && value.trim() !== "")

  if (!providerEnabled) {
    return <CheckProviderMain />
  }
  
  if (projects.length === 0) {
    return <EmptyProjectMain />
  }
  
  redirect(`/p/${projects[0].id}`)
}
