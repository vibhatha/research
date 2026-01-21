"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Play, Save, CheckCircle2, Circle, Loader2, Sparkles, AlertCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Act } from "@/lib/types"
import { BatchSelectionTable } from "@/components/acts/BatchSelectionTable"
import { AnalysisResultView } from "@/components/acts/AnalysisResultView"
import { useApiKey } from "@/hooks/useApiKey"
import { SettingsSheet } from "@/components/acts/SettingsSheet"

// Types
type AnalysisStatus = "idle" | "queued" | "running" | "completed" | "failed"

interface BatchItem {
    id: string
    act: Act
    status: AnalysisStatus
    result?: any
    error?: string
}

export default function BatchAnalysisPage() {
    // State
    const [acts, setActs] = React.useState<Act[]>([])
    const [isLoadingActs, setIsLoadingActs] = React.useState(true)
    const [step, setStep] = React.useState<"selection" | "analysis">("selection")
    const [selectedIds, setSelectedIds] = React.useState<string[]>([])

    // Analysis State
    // Analysis State
    const [batchItems, setBatchItems] = React.useState<BatchItem[]>([])
    const [customPrompt, setCustomPrompt] = React.useState("")
    const { apiKey } = useApiKey() // Use global key
    const [activeViewId, setActiveViewId] = React.useState<string | "overview">("overview")
    const [isAnalysisRunning, setIsAnalysisRunning] = React.useState(false)

    // Load available acts on mount
    React.useEffect(() => {
        const fetchActs = async () => {
            try {
                // We need to fetch acts client-side or pass them as props if this was a server component.
                // Since this is a "use client" component and the existing pattern uses a server component for the list,
                // we might need to fetch from the API.
                // Reusing the fetch logic from `web/app/acts/page.tsx` but client-side.
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                const res = await fetch(`${apiUrl}/acts`)
                if (res.ok) {
                    const data = await res.json()
                    setActs(data)
                }
            } catch (e) {
                console.error("Failed to fetch acts", e)
            } finally {
                setIsLoadingActs(false)
            }
        }
        fetchActs()
    }, [])

    const handleSelectionChange = React.useCallback((ids: string[]) => {
        setSelectedIds(ids)
    }, [])

    const startAnalysisSetup = () => {
        // Initialize batch items
        const items: BatchItem[] = selectedIds.map(id => {
            const act = acts.find(a => a.doc_id === id)
            if (!act) throw new Error(`Act ${id} not found`) // Should not happen
            return {
                id,
                act,
                status: "idle"
            }
        })
        setBatchItems(items)
        setStep("analysis")
        setActiveViewId("overview")
    }

    const runBatchAnalysis = async () => {
        if (!apiKey) {
            alert("Please enter API Key")
            return
        }
        setIsAnalysisRunning(true)

        // Queue all items
        setBatchItems(prev => prev.map(item => ({ ...item, status: "queued", error: undefined })))

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

        // Create promise factories
        const promises = batchItems.map(item => {
            return async () => {
                // Update status to running
                setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "running" } : i))

                try {
                    const res = await fetch(`${apiUrl}/analyze`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            doc_id: item.id,
                            api_key: apiKey,
                            custom_prompt: customPrompt,
                            force_refresh: true, // Always force for batch? Or allow option?
                        })
                    })
                    const data = await res.json()

                    if (res.ok) {
                        setBatchItems(prev => prev.map(i => i.id === item.id ? {
                            ...i,
                            status: "completed",
                            result: data // store full response so AnalysisResultView can render everything
                        } : i))
                    } else {
                        throw new Error(data.detail || "Unknown error")
                    }
                } catch (e: any) {
                    setBatchItems(prev => prev.map(i => i.id === item.id ? {
                        ...i,
                        status: "failed",
                        error: e.message
                    } : i))
                }
            }
        })

        // Run all concurrently (browser limit applies usually around 6)
        // For actual concurrency control we might need a pool, but Promise.all is fine for reasonable numbers (<20)
        // If users select 100, we might want to chunk it.
        // Let's rely on basic Promise.all for now.
        // FIXME: Issue #23 (https://github.com/LDFLK/research/issues/23) - Excessive concurrency risk with Promise.all
        await Promise.all(promises.map(p => p()))

        setIsAnalysisRunning(false)
    }

    const handleSaveAll = () => {
        const completed = batchItems.filter(i => i.status === "completed" && i.result)
        if (completed.length === 0) return

        const exportData = completed.map(i => ({
            act_id: i.id,
            act_title: i.act.description,
            act_number: i.act.doc_number,
            result: typeof i.result === 'string' ? i.result : JSON.stringify(i.result), // Allow for Markdown or Object
            prompt: customPrompt
        }))

        const fileName = `batch-analysis-${new Date().toISOString().split('T')[0]}.json`
        const jsonStr = JSON.stringify(exportData, null, 2)
        const blob = new Blob([jsonStr], { type: "application/json" })
        const href = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = href
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Render Selection Step
    if (step === "selection") {
        return (
            <div className="h-screen flex flex-col">
                <header className="h-14 border-b px-4 flex items-center justify-between bg-background">
                    <div className="flex items-center gap-2">
                        <Link href="/acts">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </Link>
                        <span className="font-semibold">Batch Analysis: Selection</span>
                    </div>
                </header>
                <div className="flex-1 p-6 space-y-4 overflow-auto">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Select Gazettes to Analyze</h2>
                        <Button onClick={startAnalysisSetup} disabled={selectedIds.length === 0}>
                            Proceed with {selectedIds.length} Selected
                            <Play className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                    {isLoadingActs ? (
                        <div>Loading acts...</div>
                    ) : (
                        <BatchSelectionTable data={acts} onSelectionChange={handleSelectionChange} />
                    )}
                </div>
            </div>
        )
    }

    // Render Analysis Step
    const activeItem = batchItems.find(i => i.id === activeViewId)
    const completedCount = batchItems.filter(i => i.status === "completed").length
    const progress = Math.round((completedCount / batchItems.length) * 100)

    return (
        <div className="h-screen flex flex-col">
            <header className="h-14 border-b px-4 flex items-center justify-between bg-background shrink-0">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setStep("selection")}>
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    <span className="font-semibold">Batch Analysis</span>
                    <Badge variant="secondary">{batchItems.length} Acts</Badge>
                </div>
                {/* Global Actions */}
                <div className="flex gap-2">
                    <SettingsSheet />
                    <Button variant="outline" onClick={handleSaveAll} disabled={completedCount === 0}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Results
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Queue */}
                <div className="w-80 border-r bg-muted/10 flex flex-col">
                    <div className="p-4 border-b">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="mt-4">
                            <Button
                                variant={activeViewId === "overview" ? "secondary" : "ghost"}
                                className="w-full justify-start text-sm"
                                onClick={() => setActiveViewId("overview")}
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                Overview & Configuration
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <div className="p-2 space-y-1">
                            {batchItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => setActiveViewId(item.id)}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-md cursor-pointer text-sm transition-colors
                                        ${activeViewId === item.id ? 'bg-white shadow-sm border border-slate-200' : 'hover:bg-slate-100'}
                                    `}
                                >
                                    {item.status === "idle" && <Circle className="h-4 w-4 text-slate-300" />}
                                    {item.status === "queued" && <Circle className="h-4 w-4 text-slate-400 dashed" />}
                                    {item.status === "running" && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
                                    {item.status === "completed" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                    {item.status === "failed" && <AlertCircle className="h-4 w-4 text-red-500" />}

                                    <div className="flex-1 min-w-0">
                                        <div className="truncate font-medium">{item.act.doc_number}</div>
                                        <div className="truncate text-xs text-muted-foreground">{item.act.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden bg-background flex flex-col">
                    {activeViewId === "overview" ? (
                        <div className="p-8 max-w-3xl mx-auto w-full">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Batch Configuration</CardTitle>
                                    <CardDescription>Configure and run analysis for {batchItems.length} selected acts.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">

                                    <div className="space-y-2">
                                        <Label>Instruction / Prompt</Label>
                                        <Textarea
                                            placeholder="E.g. Identify all penalties and fines listed in this act..."
                                            value={customPrompt}
                                            onChange={e => setCustomPrompt(e.target.value)}
                                            className="min-h-[150px]"
                                        />
                                    </div>

                                    <Button
                                        size="lg"
                                        className="w-full"
                                        onClick={runBatchAnalysis}
                                        disabled={isAnalysisRunning || !apiKey || batchItems.some(i => i.status === "running")}
                                    >
                                        {isAnalysisRunning ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Processing Batch...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="mr-2 h-4 w-4" />
                                                Run Batch Analysis
                                            </>
                                        )}
                                    </Button>

                                    {completedCount > 0 && (
                                        <div className="p-4 bg-slate-50 rounded-lg border text-center">
                                            <div className="text-2xl font-bold text-green-600 mb-1">{completedCount} / {batchItems.length}</div>
                                            <div className="text-sm text-muted-foreground">Analyses Completed</div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ) : activeItem ? (
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                                <div>
                                    <h2 className="font-semibold">{activeItem.act.doc_number}: {activeItem.act.description}</h2>
                                    <span className="text-xs text-muted-foreground">Status: {activeItem.status}</span>
                                </div>
                                {activeItem.act.url_pdf && (
                                    <a href={activeItem.act.url_pdf} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" size="sm">
                                            <FileText className="h-4 w-4 mr-2" />
                                            Open PDF
                                        </Button>
                                    </a>
                                )}
                            </div>
                            <div className="flex-1 overflow-auto p-6">
                                {activeItem.status === "completed" && activeItem.result && (
                                    <AnalysisResultView analysisData={activeItem.result} />
                                )}
                                {activeItem.status === "failed" && (
                                    <div className="text-red-500 p-4 border border-red-200 rounded bg-red-50">
                                        Error: {activeItem.error}
                                    </div>
                                )}
                                {(activeItem.status === "running" || activeItem.status === "queued") && (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                        <span className="ml-2">Analysis in progress...</span>
                                    </div>
                                )}
                                {activeItem.status === "idle" && (
                                    <div className="text-center text-muted-foreground mt-20">
                                        Waiting to start. Go to "Overview" to run batch.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">Select an item to view details</div>
                    )}
                </div>
            </div>
        </div>
    )
}
