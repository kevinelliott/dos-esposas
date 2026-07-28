type PixelMarkProps = {
  compact?: boolean;
};

export function PixelMark({ compact = false }: PixelMarkProps) {
  return (
    <span className={`pixel-mark ${compact ? "pixel-mark--compact" : ""}`}>
      <span className="pixel-mark__shell" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </span>
      {!compact && <span className="pixel-mark__label">Dos Esposas</span>}
    </span>
  );
}
