"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Settings, Sparkles, Save, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Basic PDF Viewer using iframe
const PdfViewer = ({ url, refreshTrigger }: { url: string, refreshTrigger: number }) => {
    const [exists, setExists] = React.useState<boolean | null>(null)

    React.useEffect(() => {
        setExists(null) // Reset on trigger
        fetch(url, { method: 'HEAD' })
            .then(res => setExists(res.ok))
            .catch(() => setExists(false))
    }, [url, refreshTrigger])

    if (exists === null) return (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <span className="animate-pulse text-muted-foreground">Checking document availability...</span>
        </div>
    )

    if (!exists) {
        return (
            <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center border rounded-lg p-6 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                <h3 className="font-semibold text-lg">Document Ready to Retrieve</h3>
                <p className="text-muted-foreground max-w-xs mt-2 text-sm">
                    The source PDF is available. Click <span className="font-semibold text-primary">AI Analyze</span> to fetch it from the government archives and generate insights.
                </p>
            </div>
        )
    }

    return (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center border rounded-lg overflow-hidden">
            <iframe
                src={url}
                className="w-full h-full"
                title="PDF Viewer"
            />
        </div>
    )
}

export default function AnalysisPage() {
    const params = useParams()
    const id = params.id as string

    // State
    const [apiKey, setApiKey] = React.useState("")
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
    const [isAnalyzing, setIsAnalyzing] = React.useState(false)
    const [annotations, setAnnotations] = React.useState<any[]>([])
    const [pdfRefresh, setPdfRefresh] = React.useState(0)

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
                body: JSON.stringify({ doc_id: id, api_key: apiKey })
            })

            const data = await res.json()
            if (res.ok) {
                // Refresh PDF view as it might have been downloaded
                setPdfRefresh(prev => prev + 1)

                // Expect data to be the LLM JSON response
                // Parsing logic might depend on how specific the LLM output is.
                // Assuming analyze_with_llm returns a string, we might need to parse it if it's not already object.
                // The backend returns text. CLI prints it. API route parses standard out.
                // So 'data' should be the JSON object.

                // Normalize data for UI
                let items = []
                if (data.amended_sections) {
                    items = data.amended_sections.map((sec: any, idx: number) => ({
                        id: idx,
                        type: data.amendment_type || "Amendment",
                        section: sec,
                        note: data.summary || "Amended section"
                    }))
                } else {
                    // Fallback/Generic
                    items.push({ id: 0, type: "Info", section: "General", note: JSON.stringify(data) })
                }
                setAnnotations(items)
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

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <header className="h-14 border-b px-4 flex items-center justify-between bg-background">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">Analysis: {id}</span>
                </div>

                <div className="flex items-center gap-2">
                    <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Settings className="h-4 w-4" />
                                Settings
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
                                        onChange={e => setApiKey(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Required for "AI Analyze" feature.
                                    </p>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="gap-2"
                        variant={hasKey ? "default" : "secondary"}
                    >
                        {isAnalyzing ? "Analyzing..." : "AI Analyze"}
                        <Sparkles className="h-4 w-4" />
                    </Button>

                    <Button variant="outline" className="gap-2">
                        <Save className="h-4 w-4" />
                        Save
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
                {/* Left: PDF Viewer */}
                <div className="p-4 border-r bg-muted/10 h-full overflow-hidden">
                    <PdfViewer url={`/pdfs/${id}.pdf`} refreshTrigger={pdfRefresh} />
                </div>

                {/* Right: Annotations / Assistant */}
                <div className="p-4 h-full overflow-y-auto bg-background">
                    <Card className="h-full border-none shadow-none">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle>Findings</CardTitle>
                        </CardHeader>
                        <CardContent className="px-0 space-y-4">
                            {annotations.length === 0 ? (
                                <div className="text-center text-muted-foreground py-10">
                                    No annotations yet. Click "AI Analyze" or select text in the PDF to start.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {annotations.map((ann) => (
                                        <div key={ann.id} className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant="outline">{ann.type}</Badge>
                                                <span className="text-xs font-mono text-muted-foreground">Section {ann.section}</span>
                                            </div>
                                            <p className="text-sm">{ann.note}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
