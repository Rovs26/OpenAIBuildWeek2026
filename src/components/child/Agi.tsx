type AgiPose =
  | "idle"
  | "wave"
  | "listening"
  | "encouraging"
  | "thinking"
  | "celebrating"
  | "reading";

export default function Agi({
  pose = "idle",
  size = 120,
  className = "",
  alt = "Agi, ang kaibigang kasama sa pagbasa",
}: {
  pose?: AgiPose;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const wingsUp = pose === "encouraging" || pose === "celebrating";
  const waving = pose === "wave";
  const listening = pose === "listening";
  const thinking = pose === "thinking";

  return (
    <div
      className={`agi-breathe relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={alt}
    >
      <div className="pointer-events-none absolute inset-x-0 -top-[6%] flex h-[26%] items-end justify-center gap-[2%]">
        <span className="h-[70%] w-[11%] -rotate-[22deg] rounded-[50%_50%_45%_45%] bg-[#F2DDB0]" />
        <span className="h-[95%] w-[12%] rounded-[50%_50%_45%_45%] bg-[#F2DDB0]" />
        <span className="h-[70%] w-[11%] rotate-[22deg] rounded-[50%_50%_45%_45%] bg-[#F2DDB0]" />
      </div>

      <div className="absolute left-[8%] top-[16%] h-[80%] w-[84%] rounded-full border-[3px] border-[#E7C88C] bg-[#F2DDB0] shadow-[inset_0_-8px_18px_rgba(231,200,140,.5)]" />
      <div className="absolute left-[27%] top-[50%] h-[42%] w-[46%] rounded-full bg-[#FFC94D]" />

      <span
        className={`absolute h-[36%] w-[20%] bg-[#EBCE95] ${
          wingsUp
            ? "left-0 top-[20%] rotate-[48deg] rounded-[60%_50%_40%_50%]"
            : "left-[2%] top-[44%] rotate-[18deg] rounded-[60%_40%_50%_50%]"
        }`}
      />
      <span
        className={`absolute w-[20%] bg-[#EBCE95] ${
          wingsUp
            ? "right-0 top-[20%] h-[38%] -rotate-[48deg] rounded-[50%_60%_50%_40%]"
            : waving
              ? "right-0 top-[20%] h-[38%] -rotate-[58deg] rounded-[50%_60%_40%_50%]"
              : listening
                ? "right-[4%] top-[28%] h-[34%] -rotate-[42deg] rounded-[50%_60%_40%_50%]"
                : "right-[2%] top-[44%] h-[36%] -rotate-[18deg] rounded-[40%_60%_50%_50%]"
        }`}
      />

      {thinking ? (
        <span className="absolute -right-[2%] top-[5%] font-display text-[length:22%] font-bold text-[#126E82]">?</span>
      ) : null}

      <div className="absolute left-[28%] top-[34%] h-[19%] w-[19%] rounded-full bg-white shadow-[inset_0_0_0_2px_#E7C88C]">
        <span className="absolute left-[26%] top-[24%] h-[52%] w-[52%] rounded-full bg-[#0F5E6E]" />
        <span className="absolute left-[34%] top-[30%] h-[20%] w-[20%] rounded-full bg-white" />
      </div>
      <div className="absolute right-[28%] top-[34%] h-[19%] w-[19%] rounded-full bg-white shadow-[inset_0_0_0_2px_#E7C88C]">
        <span className="absolute left-[22%] top-[24%] h-[52%] w-[52%] rounded-full bg-[#0F5E6E]" />
        <span className="absolute left-[30%] top-[30%] h-[20%] w-[20%] rounded-full bg-white" />
      </div>

      <div className="absolute left-1/2 top-[53%] h-[11%] w-[13%] -translate-x-1/2 bg-[#FB8500] [clip-path:polygon(50%_100%,0_0,100%_0)]" />
      <span className="absolute bottom-[-2%] left-[34%] h-[8%] w-[12%] rounded-[40%_40%_50%_50%] bg-[#FB8500]" />
      <span className="absolute bottom-[-2%] right-[34%] h-[8%] w-[12%] rounded-[40%_40%_50%_50%] bg-[#FB8500]" />
    </div>
  );
}
