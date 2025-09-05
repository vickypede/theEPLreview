export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
      <div className="animate-pulse">
        <div className="h-8 w-3/4 bg-gray-200 rounded mb-4" />
        <div className="h-4 w-1/2 bg-gray-200 rounded mb-6" />
        <div className="aspect-[16/9] bg-gray-200 rounded-2xl mb-6" />
        <div className="space-y-4">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}
