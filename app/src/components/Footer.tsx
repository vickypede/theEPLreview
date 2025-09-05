import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="surface border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-sm text-muted-foreground grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-center gap-4 font-heading">
        <div className="flex justify-center sm:justify-start">
          <Image
            src="/assets/logo_header/pink_stacked.png"
            alt="theEPLreview mark"
            width={80}
            height={80}
            className="h-12 sm:h-14 w-auto"
            priority
          />
        </div>
        <div className="text-center sm:text-left">
          <p>© {new Date().getFullYear()} The EPL Review</p>
          <p className="text-xs sm:text-sm">Unofficial fan project. Not affiliated with the Premier League.</p>
        </div>
        <div className="flex justify-center sm:justify-end items-center gap-4">
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


