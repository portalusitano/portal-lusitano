export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--background)] pt-24 sm:pt-32 pb-24 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto animate-pulse">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-16">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[var(--background-elevated)] rounded-full mx-auto mb-4 sm:mb-6" />
          <div className="h-10 sm:h-12 w-64 bg-[var(--background-elevated)] rounded mx-auto mb-2 sm:mb-4" />
          <div className="h-4 w-48 bg-[var(--background-elevated)] rounded mx-auto" />
          <div className="mt-4 sm:mt-6 flex items-center justify-center gap-6">
            <div className="h-4 w-28 bg-[var(--background-elevated)] rounded" />
            <div className="h-4 w-20 bg-[var(--background-elevated)] rounded" />
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 px-1">
          <div className="h-4 w-16 bg-[var(--background-elevated)] rounded" />
          <div className="flex gap-1 sm:gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 w-20 sm:w-24 bg-[var(--background-elevated)] rounded" />
            ))}
          </div>
        </div>

        {/* Horse cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--background-card)] border border-[var(--border)] overflow-hidden"
            >
              {/* Image */}
              <div className="aspect-[4/3] sm:aspect-[4/5] bg-[var(--background-elevated)]" />

              {/* Info */}
              <div className="p-4 sm:p-5">
                {/* Name */}
                <div className="h-6 w-40 bg-[var(--background-elevated)] rounded mb-2" />

                {/* Meta info */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                  <div className="h-3 w-16 bg-[var(--background-elevated)] rounded" />
                  <div className="h-3 w-20 bg-[var(--background-elevated)] rounded" />
                  <div className="h-3 w-14 bg-[var(--background-elevated)] rounded" />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <div className="flex-1 h-11 bg-[var(--background-elevated)] rounded" />
                  <div className="w-12 h-11 bg-[var(--background-elevated)] rounded" />
                  <div className="w-12 h-11 bg-[var(--background-elevated)] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
