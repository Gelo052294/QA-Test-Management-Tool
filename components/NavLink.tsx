"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-brand/10 px-3 py-2 text-sm font-medium text-brand"
          : "rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
      }
    >
      {label}
    </Link>
  );
}
