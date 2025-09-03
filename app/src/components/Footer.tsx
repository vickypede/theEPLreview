import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="surface border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-sm text-muted flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <p>© {new Date().getFullYear()} The EPL Review</p>
          <p>Unofficial fan project. Not affiliated with the Premier League.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/admin" 
            className="text-primary hover:text-foreground font-medium hover:underline"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}


