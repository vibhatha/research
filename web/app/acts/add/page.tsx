import { ActsHeader } from "@/components/acts/ActsHeader"
import { AddActForm } from "@/components/acts/AddActForm"
import { BatchImport } from "@/components/acts/BatchImport"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AddActPage() {
    return (
        <div className="hidden flex-col md:flex">
            <div className="border-b">
                <ActsHeader />
            </div>
            <div className="flex-1 space-y-4 p-8 pt-6 flex flex-col w-full">
                <div className="flex items-center justify-between space-y-2 w-full">
                    <h2 className="text-3xl font-bold tracking-tight">Add New Acts</h2>
                </div>

                <Tabs defaultValue="single" className="space-y-4 w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                        <TabsTrigger value="single">Single Entry</TabsTrigger>
                        <TabsTrigger value="batch">Batch Import</TabsTrigger>
                    </TabsList>
                    <TabsContent value="single" className="w-full transition-all duration-500">
                        <AddActForm />
                    </TabsContent>
                    <TabsContent value="batch" className="max-w-2xl">
                        <BatchImport />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
