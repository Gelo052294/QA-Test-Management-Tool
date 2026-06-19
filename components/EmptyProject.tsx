import Link from "next/link";

export default function EmptyProject({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="card text-center">
      <h2 className="mb-1 font-semibold">No project selected</h2>
      <p className="text-sm text-muted">
        Test cases and cycles live inside a project.{" "}
        {isAdmin ? (
          <>
            <Link href="/projects" className="text-brand hover:underline">
              Create a project
            </Link>{" "}
            to get started.
          </>
        ) : (
          "Ask an admin to create one, then pick it from the switcher above."
        )}
      </p>
    </div>
  );
}
