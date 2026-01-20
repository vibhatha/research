"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle2, AlertTriangle, Search } from "lucide-react"

interface DuplicateResult {
    title: string
    doc_id: string
    score: number
}

export function AddActForm() {
    const [title, setTitle] = useState("")
    const [url, setUrl] = useState("")
    const [year, setYear] = useState("")
    const [duplicates, setDuplicates] = useState<DuplicateResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [hasChecked, setHasChecked] = useState(false)
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Reset check status when inputs change
    const handleInputChange = (setter: (val: string) => void, val: string) => {
        setter(val)
        setHasChecked(false)
        setMsg(null)
    }

    const checkDuplicates = async () => {
        if (!title) return
        setIsLoading(true)
        setMsg(null)
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
            } else {
                // Don't set success msg if dups found, just show the list
            }
        } catch (e) {
            setMsg({ type: 'error', text: "Failed to check duplicates" })
        } finally {
            setIsLoading(false)
        }
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

        } catch (e: any) {
            setMsg({ type: 'error', text: e.message })
        } finally {
            setIsLoading(false)
        }
    }

    // Check button enabled if title is present
    const isCheckDisabled = !title || isLoading

    // Add button enabled only if all fields present AND checked AND not loading
    const isAddDisabled = !title || !url || !year || !hasChecked || isLoading

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add Single Act</CardTitle>
                <CardDescription>Manually add a missing act. All fields are required. You must check for duplicates before adding.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Act Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => handleInputChange(setTitle, e.target.value)}
                            placeholder="e.g. Monetary Law Act No. 58 of 1949"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="url">Act URL (PDF or Website)</Label>
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
                            {hasChecked ? "Re-check Duplicates" : "Check Duplicates"}
                        </Button>
                    </div>

                    {duplicates.length > 0 && (
                        <div className="rounded-md border p-4 bg-muted/50">
                            <h4 className="mb-2 font-medium flex items-center gap-2 text-yellow-600">
                                <AlertTriangle className="h-4 w-4" /> Potential Duplicates Found
                            </h4>
                            <p className="text-xs text-muted-foreground mb-2">Please verify this act isn't already in the list.</p>
                            <ul className="text-sm space-y-2">
                                {duplicates.map((d) => (
                                    <li key={d.doc_id} className="flex justify-between items-center bg-background p-2 rounded border">
                                        <span>{d.title}</span>
                                        <span className="text-xs bg-secondary px-2 py-1 rounded">Match: {(d.score * 100).toFixed(0)}%</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {msg && (
                        <Alert variant={msg.type === 'error' ? "destructive" : "default"} className={msg.type === 'success' ? "border-green-500 text-green-600" : ""}>
                            {msg.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                            <AlertTitle>{msg.type === 'success' ? "Success" : "Error"}</AlertTitle>
                            <AlertDescription>{msg.text}</AlertDescription>
                        </Alert>
                    )}

                    <Button type="submit" className="w-full" disabled={isAddDisabled}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Add Act
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
