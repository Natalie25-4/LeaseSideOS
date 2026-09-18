export function UserMessage({ message }: { message: string }) {
  return (
    <div className="flex justify-end mb-3">
      <div className="max-w-[85%] bg-gray-50 text-charcoal rounded-lg px-4 py-3 text-sm">
        {message}
      </div>
    </div>
  );
}