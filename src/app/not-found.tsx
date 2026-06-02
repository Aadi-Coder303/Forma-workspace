import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex w-full h-screen bg-canvas font-body items-center justify-center text-primary">
      <div className="text-center">
        <h1 className="font-display font-bold text-6xl text-accent mb-4">404</h1>
        <h2 className="text-2xl font-display mb-6">Page Not Found</h2>
        <p className="text-muted mb-8 max-w-md mx-auto">
          The project or page you are looking for doesn't exist or has been moved.
        </p>
        <Link 
          href="/" 
          className="bg-hover hover:bg-hover text-primary border border-border rounded-lg px-6 py-3 font-medium transition-colors cursor-pointer"
        >
          Return to Projects Hub
        </Link>
      </div>
    </div>
  );
}
