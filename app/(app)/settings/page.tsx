import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import ApiTokenManager from "@/components/ApiTokenManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, email: true, role: true, apiToken: true },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-5 text-xl font-bold">Settings</h1>

      <div className="card mb-6">
        <h2 className="mb-3 font-semibold">Profile</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Name</dt>
            <dd>{user?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Role</dt>
            <dd>{user?.role}</dd>
          </div>
        </dl>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">API token</h2>
        <ApiTokenManager hasToken={Boolean(user?.apiToken)} />
      </div>
    </div>
  );
}
