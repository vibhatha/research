"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle2, AlertTriangle, Search, ExternalLink, FileText, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DuplicateResult {
    title: string
    doc_id: string
    score: number
}

interface ActMetadata {
    doc_id: string
    title: string | null
    url_pdf: string | null
    year: string | null
    description: string | null
}

interface AnalysisHistory {
    id: number
    timestamp: string
    prompt: string
    response: string
    model: string
}

export function AddActForm() {
    const [title, setTitle] = useState("")
    const [url, setUrl] = useState("")
    const [year, setYear] = useState("")
    const [duplicates, setDuplicates] = useState<DuplicateResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [hasChecked, setHasChecked] = useState(false)
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [overrideDuplicates, setOverrideDuplicates] = useState(false)

    // Details View State
    const [selectedAct, setSelectedAct] = useState<ActMetadata | null>(null)
    const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisHistory[]>([])
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null)

    // Reset check status when inputs change
    const handleInputChange = (setter: (val: string) => void, val: string) => {
        setter(val)
        setHasChecked(false)
        setMsg(null)
        setOverrideDuplicates(false)
    }

    const checkDuplicates = async () => {
        if (!title) return
        setIsLoading(true)
        setMsg(null)
        setOverrideDuplicates(false)
        try {
            const res = await fetch("http://localhost:8000/acts/check-duplicate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, url_pdf: url, year: year || undefined })
            })
            if (!res.ok) throw new Error("Check failed")
            const data = await res.json()
            setDuplicates(data)
            setHasChecked(true)

            if (data.length === 0) {
                setMsg({ type: 'success', text: "No duplicates found. You can proceed to add." })
                // If no duplicates, ensure details are closed
                setDetailsOpen(false)
            }
        } catch (e) {
            setMsg({ type: 'error', text: "Failed to check duplicates" })
        } finally {
            setIsLoading(false)
        }
    }

    const handleViewDetails = async (doc_id: string, defaultTitle?: string) => {
        setLoadingDetails(true)
        setDetailsOpen(true) // Open immediately to start animation, spinner will show in panel
        try {
            // Fetch Metadata
            const resMeta = await fetch(`http://localhost:8000/acts/${doc_id}`)
            if (!resMeta.ok) throw new Error("Failed to load details")
            const meta = await resMeta.json()

            // If metadata title is missing/null, fallback to the one from the duplicate list
            if (!meta.title && defaultTitle) {
                meta.title = defaultTitle
            }

            setSelectedAct(meta)

            // Fetch History (Analysis) - optional
            try {
                const resHist = await fetch(`http://localhost:8000/acts/${doc_id}/history`)
                if (resHist.ok) {
                    const hist = await resHist.json()
                    setSelectedAnalysis(hist)
                } else {
                    setSelectedAnalysis([])
                }
            } catch (e) {
                console.warn("No history found")
                setSelectedAnalysis([])
            }

        } catch (e) {
            alert("Failed to load act details")
            setDetailsOpen(false)
        } finally {
            setLoadingDetails(false)
        }
    }

    const closeDetails = () => {
        setDetailsOpen(false)
        setSelectedAct(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !url || !year) {
            setMsg({ type: 'error', text: "All fields are required" })
            return
        }

        setIsLoading(true)
        setMsg(null)
        try {
            const res = await fetch("http://localhost:8000/acts/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    url_pdf: url,
                    year: year,
                    doc_type: "lk_acts"
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || "Failed to add act")
            }

            setMsg({ type: 'success', text: "Act added successfully!" })
            // Clear form
            setTitle("")
            setUrl("")
            setYear("")
            setDuplicates([])
            setHasChecked(false)
            setDetailsOpen(false)

        } catch (e: any) {
            setMsg({ type: 'error', text: e.message })
        } finally {
            setIsLoading(false)
        }
    }

    // Check button enabled if title is present
    const isCheckDisabled = !title || isLoading

    // Add button enabled only if:
    // 1. All fields filled
    // 2. Checked for duplicates
    // 3. Not loading
    // 4. EITHER no duplicates found OR user explicitly overwrote duplicate warning
    const isAddDisabled = !title || !url || !year || !hasChecked || isLoading || (duplicates.length > 0 && !overrideDuplicates)

    // Layout Classes
    const containerClasses = "flex gap-4 w-full transition-all duration-500 ease-in-out"

    // Width logic - 1:1:3 Ratio for 20%/20%/60%

    // Form Width
    let formClass = "transition-all duration-500 ease-in-out h-fit "
    if (!duplicates.length) {
        formClass += "w-full max-w-2xl" // Left aligned default
    } else if (!detailsOpen) {
        formClass += "flex-1 w-1/2"
    } else {
        formClass += "w-[20%] min-w-[250px] shrink-0"
    }

    // Duplicates Width
    let dupClass = "transition-all duration-500 ease-in-out h-fit "
    if (!detailsOpen) {
        dupClass += "flex-1 w-1/2"
    } else {
        dupClass += "w-[20%] min-w-[250px] shrink-0"
    }

    // Details Width
    let detailsClass = "transition-all duration-500 ease-in-out h-[85vh] flex flex-col border-l shadow-2xl bg-background "
    if (detailsOpen) {
        detailsClass += "flex-1 opacity-100 translate-x-0"
    } else {
        detailsClass += "w-0 opacity-0 translate-x-10 overflow-hidden absolute right-0 scale-95"
    }

    return (
        <div className={containerClasses}>
            {/* Column 1: Form */}
            <Card className={formClass}>
                <CardHeader>
                    <CardTitle>Add Act</CardTitle>
                    <CardDescription>Manually add a missing act.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Act Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => handleInputChange(setTitle, e.target.value)}
                                placeholder="Act Name..."
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="url">Act URL (PDF/Web)</Label>
                            <Input
                                id="url"
                                value={url}
                                onChange={(e) => handleInputChange(setUrl, e.target.value)}
                                placeholder="https://..."
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="year">Year</Label>
                            <Input
                                id="year"
                                value={year}
                                onChange={(e) => handleInputChange(setYear, e.target.value)}
                                placeholder="YYYY"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={hasChecked ? "outline" : "secondary"}
                                onClick={checkDuplicates}
                                disabled={isCheckDisabled}
                                className="w-full"
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                {hasChecked ? "Re-check" : "Check Duplicates"}
                            </Button>
                        </div>

                        {msg && (
                            <Alert variant={msg.type === 'error' ? "destructive" : "default"} className={msg.type === 'success' ? "border-green-500 text-green-600" : ""}>
                                {msg.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                                <AlertTitle>{msg.type === 'success' ? "Success" : "Error"}</AlertTitle>
                                <AlertDescription>{msg.text}</AlertDescription>
                            </Alert>
                        )}

                        {/* Duplicate Override Checkbox */}
                        {duplicates.length > 0 && (
                            <div className="flex items-center space-x-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-900/20">
                                <input
                                    type="checkbox"
                                    id="override"
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    checked={overrideDuplicates}
                                    onChange={(e) => setOverrideDuplicates(e.target.checked)}
                                />
                                <Label htmlFor="override" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-yellow-800 dark:text-yellow-200 cursor-pointer">
                                    I confirm this is not a duplicate
                                </Label>
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={isAddDisabled}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Add Act
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Column 2: Duplicates List */}
            {duplicates.length > 0 && (
                <Card className={`${dupClass} border-yellow-200 bg-yellow-50/10 dark:bg-yellow-900/10`}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-600 text-lg">
                            <AlertTriangle className="h-5 w-5" />
                            Duplicates
                        </CardTitle>
                        <CardDescription>
                            Verify uniqueness.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {duplicates.map((d) => (
                                <li key={d.doc_id} className={`flex flex-col gap-1 p-3 rounded-lg border transition-colors cursor-pointer ${selectedAct?.doc_id === d.doc_id ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-background hover:bg-muted/50'
                                    }`}
                                    onClick={() => handleViewDetails(d.doc_id, d.title)}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="font-medium text-sm line-clamp-2">{d.title}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono whitespace-nowrap ${d.score > 0.9 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {(d.score * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">{d.doc_id}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs hover:bg-transparent p-0 text-blue-500"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleViewDetails(d.doc_id, d.title)
                                            }}
                                        >
                                            View Details <ExternalLink className="ml-1 h-3 w-3" />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Column 3: Details Pane */}
            {detailsOpen && (
                <Card className={detailsClass}>
                    <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b shrink-0 space-y-0">
                        <div className="flex flex-col">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Act Details
                            </CardTitle>
                            <CardDescription className="text-xs font-mono">{selectedAct?.doc_id || "Loading..."}</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={closeDetails}>
                            <X className="h-5 w-5" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                        {loadingDetails ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="flex flex-1 overflow-hidden">
                                {/* Left Sub-pane: PDF */}
                                <div className="w-1/2 border-r bg-muted/20 relative flex flex-col">
                                    {selectedAct?.url_pdf ? (
                                        <iframe src={selectedAct.url_pdf} className="w-full h-full" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                                            <FileText className="h-12 w-12 mb-2" />
                                            <p>No PDF Preview</p>
                                        </div>
                                    )}
                                </div>

                                {/* Right Sub-pane: Info */}
                                <div className="w-1/2 flex flex-col bg-background">
                                    <div className="p-4 border-b bg-muted/5 text-sm space-y-2 shrink-0">
                                        <div className="font-semibold">{selectedAct?.title || "Unknown Title"}</div>
                                        <div className="flex gap-2 text-xs text-muted-foreground">
                                            <span>Year: {selectedAct?.year}</span>
                                            <span>•</span>
                                            <a href={selectedAct?.url_pdf || '#'} target="_blank" className="hover:underline text-blue-500 truncate max-w-[200px]">
                                                {selectedAct?.url_pdf}
                                            </a>
                                        </div>
                                    </div>
                                    <ScrollArea className="flex-1 p-4">
                                        <h4 className="font-semibold mb-3 text-sm flex items-center gap-2 sticky top-0 bg-background pb-2 z-10">
                                            Analysis History
                                            {selectedHistoryId !== null && (
                                                <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => setSelectedHistoryId(null)}>
                                                    ← Back to List
                                                </Button>
                                            )}
                                        </h4>

                                        {selectedAnalysis.length > 0 ? (
                                            <div className="space-y-4">
                                                {selectedHistoryId === null ? (
                                                    // List View
                                                    selectedAnalysis.map((hist, i) => (
                                                        <div
                                                            key={i}
                                                            className="mb-2 rounded-lg border bg-card p-3 cursor-pointer hover:bg-muted/50 transition-colors shadow-sm group"
                                                            // FIXME: Issue #24 (https://github.com/LDFLK/research/issues/24) - Unstable ID Usage
                                                            onClick={() => setSelectedHistoryId(i)}
                                                        >
                                                            <div className="flex justify-between items-start mb-1 gap-2">
                                                                <span className="font-bold text-sm text-primary line-clamp-1" title={hist.prompt}>
                                                                    {hist.prompt || "Untitled Analysis"}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                                                                    {new Date(hist.timestamp).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground border">
                                                                    {hist.model}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                                {hist.response}
                                                            </p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    // Detail View
                                                    (() => {
                                                        const hist = selectedAnalysis[selectedHistoryId]
                                                        if (!hist) return null
                                                        return (
                                                            <div className="animate-in fade-in zoom-in-95 duration-200">
                                                                <div className="mb-4 rounded-lg border bg-muted/5 p-4 text-sm">
                                                                    <div className="flex flex-col border-b pb-3 mb-3 gap-2">
                                                                        <span className="font-bold text-base text-primary leading-tight">
                                                                            {hist.prompt}
                                                                        </span>
                                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                            <span className="font-medium text-foreground">{hist.model}</span>
                                                                            <span>•</span>
                                                                            <span>{new Date(hist.timestamp).toLocaleString()}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="prose dark:prose-invert max-w-none">
                                                                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Response</h5>
                                                                        <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed bg-background p-3 rounded border">
                                                                            {hist.response}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })()
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-8">
                                                No automated analysis found.
                                            </p>
                                        )}
                                    </ScrollArea>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
