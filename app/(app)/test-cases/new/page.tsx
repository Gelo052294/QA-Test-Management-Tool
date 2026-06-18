import Link from "next/link";
import TestCaseForm from "@/components/TestCaseForm";

export default function NewTestCasePage() {
  return (
    <div>
      <div className="mb-5">
        <Link href="/test-cases" className="text-sm text-gray-500 hover:underline">
          ← Back to test cases
        </Link>
        <h1 className="mt-1 text-xl font-bold">New Test Case</h1>
      </div>
      <div className="card">
        <TestCaseForm />
      </div>
    </div>
  );
}
