"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Act } from "@/lib/types"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Treemap, Cell } from "recharts"
import { LineageView } from "@/components/acts/LineageView"
import Link from "next/link"
import { Settings2, Layers, Sparkles } from "lucide-react"

const COLORS = [
    "#8884d8", "#83a6ed", "#8dd1e1", "#82ca9d", "#a4de6c", "#d0ed57",
    "#ffc658", "#ff8042", "#ffbb28", "#ff7300", "#0088fe", "#00c49f", "#ff0000", "#00ff00"
];

// Custom Content for Treemap with better contrast and labels
const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, colors, rank, name } = props;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: (depth < 2 && root.children) ? colors[Math.floor((index / root.children.length) * 6)] : 'none',
                    stroke: '#fff',
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10),
                }}
            />
            {depth === 1 ? (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 7}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={10}
                >
                    {name}
                </text>
            ) : null}
        </g>
    );
};

export function Dashboard({ data }: { data: Act[] }) {
    const totalActs = data.length

    // Calculate acts per year
    const actsPerYear = data.reduce((acc, act) => {
        const year = act.year || "Unknown"
        acc[year] = (acc[year] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const chartData = Object.entries(actsPerYear)
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year.localeCompare(b.year))
        .filter(item => item.year.length === 4 && parseInt(item.year) > 1900)

    // Calculate acts per domain
    const actsPerDomain = data.reduce((acc, act) => {
        const domain = act.domain || "Other"
        acc[domain] = (acc[domain] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const domainData = Object.entries(actsPerDomain)
        .map(([name, size], index) => ({ name, size, fill: COLORS[index % COLORS.length] }))
        .sort((a, b) => b.size - a.size)

    return (
        <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
                <div>
                    {/* Placeholder for title if needed, but the page already has a title */}
                </div>
                <Link href="/acts/editor">
                    <Button variant="outline">
                        <Settings2 className="mr-2 h-4 w-4" />
                        Lineage Tools
                    </Button>
                </Link>
            </div>

            <Tabs defaultValue="year" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="year">By Year</TabsTrigger>
                    <TabsTrigger value="category">By Category</TabsTrigger>
                    <TabsTrigger value="lineage">Dependency Graph</TabsTrigger>
                </TabsList>
                <TabsContent value="year" className="space-y-4">
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Acts per Year</CardTitle>
                            <CardDescription>
                                Distribution of legislative acts over time.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <ResponsiveContainer width="100%" height={450}>
                                <BarChart data={chartData}>
                                    <XAxis
                                        dataKey="year"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ background: '#333', border: 'none', color: '#fff' }}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill="#adfa1d"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="category" className="space-y-4">
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Domain Clusters</CardTitle>
                            <CardDescription>
                                Categorization of acts by domain topic.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={450}>
                                <Treemap
                                    data={domainData}
                                    dataKey="size"
                                    aspectRatio={4 / 3}
                                    stroke="#fff"
                                    fill="#8884d8"
                                    content={<CustomizedContent colors={COLORS} />}
                                >
                                    <Tooltip content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-black text-white p-2 text-xs rounded">
                                                    <p>{`${payload[0].payload.name} : ${payload[0].value}`}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />
                                </Treemap>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="lineage" className="space-y-4">
                    <Card className="col-span-4 border-none shadow-none">
                        <CardHeader className="px-0">
                            <CardTitle>Act Dependency Tree</CardTitle>
                            <CardDescription>
                                Visualize the evolution and amendments of Acts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-0">
                            <LineageView />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
