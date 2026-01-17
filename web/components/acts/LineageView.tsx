"use client"

import * as React from "react"
import { Check, ChevronsUpDown, GitCommit, FileText, ArrowDown, Sparkles } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ActFamily, ActVersion } from "@/lib/types"

import { LineagePatcher } from "./LineagePatcher"
import { LineageGraph } from "./LineageGraph"

export function LineageView() {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState("")
    const [families, setFamilies] = React.useState<ActFamily[]>([])
    const [selectedFamily, setSelectedFamily] = React.useState<ActFamily | null>(null)

    React.useEffect(() => {
        fetch("/data/lineage.json")
            .then((res) => res.json())
            .then((data) => {
                setFamilies(data)
                // Default to first interesting family for demo
                const interesting = data.find((f: ActFamily) => f.versions.length > 2)
                if (interesting) {
                    setValue(interesting.base_title)
                    setSelectedFamily(interesting)
                }
            })
    }, [])

    const handleSelect = (currentValue: string) => {
        setValue(currentValue === value ? "" : currentValue)
        const family = families.find((f) => f.base_title.toLowerCase() === currentValue.toLowerCase())
        setSelectedFamily(family || null)
        setOpen(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Search Act Family
                </label>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                        >
                            {value
                                ? families.find((f) => f.base_title.toLowerCase() === value.toLowerCase())?.base_title
                                : "Select act..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                        <Command>
                            <CommandInput placeholder="Search act..." />
                            <CommandList>
                                <CommandEmpty>No act found.</CommandEmpty>
                                <CommandGroup>
                                    {families.map((family) => (
                                        <CommandItem
                                            key={family.base_title}
                                            value={family.base_title}
                                            onSelect={handleSelect}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value.toLowerCase() === family.base_title.toLowerCase() ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {family.base_title}
                                            <span className="ml-auto text-xs text-muted-foreground">{family.versions.length} versions</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {selectedFamily && (
                <div className="space-y-4">
                    <div className="flex items-center justify-end">
                        <Link href={`/acts/analyze/${selectedFamily.versions[0]?.doc_id}`}>
                            <Button variant="secondary" className="gap-2">
                                <Sparkles className="h-4 w-4" />
                                Analyze Base Act
                            </Button>
                        </Link>
                    </div>
                    <LineageGraph family={selectedFamily}>
                        <LineagePatcher baseTitle={selectedFamily.versions[0]?.title || selectedFamily.base_title} />
                    </LineageGraph>
                </div>
            )}
        </div>
    )
}
