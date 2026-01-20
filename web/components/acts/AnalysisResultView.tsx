"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sparkles } from "lucide-react"

interface AnalysisResultViewProps {
    analysisData: any;
}

export function AnalysisResultView({ analysisData }: AnalysisResultViewProps) {
    if (!analysisData) {
        return (
            <div className="text-center text-muted-foreground py-10">
                No analysis data available.
            </div>
        )
    }

    return (
        <div className="space-y-6">
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

            {/* Custom Analysis Result Block */}
            {analysisData.custom_analysis && (
                <>
                    <Separator />
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-600" />
                            Custom Analysis Result
                        </h3>

                        {/* Prompt Display */}
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
        </div>
    )
}
