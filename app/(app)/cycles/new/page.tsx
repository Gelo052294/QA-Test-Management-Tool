import Link from "next/link";
import CycleForm from "@/components/CycleForm";

export default function NewCyclePage() {
  return (
    <div>
      <div className="mb-5">
        <Link href="/cycles" className="text-sm text-muted hover:underline">
          ← Back to cycles
        </Link>
        <h1 className="mt-1 text-xl font-bold">New Test Cycle</h1>
      </div>
      <div className="card max-w-2xl">
        <CycleForm />
      </div>
    </div>
  );
}
