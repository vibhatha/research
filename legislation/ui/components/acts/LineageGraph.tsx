"use client"

import * as React from "react"
import { FileText, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ActFamily } from "@/lib/types"

interface LineageGraphProps {
    family: ActFamily
    className?: string
    children?: React.ReactNode // Slot for header actions (e.g. Editor Button)
}

export function LineageGraph({ family, className, children }: LineageGraphProps) {
    if (!family) return null;

    return (
        <Card className={cn("w-full", className)}>
            <CardHeader>
                <CardTitle className="text-2xl flex items-center justify-between">
                    {family.base_title}
                    {children}
                </CardTitle>
                <CardDescription>
                    Domain: <Badge variant="outline">{family.domain}</Badge>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative border-l-2 border-muted ml-4 space-y-8 pb-4">
                    {family.versions.map((version, index) => (
                        <div key={version.doc_id || index} className="relative flex items-start pl-6">
                            {/* Timeline Node */}
                            <div className={cn(
                                "absolute -left-2.5 mt-1.5 h-5 w-5 rounded-full border-2 bg-background flex items-center justify-center",
                                version.is_amendment ? "border-orange-500" : "border-primary"
                            )}>
                                {version.is_amendment ? (
                                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                                ) : (
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                )}
                            </div>

                            <div className="flex flex-col space-y-1 w-full">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-muted-foreground">{version.year}</span>
                                    {index < family.versions.length - 1 && (
                                        <ArrowDown className="h-4 w-4 text-muted-foreground opacity-20 mr-4" />
                                    )}
                                </div>
                                <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold leading-none tracking-tight">
                                            {version.doc_number ? `Act No. ${version.doc_number}` : 'Act'}
                                        </h4>
                                        <Badge variant={version.is_amendment ? "secondary" : "default"}>
                                            {version.is_amendment ? "Amendment" : "Base Act"}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {version.title}
                                    </p>
                                    {version.url_pdf ? (
                                        <a href={version.url_pdf} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                                <FileText className="mr-2 h-4 w-4" />
                                                View PDF
                                            </Button>
                                        </a>
                                    ) : (
                                        <div className="text-xs text-muted-foreground italic">PDF not linked</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
