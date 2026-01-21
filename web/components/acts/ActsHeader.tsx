"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Activity, Layers, PlusCircle } from "lucide-react"
import { SettingsSheet } from "@/components/acts/SettingsSheet"

export function ActsHeader() {
    return (
        <div className="flex h-16 items-center px-4">
            <Link href="/acts" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 p-1.5 rounded-lg">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6 text-indigo-600"
                    >
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                </div>
                <h2 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-primary bg-clip-text text-transparent">XploreActs</h2>
            </Link>
            <div className="ml-auto flex items-center space-x-4">
                <Link href="/acts/add">
                    <Button variant="outline" size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Act
                    </Button>
                </Link>
                <Link href="/acts/batch">
                    <Button variant="default" size="sm">
                        <Layers className="mr-2 h-4 w-4" />
                        Batch Analysis
                    </Button>
                </Link>
                <Link href="/analytics">
                    <Button variant="outline" size="sm">
                        <Activity className="mr-2 h-4 w-4" />
                        System Observability
                    </Button>
                </Link>
                <SettingsSheet />
            </div>
        </div>
    )
}
