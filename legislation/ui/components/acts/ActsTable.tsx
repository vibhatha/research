"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, FileText, Sparkles } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Act } from "@/lib/types"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"

export const columns: ColumnDef<Act>[] = [
    {
        accessorKey: "date_str",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => <div className="lowercase">{row.getValue("date_str")}</div>,
    },
    {
        accessorKey: "doc_number",
        header: "Act No.",
        cell: ({ row }) => <div className="font-medium">{row.getValue("doc_number")}</div>,
    },
    {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
            <div className="max-w-[500px] truncate" title={row.getValue("description")}>
                {row.getValue("description")}
            </div>

        ),
    },
    {
        accessorKey: "domain",
        header: "Domain",
        cell: ({ row }) => (
            <Badge variant="secondary" className="whitespace-nowrap">{row.getValue("domain")}</Badge>
        ),
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: "lang",
        header: "Lang",
        cell: ({ row }) => (
            <Badge variant="outline">{row.getValue("lang")}</Badge>
        ),
    },
    {
        id: "actions",
        header: "Link",
        cell: ({ row }) => {
            const act = row.original

            return (
                <div className="flex gap-2">
                    <a href={act.url_pdf} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            PDF
                        </Button>
                    </a>
                    <Link href={`/acts/analyze/${act.doc_id}`}>
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Analyze
                        </Button>
                    </Link>
                </div>
            )
        },
    },
]

const domains = [
    { label: "Finance & Economy", value: "Finance & Economy" },
    { label: "Legal & Judicial", value: "Legal & Judicial" },
    { label: "Education", value: "Education" },
    { label: "Research & Technology", value: "Research & Technology" },
    { label: "Health & Safety", value: "Health & Safety" },
    { label: "Religion & Culture", value: "Religion & Culture" },
    { label: "Agriculture & Environment", value: "Agriculture & Environment" },
    { label: "Infrastructure & Transport", value: "Infrastructure & Transport" },
    { label: "Social & Welfare", value: "Social & Welfare" },
    { label: "Security & Defense", value: "Security & Defense" },
    { label: "Administration", value: "Administration" },
    { label: "Other", value: "Other" },
]

export function ActsTable({ data }: { data: Act[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    return (
        <div className="w-full">
            <div className="flex items-center py-4 gap-2">
                <Input
                    placeholder="Filter acts..."
                    value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("description")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
                {table.getColumn("domain") && (
                    <DataTableFacetedFilter
                        column={table.getColumn("domain")}
                        title="Domain"
                        options={domains}
                    />
                )}
                <div className="ml-auto text-sm text-muted-foreground">
                    Total: {table.getFilteredRowModel().rows.length} Acts
                </div>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount()}
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}
