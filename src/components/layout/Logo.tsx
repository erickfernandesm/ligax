import { cn } from '@/components/ui/cn';

/**
 * Logo oficial (assets/logo.png). O logo tem tipografia escura, então em
 * superfícies escuras ele vai dentro de uma "etiqueta" clara.
 */
export function Logo({ height = 36, onDark, className }: { height?: number; onDark?: boolean; className?: string }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/assets/logo.png"
      alt="Liga X"
      width={Math.round((height * 300) / 110)}
      height={height}
      className="block"
      style={{ height, width: 'auto' }}
    />
  );
  if (!onDark) return <span className={cn('inline-block', className)}>{img}</span>;
  return <span className={cn('inline-block rounded-2xl bg-paper px-3 py-1.5', className)}>{img}</span>;
}
