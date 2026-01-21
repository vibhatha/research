"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Settings, Sparkles, Save, FileText, ArrowLeft, History as HistoryIcon, ExternalLink, ChevronDown, RefreshCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ReactMarkdown from "react-markdown"
import { AnalysisResultView } from "@/components/acts/AnalysisResultView"
import { useApiKey } from "@/hooks/useApiKey"
import { SettingsSheet } from "@/components/acts/SettingsSheet"

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
    const { apiKey } = useApiKey()
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
    const [isAnalyzing, setIsAnalyzing] = React.useState(false)
    const [analysisData, setAnalysisData] = React.useState<any>(null)
    const [chatHistory, setChatHistory] = React.useState<any[]>([]) // Chat history state
    const [pdfRefresh, setPdfRefresh] = React.useState(0)
    const [customPrompt, setCustomPrompt] = React.useState("")
    const [actUrl, setActUrl] = React.useState<string | null>(null)
    const [showToast, setShowToast] = React.useState(false)
    const messagesEndRef = React.useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    React.useEffect(() => {
        scrollToBottom()
    }, [chatHistory, isAnalyzing])

    // Auto-load analysis logic
    React.useEffect(() => {
        if (id && apiKey && !analysisData && !historyId && !isAnalyzing) {
            handleAnalyze(false, true)
        }
    }, [id, apiKey])

    // Load Full History on Mount
    React.useEffect(() => {
        const fetchMeta = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                const res = await fetch(`${apiUrl}/acts/${id}/history`)
                if (res.ok) {
                    const hist = await res.json()
                    // Sort by timestamp asc for chat view
                    const sorted = hist.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

                    // Separate Base vs Chat
                    // We want the LATEST Base Analysis context
                    // Relax check to catch "Base Analysis", "Base Analysis (Refresh)", etc.
                    const baseItems = sorted.filter((h: any) => h.prompt && h.prompt.startsWith("Base Analysis"))
                    const latestBase = baseItems.length > 0 ? baseItems[baseItems.length - 1] : null

                    // Chat items are everything else
                    const chatItems = sorted.filter((h: any) => !h.prompt || !h.prompt.startsWith("Base Analysis"))

                    if (latestBase) {
                        try {
                            const baseData = JSON.parse(latestBase.response)
                            setAnalysisData(baseData)
                        } catch (e) {
                            console.error("Error parsing base history", e)
                        }
                    }
                    setChatHistory(chatItems)
                }
            } catch (e) {
                console.error("Failed to load history", e)
            }
        }
        if (id) fetchMeta()
    }, [id])

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



    // Derived
    const hasKey = apiKey.length > 0

    // Handlers
    const handleAnalyze = async (force: boolean = false, fetchOnly: boolean = false, promptOverride?: string) => {
        if (!hasKey) {
            // If auto-called (force=false), we might simply ignore if NO key, but here we check hasKey.
            // If checking specifically for User action, we might need a flag.
            // But logic says: if (!hasKey), open settings.
            if (!force && !analysisData) {
                // likely auto-load attempt without key, or user click. 
                // If user click, we want settings. If auto-load, we want nothing?
                // But this handler is called by user most times.
                // We will let it open settings.
            }
            if (force) {
                setIsSettingsOpen(true)
                return
            }
            // If fetchOnly and no key, just return silently?
            if (fetchOnly) return;

            setIsSettingsOpen(true)
            return
        }

        // Check if analysis exists and we are NOT forcing a refresh and NOT a custom prompt
        if (analysisData && !force && !customPrompt && !promptOverride && !fetchOnly) {
            setShowToast(true)
            setTimeout(() => setShowToast(false), 3000)
            return
        }

        setIsAnalyzing(true)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            const res = await fetch(`${apiUrl}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doc_id: id,
                    api_key: apiKey,
                    custom_prompt: promptOverride || customPrompt,
                    force_refresh: force,
                    fetch_only: fetchOnly
                })
            })

            const data = await res.json()
            if (res.ok) {
                if (data.status === "not_found") {
                    console.log("No existing analysis found. Waiting for user action.")
                } else {
                    setPdfRefresh(prev => prev + 1)

                    if (customPrompt) {
                        // Update Current View (Snapshot Model)
                        setAnalysisData((prev: any) => ({
                            ...prev,
                            custom_analysis: data.custom_analysis,
                            custom_prompt: promptOverride || customPrompt
                        }))

                        // Append to History List (for Drawer)
                        const newMsg = {
                            id: Date.now(),
                            prompt: promptOverride || customPrompt,
                            response: data.custom_analysis,
                            timestamp: new Date().toISOString(),
                            model: data.model
                        }
                        setChatHistory(prev => [...prev, newMsg])

                        // setLoadingChatId(null) // Removed to fix lint
                    } else {
                        // Base Analysis Update
                        setAnalysisData(data)
                        // Also append to history if it was a refresh? 
                        // The backend saves it to history, so a refresh would pick it up.
                    }
                }
            } else {
                console.error("Analysis failed:", JSON.stringify(data))
                alert("Analysis failed: " + (data.detail || data.error || "Unknown error"))
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

        // Merge chatHistory into the saved file
        const exportData = {
            ...analysisData,
            history: chatHistory, // The structured chat history
            // We could also export the raw full history if we had it, but chatHistory + custom_analysis (which is base) covers it.
            // Actually, let's explicitly note this is a v2 export
            version: "2.0"
        }

        const jsonStr = JSON.stringify(exportData, null, 2)
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


    const SUGGESTED_QUESTIONS = [
        "Which department this act is used to get the work done?",
        "What are the key penalties defined in this act?",
        "Who is the appointing authority for the board?",
        "What are the meeting times of various councils, boards or departments?"
    ]

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
                    <SettingsSheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
                    <HistoryDrawer docId={id} onSelect={(h: any) => {
                        if (h.prompt && h.prompt.startsWith("Base Analysis")) {
                            try {
                                const baseData = JSON.parse(h.response);
                                setAnalysisData(baseData);
                                setCustomPrompt("");
                            } catch (e) {
                                console.error("Failed to parse base history", e);
                            }
                        } else {
                            // Allow viewing specific chat item logic if needed,
                            // or perhaps we just want to load that context?
                            // For now, let's keep it simple: if they click a chat item, 
                            // we could maybe highlight it? Or do nothing?
                            // Reverting to old behavior: set it as "Custom Analysis" view
                            // which might be confusing with new UI, but let's enable it for "checking full history"
                            if (!analysisData) {
                                alert("Please run or load a base analysis first to view context.");
                                return;
                            }
                            setCustomPrompt(h.prompt);
                            // Load the selected item into the main view
                            setAnalysisData((prev: any) => ({
                                ...prev,
                                custom_analysis: h.response,
                                custom_prompt: h.prompt
                            }));
                            // Scroll to top or custom section?
                            // Maybe just ensure the custom section is visible
                        }
                    }} />

                    {/* Split Button Implementation */}
                    <div className="flex items-center rounded-md border border-input bg-background shadow-xs">
                        <Button
                            onClick={() => handleAnalyze(false)}
                            disabled={isAnalyzing}
                            className="rounded-none rounded-l-md border-r border-input bg-black hover:bg-gray-800 text-white gap-2 px-3 focus-visible:z-10"
                        >
                            <Sparkles className="h-4 w-4" />
                            {isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="rounded-none rounded-r-md px-2 bg-black hover:bg-gray-800 text-white border-l-0 focus-visible:z-10"
                                    disabled={isAnalyzing}
                                >
                                    <ChevronDown className="h-4 w-4" />
                                    <span className="sr-only">More options</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleAnalyze(true)} disabled={!analysisData || isAnalyzing}>
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    <span>Re-run Analysis</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleSave}
                        disabled={!analysisData}
                    >
                        <Save className="h-4 w-4" />
                        Save
                    </Button>

                    {/* Toast Notification */}
                    {showToast && (
                        <div className="absolute top-12 right-20 bg-black text-white text-xs px-3 py-2 rounded shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
                            Analysis exists. Use dropdown to re-run.
                        </div>
                    )}
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
                                    onClick={() => handleAnalyze(false)}
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

                            {/* Suggested Questions */}
                            <div className="flex flex-wrap gap-2">
                                {SUGGESTED_QUESTIONS.map((q, i) => (
                                    <div
                                        key={i}
                                        onClick={() => {
                                            if (isAnalyzing) return;
                                            setCustomPrompt(q);
                                            handleAnalyze(false, false, q);
                                        }}
                                        className={`
                                            px-3 py-2 rounded-md border text-xs font-medium cursor-pointer transition-all duration-200
                                            ${isAnalyzing
                                                ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
                                                : 'bg-card hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 text-foreground/80 hover:text-foreground hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                                            }
                                        `}
                                    >
                                        {q}
                                    </div>
                                ))}
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
                                    <AnalysisResultView analysisData={analysisData} />
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
