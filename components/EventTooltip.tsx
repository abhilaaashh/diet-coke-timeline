"use client";

import { memo, useMemo } from "react";
import Image from "next/image";
import { TimelineEvent } from "@/types";
import { useIsMobile, useIsTouchDevice } from "@/hooks/useIsMobile";

interface EventTooltipProps {
  event: TimelineEvent;
  position: { x: number; y: number };
}

const TOOLTIP_WIDTH = 256; // w-64 = 16rem = 256px
const TOOLTIP_HEIGHT_APPROX = 280; // Approximate height of tooltip
const PADDING = 16;

const EventTooltip = memo(function EventTooltip({ event, position }: EventTooltipProps) {
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();

  // Calculate viewport-aware position
  const adjustedPosition = useMemo(() => {
    if (typeof window === "undefined") {
      return { x: position.x, y: position.y, showAbove: true };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;
    let showAbove = true;

    // On mobile, center horizontally
    if (isMobile) {
      adjustedX = viewportWidth / 2;
    } else {
      // Prevent horizontal overflow on desktop
      const halfWidth = TOOLTIP_WIDTH / 2;
      if (adjustedX - halfWidth < PADDING) {
        adjustedX = halfWidth + PADDING;
      } else if (adjustedX + halfWidth > viewportWidth - PADDING) {
        adjustedX = viewportWidth - halfWidth - PADDING;
      }
    }

    // Check if there's room above, otherwise show below
    if (position.y - TOOLTIP_HEIGHT_APPROX < PADDING) {
      showAbove = false;
      adjustedY = position.y + 20;
    }

    return { x: adjustedX, y: adjustedY, showAbove };
  }, [position.x, position.y, isMobile]);

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.showAbove ? adjustedPosition.y - 8 : adjustedPosition.y,
        transform: adjustedPosition.showAbove 
          ? "translate(-50%, -100%)" 
          : "translate(-50%, 0%)",
      }}
    >
      <div className={`bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden ${isMobile ? "w-72" : "w-64"}`}>
        {/* Header with image */}
        <div className={`${isMobile ? "h-36" : "h-32"} bg-gray-100 relative`}>
          {event.image ? (
            <Image
              src={event.image}
              alt={event.title}
              fill
              className="object-cover"
              sizes={isMobile ? "288px" : "256px"}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          )}
          <div className="absolute top-2 left-2 bg-[#F40009] text-white text-xs font-bold px-2 py-1 rounded shadow">
            {event.date}
          </div>
        </div>

        {/* Content */}
        <div className={`${isMobile ? "p-4" : "p-3"}`}>
          <h3 className={`font-bold text-gray-900 ${isMobile ? "text-base" : "text-sm"} mb-1 line-clamp-2`}>
            {event.title}
          </h3>
          <p className={`${isMobile ? "text-sm" : "text-xs"} text-gray-500 line-clamp-2 mb-3`}>
            {event.description}
          </p>
          
          {/* Indian participation */}
          <div className={`bg-gray-50 rounded-lg ${isMobile ? "p-3" : "p-2"}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <span className={isMobile ? "text-base" : "text-sm"}>🇮🇳</span>
                <span className={`${isMobile ? "text-sm" : "text-xs"} text-gray-500`}>Indian participation</span>
              </div>
              <span className={`${isMobile ? "text-base" : "text-sm"} font-bold text-[#F40009]`}>
                {event.indianParticipation}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F40009] rounded-full transition-all duration-300"
                style={{ width: `${event.indianParticipation}%` }}
              />
            </div>
          </div>
        </div>

        {/* Click/Tap hint */}
        <div className={`bg-gray-50 px-3 ${isMobile ? "py-3" : "py-2"} text-center border-t border-gray-100`}>
          <p className={`${isMobile ? "text-sm" : "text-xs"} text-gray-400`}>
            {isTouch ? "Tap again to view details" : "Click to view details"}
          </p>
        </div>
      </div>

      {/* Arrow - only show when tooltip is above */}
      {adjustedPosition.showAbove && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45" />
      )}
      {/* Arrow for below positioning */}
      {!adjustedPosition.showAbove && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45" />
      )}
    </div>
  );
});

export default EventTooltip;
