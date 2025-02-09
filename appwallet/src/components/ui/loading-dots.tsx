"use client";

export default function LoadingDots() {
  return (
    <div className="flex space-x-1">
      <span className="inline-block animate-bounce mx-1">.</span>
      <span className="inline-block animate-bounce mx-1 animation-delay-200">
        .
      </span>
      <span className="inline-block animate-bounce mx-1 animation-delay-400">
        .
      </span>
    </div>
  );
}
