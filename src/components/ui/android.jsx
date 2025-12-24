// Modern Phone Mockup Component - Clean Google Pixel Style
export function Android({
  width = 320,
  height = 660,
  src,
  videoSrc,
  className = "",
  ...props
}) {
  return (
    <div
      className={`relative ${className}`}
      style={{ width, height }}
      {...props}
    >
      {/* Phone Frame */}
      <div className="absolute inset-0 bg-[#1a1a1a] rounded-[40px] shadow-2xl overflow-hidden">

        {/* Inner Bezel */}
        <div className="absolute inset-[4px] bg-[#0a0a0a] rounded-[36px] overflow-hidden">

          {/* Screen Area - Clean, no overlays */}
          <div className="absolute inset-[2px] rounded-[34px] overflow-hidden bg-gray-100">

            {/* Screen Content - Full screen, no camera overlay */}
            {src && (
              <img
                src={src}
                alt="App Screenshot"
                className="w-full h-full object-cover object-top"
              />
            )}
            {videoSrc && (
              <video
                className="w-full h-full object-cover object-top"
                src={videoSrc}
                autoPlay
                loop
                muted
                playsInline
              />
            )}
            {!src && !videoSrc && (
              <div className="w-full h-full bg-gradient-to-b from-[#0569ff] to-[#0041a8] flex items-center justify-center">
                <span className="text-white/30 text-sm">App Screenshot</span>
              </div>
            )}
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-black/20 rounded-full z-30" />
        </div>

        {/* Side Buttons */}
        <div className="absolute right-[-1px] top-28 w-[2px] h-12 bg-[#333] rounded-r-sm" />
        <div className="absolute left-[-1px] top-24 w-[2px] h-8 bg-[#333] rounded-l-sm" />
        <div className="absolute left-[-1px] top-36 w-[2px] h-8 bg-[#333] rounded-l-sm" />
      </div>
    </div>
  );
}
