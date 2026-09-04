export default function Loading() {
  return (
    <div
      data-carregando
      className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center"
    >
      {/* Logo Animation */}
      <div className="relative opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
        {/* Outer Ring */}
        <div className="w-16 h-16 border border-[var(--border-soft)] rounded-full animate-[spin-slow_3s_linear_infinite]" />

        {/* Inner Ring */}
        <div className="absolute inset-2 border border-[var(--foreground-strong)] rounded-full animate-[spin-slow-reverse_2s_linear_infinite]" />

        {/* Center Dot */}
        <div className="absolute inset-0 flex items-center justify-center animate-[pulse-scale_1.5s_ease-in-out_infinite]">
          <div className="w-2 h-2 bg-[var(--foreground-muted)] rounded-full" />
        </div>
      </div>

      {/* Text */}
      <p className="mt-8 rotulo animate-[pulse-opacity_2s_ease-in-out_infinite]">A carregar...</p>
    </div>
  );
}
