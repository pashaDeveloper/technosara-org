export default function Rows({ count = 3 }) {
  return (
    <div aria-hidden="true" className="grid w-full gap-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 motion-safe:animate-pulse">
          <div className="h-9 w-9 shrink-0 rounded bg-gray-100" />
          <div className="grid flex-1 gap-2">
            <div className="h-3 w-1/3 rounded bg-gray-200" />
            <div className="h-2 w-2/3 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
