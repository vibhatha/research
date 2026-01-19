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

    // Load key from session storage on mount
    React.useEffect(() => {
        const storedKey = sessionStorage.getItem("gemini_api_key")
        if (storedKey) setApiKey(storedKey)
    }, [])

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

    // Save key to session storage when changed
    const handleKeyChange = (val: string) => {
        setApiKey(val)
        sessionStorage.setItem("gemini_api_key", val)
    }

    // Derived
    const hasKey = apiKey.length > 0

    // Handlers
    const handleAnalyze = async (force: boolean = false, fetchOnly: boolean = false) => {
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
        if (analysisData && !force && !customPrompt && !fetchOnly) {
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
                    custom_prompt: customPrompt,
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
                            custom_prompt: customPrompt
                        }))

                        // Append to History List (for Drawer)
                        const newMsg = {
                            id: Date.now(),
                            prompt: customPrompt,
                            response: data.custom_analysis,
                            timestamp: new Date().toISOString(),
                            model: data.model
                        }
                        setChatHistory(prev => [...prev, newMsg])
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

                                    {/* Category Section */}
                                    {(analysisData.category || analysisData.sub_category) && (
                                        <>
                                            <Separator />
                                            <div className="space-y-2">
                                                <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Categorization</h3>
                                                <div className="flex gap-2">
                                                    {analysisData.category && (
                                                        <Badge className="bg-blue-600 hover:bg-blue-700">
                                                            {analysisData.category}
                                                        </Badge>
                                                    )}
                                                    {analysisData.sub_category && (
                                                        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                                                            {analysisData.sub_category}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Meeting Details Section */}
                                    {analysisData.meeting_details && analysisData.meeting_details.length > 0 && (
                                        <>
                                            <Separator />
                                            <div className="space-y-4">
                                                <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Meeting Information</h3>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {analysisData.meeting_details.map((meeting: any, i: number) => (
                                                        <div key={i} className="p-3 border rounded-md bg-card space-y-2">
                                                            <div className="font-medium text-sm">{meeting.description || "Meeting"}</div>
                                                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                                {meeting.frequency && <Badge variant="outline">Freq: {meeting.frequency}</Badge>}
                                                                {meeting.location && <Badge variant="outline">Loc: {meeting.location}</Badge>}
                                                                {meeting.time && <Badge variant="outline">Time: {meeting.time}</Badge>}
                                                            </div>
                                                            {meeting.excerpt && (
                                                                <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded">
                                                                    "{meeting.excerpt}"
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Board Members Section */}
                                    {analysisData.board_members && analysisData.board_members.length > 0 && (
                                        <>
                                            <Separator />
                                            <div className="space-y-4">
                                                <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Board / Committee Members</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {analysisData.board_members.map((member: any, i: number) => (
                                                        <div key={i} className="p-3 border rounded-md bg-card space-y-2">
                                                            <div className="flex justify-between items-start">
                                                                <div className="font-medium text-sm">{member.role_name}</div>
                                                                {member.appointing_authority && <Badge className="text-[10px]">Appointed by {member.appointing_authority}</Badge>}
                                                            </div>

                                                            <div className="space-y-1 text-xs">
                                                                {member.removal_criteria && (
                                                                    <div className="flex gap-1">
                                                                        <span className="font-semibold">Removal:</span>
                                                                        <span className="text-muted-foreground">{member.removal_criteria}</span>
                                                                    </div>
                                                                )}
                                                                {member.composition_criteria && (
                                                                    <div className="flex gap-1">
                                                                        <span className="font-semibold">Criteria:</span>
                                                                        <span className="text-muted-foreground">{member.composition_criteria}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {member.excerpt && (
                                                                <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded line-clamp-3" title={member.excerpt}>
                                                                    "{member.excerpt}"
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Custom Analysis Result Block (Restored) */}
                                    {analysisData.custom_analysis && (
                                        <>
                                            <Separator />
                                            <div className="space-y-4">
                                                <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-purple-600" />
                                                    Custom Analysis Result
                                                </h3>

                                                {/* Prompt Display - Moved out of header for visibility */}
                                                {analysisData.custom_prompt && (
                                                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md text-sm text-foreground/90 border-l-4 border-purple-400 mb-4">
                                                        <span className="font-semibold text-xs block mb-2 uppercase tracking-wide text-muted-foreground">Instruction</span>
                                                        {analysisData.custom_prompt}
                                                    </div>
                                                )}

                                                <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-6 shadow-xs">
                                                    <div className="prose max-w-none dark:prose-invert text-sm">
                                                        <ReactMarkdown>
                                                            {analysisData.custom_analysis}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
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
