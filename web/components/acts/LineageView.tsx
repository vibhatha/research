"use client"

import * as React from "react"
import { Check, ChevronsUpDown, GitCommit, FileText, ArrowDown } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import { LineagePatcher } from "./LineagePatcher"

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
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center justify-between">
                            {selectedFamily.base_title}
                            <LineagePatcher baseTitle={selectedFamily.versions[0]?.title || selectedFamily.base_title} />
                        </CardTitle>
                        <CardDescription>
                            Domain: <Badge variant="outline">{selectedFamily.domain}</Badge>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative border-l-2 border-muted ml-4 space-y-8 pb-4">
                            {selectedFamily.versions.map((version, index) => (
                                <div key={version.doc_id} className="relative flex items-start pl-6">
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
                                            {index < selectedFamily.versions.length - 1 && (
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
                                            <a href={version.url_pdf} target="_blank" rel="noopener noreferrer">
                                                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    View PDF
                                                </Button>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
