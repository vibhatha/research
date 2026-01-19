import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold">Lanka Data Foundation Research</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Exploration of legislative acts, deepseek OCR research, and more.
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link href="/acts">
            <Button size="lg" className="rounded-full">
              Explore Acts
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="rounded-full" disabled>
            DeepSeek OCR (Coming Soon)
          </Button>
        </div>
      </main>
    </div>
  );
}
