"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Activity, DollarSign, Clock, FileText, Zap, Server, ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface TelemetryLog {
    id: number
    doc_id: string
    timestamp: string
    model: string
    input_tokens: number
    output_tokens: number
    latency_ms: number
    status: string
    cost_usd: number
}

interface AnalyticsData {
    total_requests: number
    total_input_tokens: number
    total_output_tokens: number
    avg_latency_ms: number
    total_cost_est: number
    logs: TelemetryLog[]
}

export default function AnalyticsPage() {
    const [data, setData] = React.useState<AnalyticsData | null>(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                const res = await fetch(`${apiUrl}/analytics`)
                if (res.ok) {
                    const json = await res.json()
                    setData(json)
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()

        // Poll every 10s
        const interval = setInterval(fetchData, 10000)
        return () => clearInterval(interval)
    }, [])

    if (loading && !data) {
        return <div className="p-8 text-center text-muted-foreground">Loading Analytics...</div>
    }

    if (!data) {
        return <div className="p-8 text-center text-red-500">Failed to load analytics data. Ensure Backend is running.</div>
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/acts">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">System Telemetry</h1>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Server className="h-4 w-4" />
                    <span>Backend Status: Online</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.total_requests}</div>
                        <p className="text-xs text-muted-foreground">All time interactions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Est. Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.total_cost_est.toFixed(4)}</div>
                        <p className="text-xs text-muted-foreground">Based on Gemini 2.0 Flash pricing</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(data.total_input_tokens + data.total_output_tokens).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            In: {data.total_input_tokens.toLocaleString()} | Out: {data.total_output_tokens.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(data.avg_latency_ms)}ms</div>
                        <p className="text-xs text-muted-foreground">Per request average</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Parameters</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead>Tokens</TableHead>
                                <TableHead>Latency</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            {log.doc_id}
                                        </div>
                                    </TableCell>
                                    <TableCell>{log.model}</TableCell>
                                    <TableCell>
                                        <div className="text-xs">
                                            <div>In: {log.input_tokens}</div>
                                            <div>Out: {log.output_tokens}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{log.latency_ms}ms</TableCell>
                                    <TableCell>
                                        <Badge variant={log.status === "SUCCESS" ? "outline" : "destructive"}>
                                            {log.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
