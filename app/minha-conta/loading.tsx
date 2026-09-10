export default function Loading() {
  return (
    <div data-carregando className="min-h-screen bg-[var(--background)] pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-[var(--surface-hover)] rounded-xl p-6 space-y-4">
              <div className="w-20 h-20 bg-[var(--surface-hover)] rounded-full mx-auto" />
              <div className="h-6 bg-[var(--surface-hover)] rounded w-3/4 mx-auto" />
              <div className="h-4 bg-[var(--surface-hover)] rounded w-1/2 mx-auto" />
            </div>
            <div className="bg-[var(--surface-hover)] rounded-xl p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-[var(--surface-hover)] rounded-lg" />
              ))}
            </div>
          </div>

          {/* Content area */}
          <div className="lg:col-span-3 space-y-6">
            <div className="h-8 bg-[var(--surface-hover)] rounded w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-[var(--surface-hover)] rounded-xl p-5 space-y-3">
                  <div className="h-5 bg-[var(--surface-hover)] rounded w-1/2" />
                  <div className="h-8 bg-[var(--surface-hover)] rounded w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
