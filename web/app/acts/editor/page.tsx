"use client"

import * as React from "react"
import { ActFamily, ActVersion, Act } from "@/lib/types"
import { LineageGraph } from "@/components/acts/LineageGraph"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Download, Plus, Trash2, ArrowLeft, Info, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function LineageEditorPage() {
    // Data State
    const [families, setFamilies] = React.useState<ActFamily[]>([])
    const [allActs, setAllActs] = React.useState<Act[]>([])

    // Selection State
    const [selectedFamily, setSelectedFamily] = React.useState<ActFamily | null>(null)
    const [openFamily, setOpenFamily] = React.useState(false) // family selector
    const [familySearch, setFamilySearch] = React.useState("")

    // Edit State
    const [pendingChanges, setPendingChanges] = React.useState<any[]>([])

    // New Relation Input State
    const [openAct, setOpenAct] = React.useState(false) // child act selector
    const [selectedChild, setSelectedChild] = React.useState("")
    const [selectedRelation, setSelectedRelation] = React.useState("amended_by")
    const [notes, setNotes] = React.useState("")

    // Load Data
    React.useEffect(() => {
        const p1 = fetch("/data/lineage.json").then(res => res.json())
        const p2 = fetch("/data/acts.json").then(res => res.json())

        Promise.all([p1, p2]).then(([fams, acts]) => {
            setFamilies(fams)
            setAllActs(acts)
        })
    }, [])

    // Preview Logic: Merge original family with pending changes
    const previewFamily = React.useMemo(() => {
        if (!selectedFamily) return null;

        // Clone deeply
        const clone: ActFamily = JSON.parse(JSON.stringify(selectedFamily))

        // Apply changes
        pendingChanges.forEach(change => {
            const childAct = allActs.find(a => a.doc_id === change.child_id)
            if (childAct) {
                const newVersion: ActVersion = {
                    doc_id: childAct.doc_id,
                    title: childAct.description,
                    date: childAct.date_str,
                    year: parseInt(childAct.date_str.substring(0, 4)) || 0,
                    doc_number: childAct.doc_number,
                    is_amendment: true, // Assuming additions are amendments for now
                    url_pdf: childAct.url_pdf
                }
                clone.versions.push(newVersion)
            }
        })

        // Re-sort
        clone.versions.sort((a, b) => a.year - b.year)

        return clone
    }, [selectedFamily, pendingChanges, allActs])


    const handleAdd = () => {
        if (!selectedChild) return;
        setPendingChanges([...pendingChanges, {
            child_id: selectedChild,
            relationship: selectedRelation,
            notes: notes
        }])
        setSelectedChild("")
        setNotes("")
        setOpenAct(false)
    }

    const handleRemoveChange = (idx: number) => {
        const n = [...pendingChanges]
        n.splice(idx, 1)
        setPendingChanges(n)
    }

    const handleDownload = () => {
        // Find parent ID - prefer exact match on title, or fallback to first version
        const parentVersion = selectedFamily?.versions.find(v => v.title === selectedFamily.base_title) || selectedFamily?.versions[0]

        const patch = {
            parent_id: parentVersion?.doc_id,
            parent_title: selectedFamily?.base_title, // Keep title for reference readability
            changes: pendingChanges,
            timestamp: (function () {
                const date = new Date();
                const offset = -date.getTimezoneOffset();
                const diff = offset >= 0 ? '+' : '-';
                const pad = (n: number) => (n < 10 ? '0' : '') + n;
                return date.getFullYear() +
                    '-' + pad(date.getMonth() + 1) +
                    '-' + pad(date.getDate()) +
                    'T' + pad(date.getHours()) +
                    ':' + pad(date.getMinutes()) +
                    ':' + pad(date.getSeconds()) +
                    diff + pad(Math.floor(Math.abs(offset) / 60)) + ':' + pad(Math.abs(offset) % 60);
            })(),
        }

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(patch, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `lineage_patch_${(selectedFamily?.base_title || "").replace(/\s+/g, "_")}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/acts">
                        <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <h1 className="text-3xl font-bold">Lineage Editor</h1>
                </div>
                <div className="flex items-center gap-2">
                    {selectedFamily && (
                        <Link href={`/acts/analyze/${selectedFamily.versions[0]?.doc_id}`}>
                            <Button variant="secondary" className="gap-2">
                                <Sparkles className="h-4 w-4" />
                                Analyze Base Act
                            </Button>
                        </Link>
                    )}
                    <Popover open={openFamily} onOpenChange={setOpenFamily}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-[300px] justify-between">
                                {selectedFamily ? selectedFamily.base_title : "Select Act Family to Edit..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder="Search family..." />
                                <CommandList>
                                    <CommandEmpty>No family found.</CommandEmpty>
                                    <CommandGroup>
                                        {families.map((f) => (
                                            <CommandItem
                                                key={f.base_title}
                                                value={f.base_title}
                                                onSelect={(val) => {
                                                    const fam = families.find(fam => fam.base_title.toLowerCase() === val.toLowerCase())
                                                    setSelectedFamily(fam || null)
                                                    setPendingChanges([]) // Reset details on switch
                                                    setOpenFamily(false)
                                                }}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedFamily?.base_title === f.base_title ? "opacity-100" : "opacity-0")} />
                                                {f.base_title}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Editor Panel */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Tools</CardTitle>
                        <CardDescription>Add amendments or relationships.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Save Location</AlertTitle>
                            <AlertDescription>
                                Save downloaded patches to
                                <span className="font-mono bg-muted px-1 ml-1 rounded">acts/research/patches/</span>
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label>Target Act</Label>
                            <Popover open={openAct} onOpenChange={setOpenAct}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between" disabled={!selectedFamily}>
                                        {selectedChild
                                            ? (allActs.find(a => a.doc_id === selectedChild)?.description.slice(0, 25) + "...")
                                            : "Search Act..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search acts..." />
                                        <CommandList>
                                            <CommandEmpty>No act found.</CommandEmpty>
                                            <CommandGroup>
                                                {allActs.map((act) => (
                                                    <CommandItem
                                                        key={act.doc_id}
                                                        value={act.description}
                                                        onSelect={(val) => {
                                                            setSelectedChild(act.doc_id)
                                                            setOpenAct(false)
                                                        }}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span>{act.description}</span>
                                                            <span className="text-xs text-muted-foreground">{act.date_str?.substring(0, 4)}</span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Relationship</Label>
                            <Select value={selectedRelation} onValueChange={setSelectedRelation} disabled={!selectedFamily}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="amended_by">Amended By</SelectItem>
                                    <SelectItem value="repealed_by">Repealed By</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={!selectedFamily} />
                        </div>

                        <Button className="w-full" onClick={handleAdd} disabled={!selectedChild || !selectedFamily}>
                            <Plus className="mr-2 h-4 w-4" /> Add to Preview
                        </Button>

                        {pendingChanges.length > 0 && (
                            <div className="pt-4 border-t">
                                <h4 className="mb-2 font-medium">Pending Changes</h4>
                                <ul className="space-y-2">
                                    {pendingChanges.map((c, i) => (
                                        <li key={i} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                                            <div className="flex flex-col">
                                                <span className="font-bold">{c.relationship}</span>
                                                <span className="truncate w-[180px]">
                                                    {allActs.find(a => a.doc_id === c.child_id)?.description || c.child_id}
                                                </span>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveChange(i)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                                <Button className="w-full mt-4" variant="secondary" onClick={handleDownload}>
                                    <Download className="mr-2 h-4 w-4" /> Download Patch JSON
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Preview Panel */}
                <div className="lg:col-span-2">
                    {previewFamily ? (
                        <LineageGraph family={previewFamily}>
                            <Badge key="preview-badge">Preview Mode</Badge>
                        </LineageGraph>
                    ) : (
                        <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
                            Select a Family to start editing
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
