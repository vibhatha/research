"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Settings, Sparkles, Save, FileText, ArrowLeft, History as HistoryIcon, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"

// Basic PDF Viewer using iframe
const PdfViewer = ({ url, refreshTrigger }: { url: string, refreshTrigger: number }) => {
    const [exists, setExists] = React.useState<boolean | null>(null)

    React.useEffect(() => {
        const checkFile = async () => {
            try {
                const res = await fetch(url, { method: 'HEAD' })
                if (res.ok) {
                    setExists(true)
                } else {
                    // unexpected status code
                    setExists(false)
                }
            } catch (e) {
                // If fetch fails (e.g. CORS error), we assume it might exist and let the iframe try to load it.
                // We only block if we definitely get a 404/error response from the server above.
                console.warn("PDF check failed (likely CORS), attempting to load anyway:", e)
                setExists(true)
            }
        }
        checkFile()
    }, [url, refreshTrigger])

    if (exists === null) return <div className="p-4 text-sm text-muted-foreground">Loading PDF...</div>
    if (exists === false) return (
        <div className="p-10 text-center space-y-4">
            <div className="text-destructive font-medium">PDF Not Found</div>
            <p className="text-sm text-muted-foreground">Original document could not be located at {url}</p>
        </div>
    )

    return (
        <div className="w-full h-full border rounded-lg overflow-hidden bg-white">
            <iframe
                src={`${url}#view=FitH`}
                className="w-full h-full"
                title="PDF Viewer"
            />
        </div>
    )
}

const HistoryDrawer = ({ docId, onSelect }: { docId: string, onSelect: (item: any) => void }) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [history, setHistory] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(false)

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            const res = await fetch(`${apiUrl}/acts/${docId}/history`)
            if (res.ok) {
                const data = await res.json()
                setHistory(data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        if (isOpen) {
            fetchHistory()
        }
    }, [isOpen])

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                    <HistoryIcon className="h-4 w-4" />
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Analysis History</SheetTitle>
                    <SheetDescription>
                        Recent analysis runs.
                    </SheetDescription>
                </SheetHeader>
                <div className="py-6 flex flex-col h-full">
                    {loading && <div className="text-center text-sm text-muted-foreground">Loading history...</div>}
                    {!loading && history.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground">No history found.</div>
                    )}

                    <div className="space-y-3 overflow-y-auto flex-1 mb-4">
                        {history.slice(0, 5).map((item) => (
                            <div
                                key={item.id}
                                className="p-3 border rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                onClick={() => {
                                    onSelect(item)
                                    setIsOpen(false)
                                }}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</span>
                                    <Badge variant={item.prompt === "Base Analysis" ? "default" : "secondary"} className="text-[10px]">
                                        {item.prompt === "Base Analysis" ? "Base" : "Custom"}
                                    </Badge>
                                </div>
                                <p className="text-sm font-medium line-clamp-2" title={item.prompt}>
                                    "{item.prompt}"
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-4 border-t">
                        <Link href={`/acts/analyze/${docId}/history`}>
                            <Button variant="outline" className="w-full gap-2">
                                <ExternalLink className="h-3 w-3" />
                                View Full History
                            </Button>
                        </Link>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

export default function AnalysisPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const id = params.id as string
    const historyId = searchParams.get("history_id")

    // State
    const [apiKey, setApiKey] = React.useState("")
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
    const [isAnalyzing, setIsAnalyzing] = React.useState(false)
    const [analysisData, setAnalysisData] = React.useState<any>(null)
    const [pdfRefresh, setPdfRefresh] = React.useState(0)
    const [customPrompt, setCustomPrompt] = React.useState("")
    const [actUrl, setActUrl] = React.useState<string | null>(null)

    // Load key from session storage on mount
    React.useEffect(() => {
        const storedKey = sessionStorage.getItem("gemini_api_key")
        if (storedKey) setApiKey(storedKey)
    }, [])

    // Restore from history if ID is present
    React.useEffect(() => {
        if (!historyId) return

        const fetchHistoryItem = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                const res = await fetch(`${apiUrl}/history/${historyId}`)
                if (res.ok) {
                    const h = await res.json()

                    if (h.prompt === "Base Analysis") {
                        try {
                            const baseData = JSON.parse(h.response)
                            setAnalysisData(baseData)
                            setCustomPrompt("")
                        } catch (e) {
                            console.error("Failed to parse base history", e)
                        }
                    } else {
                        // Better strategy: If we have no analysisData, verify if we can fetch base. 
                        // But for simplicity in this iteration:
                        setCustomPrompt(h.prompt)
                        setAnalysisData((prev: any) => {
                            if (!prev) {
                                // Fallback: try to just show custom analysis roughly
                                return { summary: "Loaded from history (Base context missing)", custom_analysis: h.response }
                            }
                            return {
                                ...prev,
                                custom_analysis: h.response
                            }
                        })
                    }
                    // Clean URL
                    router.replace(`/acts/analyze/${id}`)
                }
            } catch (e) {
                console.error("Failed to load history item", e)
            }
        }
        fetchHistoryItem()
    }, [historyId, id, router])

    // Fetch Act Details to get PDF URL
    React.useEffect(() => {
        const fetchActDetails = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                const res = await fetch(`${apiUrl}/acts/${id}`)
                if (res.ok) {
                    const act = await res.json()
                    // Ensure we use the URL from metadata, not local assumption
                    if (act.url_pdf) {
                        setActUrl(act.url_pdf)
                    } else {
                        console.warn("No PDF URL found in metadata for act", id)
                    }
                } else {
                    console.error("Failed to fetch act details", res.status)
                }
            } catch (e) {
                console.error("Failed to fetch act details", e)
            }
        }
        if (id) fetchActDetails()
    }, [id])

    // Save key to session storage when changed
    const handleKeyChange = (val: string) => {
        setApiKey(val)
        sessionStorage.setItem("gemini_api_key", val)
    }

    // Derived
    const hasKey = apiKey.length > 0

    // Handlers
    const handleAnalyze = async () => {
        if (!hasKey) {
            setIsSettingsOpen(true)
            return
        }

        setIsAnalyzing(true)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            const res = await fetch(`${apiUrl}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doc_id: id, api_key: apiKey, custom_prompt: customPrompt })
            })

            const data = await res.json()
            if (res.ok) {
                // Refresh PDF view as it might have been downloaded
                setPdfRefresh(prev => prev + 1)

                // Set the raw rich data
                setAnalysisData(data)
            } else {
                console.error("Analysis failed:", data)
                alert("Analysis failed: " + (data.error || "Unknown error"))
            }

        } catch (e) {
            console.error(e)
            alert("Error connecting to analysis service")
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleSave = () => {
        if (!analysisData) return

        const fileName = `${id}-analysis-${new Date().toISOString().split('T')[0]}.json`
        const jsonStr = JSON.stringify(analysisData, null, 2)
        const blob = new Blob([jsonStr], { type: "application/json" })
        const href = URL.createObjectURL(blob)

        const link = document.createElement("a")
        link.href = href
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(href)
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <header className="h-14 border-b px-4 flex items-center justify-between bg-background">
                <div className="flex items-center gap-2">
                    <Link href="/acts">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </Link>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">Analysis: {id}</span>
                </div>

                <div className="flex items-center gap-2">
                    <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Analysis Settings</SheetTitle>
                                <SheetDescription>
                                    Configure AI settings for this session. Keys are cleared on exit.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="py-6 space-y-4">
                                <div className="space-y-2">
                                    <Label>Gemini API Key</Label>
                                    <Input
                                        type="password"
                                        placeholder="sk-..."
                                        value={apiKey}
                                        onChange={e => handleKeyChange(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Required for &quot;AI Analyze&quot; feature.
                                    </p>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <HistoryDrawer docId={id} onSelect={(h: any) => {
                        if (h.prompt === "Base Analysis") {
                            try {
                                const baseData = JSON.parse(h.response);
                                setAnalysisData(baseData);
                                setCustomPrompt(""); // Clear custom since we reverted to base
                            } catch (e) {
                                console.error("Failed to parse base history", e);
                            }
                        } else {
                            if (!analysisData) {
                                alert("Please run or load a base analysis first to view context.");
                                return;
                            }
                            setCustomPrompt(h.prompt);
                            setAnalysisData((prev: any) => ({
                                ...prev,
                                custom_analysis: h.response
                            }));
                        }
                    }} />


                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleSave}
                        disabled={!analysisData}
                    >
                        <Save className="h-4 w-4" />
                        Save
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
                {/* Left: PDF Viewer */}
                <div className="p-4 border-r bg-muted/10 h-full overflow-hidden">
                    {actUrl ? (
                        <PdfViewer url={actUrl} refreshTrigger={pdfRefresh} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            Fetching document path...
                        </div>
                    )}
                </div>

                {/* Right: Annotations / Assistant */}
                <div className="p-4 h-full overflow-y-auto bg-background">
                    <Card className="h-full border-none shadow-none flex flex-col">
                        <CardHeader className="px-0 pt-0 pb-4 border-b mb-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <CardTitle>Analysis Results</CardTitle>
                                {analysisData && (
                                    <Badge variant="outline" className="text-xs font-normal">
                                        {analysisData.model || "gemini-2.0-flash"}
                                    </Badge>
                                )}
                            </div>

                            {/* Analysis Input Area */}
                            <div className="flex gap-2 items-start">
                                <Textarea
                                    placeholder="Enter custom instructions or ask a question (leave empty for base analysis)..."
                                    value={customPrompt}
                                    onChange={e => setCustomPrompt(e.target.value)}
                                    className="min-h-[80px] text-sm resize-y"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                            handleAnalyze();
                                        }
                                    }}
                                />
                                <Button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className="h-[80px] w-[80px] flex-shrink-0 flex flex-col gap-1"
                                    variant={hasKey ? "default" : "secondary"}
                                    title={hasKey ? "Run Analysis (Cmd+Enter)" : "Set API Key first"}
                                >
                                    {isAnalyzing ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                        <Sparkles className="h-5 w-5" />
                                    )}
                                    <span className="text-xs">{isAnalyzing ? "Running" : "Analyze"}</span>
                                </Button>
                            </div>
                            {!hasKey && (
                                <p className="text-xs text-destructive">
                                    * API Key missing. Configure in <span className="font-bold cursor-pointer" onClick={() => setIsSettingsOpen(true)}>Settings</span>.
                                </p>
                            )}
                        </CardHeader>
                        <CardContent className="px-0 flex-1 overflow-y-auto space-y-6">
                            {!analysisData ? (
                                <div className="text-center text-muted-foreground py-10">
                                    No analysis data. Click &quot;AI Analyze&quot; to start.
                                </div>
                            ) : (
                                <>
                                    {/* Summary Section */}
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Summary</h3>
                                        <p className="text-sm leading-relaxed">{analysisData.summary || "No summary available."}</p>
                                    </div>

                                    {analysisData.custom_analysis && (
                                        <>
                                            <Separator />
                                            <div className="space-y-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                                                <h3 className="font-semibold text-sm uppercase text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-2">
                                                    <Sparkles className="h-3 w-3" />
                                                    Custom Analysis
                                                </h3>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{analysisData.custom_analysis}</p>
                                            </div>
                                        </>
                                    )}

                                    <Separator />

                                    {/* Entities Section */}
                                    {analysisData.entities && analysisData.entities.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Key Entities</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {analysisData.entities.map((entity: any, i: number) => (
                                                    <div key={i} className="p-3 border rounded-md bg-card space-y-1">
                                                        <div className="flex items-start justify-between">
                                                            <div className="font-medium text-sm">{entity.entity_name}</div>
                                                            <Badge variant="outline" className="text-[10px] uppercase">{entity.entity_type}</Badge>
                                                        </div>
                                                        {entity.excerpt && (
                                                            <p className="text-xs text-muted-foreground italic line-clamp-2" title={entity.excerpt}>
                                                                &quot;{entity.excerpt}&quot;
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <Separator />

                                    {/* Referenced Acts */}
                                    {analysisData.referenced_acts && analysisData.referenced_acts.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">References</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {analysisData.referenced_acts.map((ref: string, i: number) => (
                                                    <Badge key={i} variant="secondary" className="text-xs">{ref}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Amendments / Sections */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">
                                            {analysisData.sections ? "Sections Detected" : "Amendments"}
                                        </h3>

                                        {/* Render Sections if available */}
                                        {analysisData.sections && analysisData.sections.map((sec: any, idx: number) => (
                                            <div key={idx} className="p-4 border rounded-lg bg-card space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Badge variant="outline">Section {sec.section_number}</Badge>
                                                    {sec.footnotes && sec.footnotes.length > 0 && (
                                                        <Badge variant="destructive" className="text-[10px]">{sec.footnotes.length} Notes</Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-foreground/90 whitespace-pre-wrap">{sec.content}</div>

                                                {sec.footnotes && sec.footnotes.length > 0 && (
                                                    <div className="mt-3 bg-muted/30 p-2 rounded text-xs text-muted-foreground">
                                                        <strong>Notes:</strong>
                                                        <ul className="list-disc list-inside mt-1">
                                                            {sec.footnotes.map((note: string, ni: number) => (
                                                                <li key={ni}>{note}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Legacy Fallback for Amendments only */}
                                        {!analysisData.sections && analysisData.amended_sections && (
                                            <div className="space-y-2">
                                                {analysisData.amended_sections.map((sec: any, idx: number) => (
                                                    <div key={idx} className="p-3 border rounded">
                                                        <Badge>{analysisData.amendment_type}</Badge>
                                                        <p className="mt-1 text-sm">{sec}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div >
            </main >
            {/* Debug URL */}
            {
                historyId && (
                    <div className="fixed bottom-4 right-4 bg-yellow-100 p-2 rounded border border-yellow-300 text-xs">
                        Restoring valid history: {historyId}
                    </div>
                )
            }
        </div >
    )
}
