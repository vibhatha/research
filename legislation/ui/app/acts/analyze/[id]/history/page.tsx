"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Eye, RotateCcw } from "lucide-react"
import Link from "next/link"

export default function HistoryPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [history, setHistory] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchHistory = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                const res = await fetch(`${apiUrl}/acts/${id}/history`)
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
        fetchHistory()
    }, [id])

    const handleRestore = (historyId: number) => {
        router.push(`/acts/analyze/${id}?history_id=${historyId}`)
    }

    return (
        <div className="container mx-auto py-10 max-w-5xl">
            <div className="flex items-center gap-4 mb-6">
                <Link href={`/acts/analyze/${id}`}>
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Analysis History</h1>
                    <p className="text-muted-foreground text-sm">Review and restore past analysis sessions for {id}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Timeline</CardTitle>
                    <CardDescription>All recorded analysis events.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-10 text-muted-foreground">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">No history found.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Timestamp</TableHead>
                                    <TableHead className="w-[120px]">Type</TableHead>
                                    <TableHead>Prompt / Summary</TableHead>
                                    <TableHead className="w-[150px]">Model</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3 w-3" />
                                                {new Date(item.timestamp).toLocaleString()}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={item.prompt === "Base Analysis" ? "default" : "secondary"}>
                                                {item.prompt === "Base Analysis" ? "Base" : "Custom"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-[400px] truncate text-sm font-medium" title={item.prompt}>
                                                {item.prompt}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 truncate max-w-[400px]">
                                                {item.response.slice(0, 50)}...
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">{item.model}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => handleRestore(item.id)}
                                            >
                                                <RotateCcw className="h-3 w-3" />
                                                Load
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
