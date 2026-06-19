"use client";

import { Heart } from "lucide-react";

export default function FavouritesPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Favourites</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your starred projects.
        </p>
      </div>
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white/50 p-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <Heart className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">No favourites yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Star your important projects to find them quickly.
        </p>
      </div>
    </div>
  );
}
