"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Activity, Layers } from "lucide-react"
import { SettingsSheet } from "@/components/acts/SettingsSheet"

export function ActsHeader() {
    return (
        <div className="flex h-16 items-center px-4">
            <h2 className="text-lg font-semibold">Sri Lankan Legislative Acts</h2>
            <div className="ml-auto flex items-center space-x-4">
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
