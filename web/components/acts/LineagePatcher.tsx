"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Download, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Act } from "@/lib/types"

interface Relation {
    child_act: string;
    relationship: string;
    notes: string;
}

export function LineagePatcher({ baseTitle }: { baseTitle: string }) {
    const [parent, setParent] = React.useState(baseTitle)
    const [relations, setRelations] = React.useState<Relation[]>([])

    // New Relation State
    const [open, setOpen] = React.useState(false) // For combobox
    const [selectedChild, setSelectedChild] = React.useState("")
    const [selectedRelationship, setSelectedRelationship] = React.useState("amended_by")
    const [currentNotes, setCurrentNotes] = React.useState("")

    const [allActs, setAllActs] = React.useState<Act[]>([])

    React.useEffect(() => {
        setParent(baseTitle)
    }, [baseTitle])

    React.useEffect(() => {
        // Load all acts for the search dropdown
        fetch("/data/acts.json")
            .then(res => res.json())
            .then(data => setAllActs(data))
    }, [])

    const handleAddRelation = () => {
        if (!selectedChild) return;

        setRelations([...relations, {
            child_act: selectedChild,
            relationship: selectedRelationship,
            notes: currentNotes
        }])

        // Reset inputs
        setSelectedChild("")
        setCurrentNotes("")
        setOpen(false)
    }

    const handleRemoveRelation = (index: number) => {
        const newRelations = [...relations]
        newRelations.splice(index, 1)
        setRelations(newRelations)
    }

    const handleDownload = () => {
        const patch = {
            parent_act: parent,
            changes: relations,
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
        downloadAnchorNode.setAttribute("download", `lineage_patch_${parent.replace(/\s+/g, "_")}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="ml-auto">Suggest Change</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Suggest Lineage Revision</DialogTitle>
                    <DialogDescription>
                        Add amendments or related acts to this family. You can add multiple relations.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="parent">Parent Act</Label>
                        <Input id="parent" value={parent} onChange={(e) => setParent(e.target.value)} />
                    </div>

                    <div className="rounded-md border p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
                        <h4 className="text-sm font-medium">Add New Relation</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label>Target Act (Search)</Label>
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={open}
                                            className="justify-between"
                                        >
                                            {selectedChild
                                                ? (allActs.find((act) => act.description === selectedChild)?.description || selectedChild).slice(0, 25) + "..."
                                                : "Select act..."}
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
                                                            onSelect={(currentValue) => {
                                                                setSelectedChild(currentValue === selectedChild ? "" : currentValue)
                                                                setOpen(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedChild === act.description ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span>{act.description}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    Year: {act.date_str ? act.date_str.substring(0, 4) : 'N/A'}
                                                                </span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Relationship</Label>
                                <Select value={selectedRelationship} onValueChange={setSelectedRelationship}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Relationship" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="amended_by">Amended By</SelectItem>
                                        <SelectItem value="repealed_by">Repealed By</SelectItem>
                                        <SelectItem value="related_to">Related To</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Notes</Label>
                            <Textarea
                                value={currentNotes}
                                onChange={(e) => setCurrentNotes(e.target.value)}
                                placeholder="Briefly explain the connection..."
                                className="h-20"
                            />
                        </div>

                        <Button onClick={handleAddRelation} disabled={!selectedChild} className="w-full">
                            <Plus className="mr-2 h-4 w-4" /> Add to List
                        </Button>
                    </div>

                    {relations.length > 0 && (
                        <div className="border rounded-md">
                            <div className="p-2 bg-muted text-xs font-semibold">Changes to Submit ({relations.length})</div>
                            <ul className="divide-y max-h-[150px] overflow-y-auto">
                                {relations.map((rel, idx) => (
                                    <li key={idx} className="p-2 flex items-center justify-between text-sm">
                                        <div>
                                            <span className="font-medium text-orange-600 dark:text-orange-400">[{rel.relationship}]</span>
                                            <span className="ml-2">{rel.child_act}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveRelation(idx)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={handleDownload} disabled={relations.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Patch
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
