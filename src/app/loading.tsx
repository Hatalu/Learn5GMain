export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="กำลังโหลด">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
    </div>
  );
}
