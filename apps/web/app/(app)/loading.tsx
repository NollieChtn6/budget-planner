export default function AppLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      {/* biome-ignore lint/performance/noImgElement: static brand mark, self-adapts to the theme via its own embedded media query */}
      <img src="/icon.svg" alt="" className="h-10 w-10 animate-pulse" />
    </div>
  );
}
