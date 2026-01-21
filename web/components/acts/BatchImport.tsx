"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export function BatchImport() {
    const [input, setInput] = useState("")
    const [format, setFormat] = useState<'json' | 'csv'>('json')
    const [parsed, setParsed] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<any>(null)

    const parseInput = () => {
        try {
            if (format === 'json') {
                const data = JSON.parse(input)
                if (Array.isArray(data)) {
                    setParsed(data)
                } else {
                    setParsed([data])
                }
            } else {
                // Simple CSV parser
                // FIXME: Issue #25 (https://github.com/LDFLK/research/issues/25) - Fragile CSV Parsing (quotes/commas)
                const lines = input.split('\n').filter(l => l.trim())
                // Assuming header "title,url,year" or no header
                // We'll assume no header for simplicity or check first line
                const data = lines.map(line => {
                    const parts = line.split(',')
                    return {
                        title: parts[0]?.trim(),
                        url_pdf: parts[1]?.trim(),
                        year: parts[2]?.trim()
                    }
                })
                setParsed(data)
            }
        } catch (e) {
            alert("Failed to parse input")
        }
    }

    const handleSubmit = async () => {
        if (parsed.length === 0) return
        setIsLoading(true)
        setStatus(null)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            const res = await fetch(`${apiUrl}/acts/batch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsed)
            })
            const result = await res.json()
            setStatus(result)
            if (result.added > 0) {
                setInput("")
                setParsed([])
            }
        } catch (e) {
            alert("Batch upload failed")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Batch Import</CardTitle>
                <CardDescription>Paste JSON array of acts. Format: {`[{"title": "...", "url_pdf": "..."}]`} (PDF or Website URL)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder='[{"title": "Act Name", "url_pdf": "http://example.com/act.pdf"}]'
                    className="h-48 font-mono"
                />

                <div className="flex gap-2">
                    <Button variant="secondary" onClick={parseInput}>Parse Preview</Button>
                </div>

                {parsed.length > 0 && (
                    <div className="border rounded-md max-h-60 overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>URL (PDF/Web)</TableHead>
                                    <TableHead>Year</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parsed.map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{row.title || row.description}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">{row.url_pdf || row.url}</TableCell>
                                        <TableCell>{row.year}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {status && (
                    <div className="space-y-2">
                        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                            <AlertTitle>Upload Compelte</AlertTitle>
                            <AlertDescription>Added {status.added} acts.</AlertDescription>
                        </Alert>
                        {status.errors.length > 0 && (
                            <div className="p-4 bg-red-50 dark:bg-red-950 text-red-600 rounded text-xs font-mono">
                                <h4 className="font-bold">Errors:</h4>
                                {status.errors.map((e: any, i: number) => (
                                    <div key={i}>{e.title}: {e.error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <Button onClick={handleSubmit} disabled={isLoading || parsed.length === 0} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit Batch
                </Button>
            </CardContent>
        </Card>
    )
}
