import Link from 'next/link';

/** โลโก้ตัวอักษร (ขาว-ดำ ตามธีม) */
export function Logo({ href = '/', className = '' }: { href?: string; className?: string }) {
  return (
    <Link href={href} aria-label="Learn5G หน้าแรก" className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-foreground text-[13px] font-semibold tracking-tight text-background">5G</span>
      <span className="font-display text-[17px] font-medium tracking-tight">Learn5G</span>
    </Link>
  );
}
