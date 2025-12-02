"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export function PageLogo() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center py-4 px-6">
      <Image
        src="/logo.png"
        alt="Logo"
        width={120}
        height={32}
        className="bg-black px-4 py-2 rounded-lg w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
        priority
        onClick={() => router.push("/")}
      />
    </div>
  );
}

