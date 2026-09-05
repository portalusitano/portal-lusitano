export default function Loading() {
  return (
    <div data-carregando className="min-h-screen bg-[var(--background)] pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Image gallery */}
          <div className="lg:col-span-3 space-y-4">
            <div className="h-[400px] bg-[var(--surface-hover)] rounded-xl" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 w-20 bg-[var(--surface-hover)] rounded-lg" />
              ))}
            </div>
          </div>

          {/* Purchase sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 bg-[var(--surface-hover)] rounded w-3/4" />
            <div className="h-10 bg-[var(--surface-hover)] rounded w-1/2" />
            <div className="space-y-3 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-[var(--surface-hover)] rounded w-full" />
              ))}
            </div>
            <div className="h-14 bg-[var(--elevate-1)] rounded-xl w-full mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
