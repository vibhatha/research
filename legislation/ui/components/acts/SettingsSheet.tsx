"use client"

import * as React from "react"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useApiKey } from "@/hooks/useApiKey"

export interface SettingsSheetProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function SettingsSheet({ open: controlledOpen, onOpenChange: controlledOnOpenChange }: SettingsSheetProps) {
    const { apiKey, setApiKey } = useApiKey()
    const [internalOpen, setInternalOpen] = React.useState(false)

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
    const onOpenChange = controlledOnOpenChange || setInternalOpen

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Global Settings</SheetTitle>
                    <SheetDescription>
                        Configure settings for the application. Keys are stored in session storage.
                    </SheetDescription>
                </SheetHeader>
                <div className="py-6 space-y-4">
                    <div className="space-y-2">
                        <Label>Gemini API Key</Label>
                        <Input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API Key"
                        />
                        <p className="text-xs text-muted-foreground pt-1">
                            Required for AI analysis features.
                        </p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
