export default function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-canvas text-muted font-body text-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        <span>Loading...</span>
      </div>
    </div>
  );
}
