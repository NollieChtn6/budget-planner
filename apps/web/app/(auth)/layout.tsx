export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-3">
            {/* biome-ignore lint/performance/noImgElement: static brand mark, self-adapts to the theme via its own embedded media query */}
            <img src="/icon.svg" alt="" className="h-10 w-10" />
            <span className="font-heading text-5xl leading-none tracking-tight">Pécule</span>
          </div>
          <p className="font-heading text-lg text-muted-foreground italic">
            Mettre de côté, mois après mois.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
