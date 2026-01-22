import { ActsTable } from "@/components/acts/ActsTable"
import { Dashboard } from "@/components/acts/Dashboard"
import { Act } from "@/lib/types"
import actsData from "../../public/data/acts.json"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Activity, Layers } from "lucide-react"
import { ActsHeader } from "@/components/acts/ActsHeader"

// In Docker, we talk to backend service directly
async function getActs() {
    const apiUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000';
    try {
        const res = await fetch(`${apiUrl}/acts`, { cache: 'no-store' });
        if (!res.ok) {
            // Fallback for local development without docker network
            throw new Error(`Failed to fetch from ${apiUrl}`);
        }
        return res.json();
    } catch (e) {
        // Fallback to localhost if running outside docker or different setup
        const res = await fetch('http://localhost:8000/acts', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch acts');
        return res.json();
    }
}

export default async function ActsPage() {
    const data: Act[] = await getActs();

    return (
        <div className="hidden flex-col md:flex">
            <div className="border-b">
                <ActsHeader />
            </div>
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                </div>

                <Dashboard data={data} />

                <div className="flex items-center justify-between space-y-2 mt-8">
                    <h2 className="text-3xl font-bold tracking-tight">All Acts</h2>
                </div>
                <ActsTable data={data} />
            </div>
        </div>
    )
}
