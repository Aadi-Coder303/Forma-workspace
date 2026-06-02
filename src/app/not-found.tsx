import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex w-full h-screen bg-ink font-body items-center justify-center text-mist">
      <div className="text-center">
        <h1 className="font-display font-bold text-6xl text-ember mb-4">404</h1>
        <h2 className="text-2xl font-display mb-6">Page Not Found</h2>
        <p className="text-slate mb-8 max-w-md mx-auto">
          The project or page you are looking for doesn't exist or has been moved.
        </p>
        <Link 
          href="/" 
          className="bg-[rgba(244,242,238,0.1)] hover:bg-[rgba(244,242,238,0.15)] text-mist border border-[rgba(244,242,238,0.1)] rounded-lg px-6 py-3 font-medium transition-colors cursor-pointer"
        >
          Return to Projects Hub
        </Link>
      </div>
    </div>
  );
}
