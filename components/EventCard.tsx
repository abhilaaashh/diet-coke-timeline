"use client";

import { useRef, useEffect, memo } from "react";
import Image from "next/image";
import { TimelineEvent } from "@/types";

interface EventCardProps {
  event: TimelineEvent;
  index: number;
  isHighlighted: boolean;
}

const EventCard = memo(function EventCard({ event, index, isHighlighted }: EventCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "auto", block: "center" });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={cardRef}
      id={`event-${event.id}`}
      className={`bg-white rounded-xl border overflow-hidden ${
        isHighlighted ? "highlight-card border-[#F40009]" : "border-gray-200"
      }`}
    >
      {/* Image section */}
      <div className="relative h-44 bg-gray-100">
        {event.image ? (
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
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

        {/* Date badge */}
        <div className="absolute top-3 left-3 bg-[#F40009] text-white text-xs font-bold px-2.5 py-1.5 rounded-lg">
          {event.date}
        </div>

        {/* Event number */}
        <div className="absolute top-3 right-3 bg-white text-gray-800 text-xs font-bold w-8 h-8 rounded-lg flex items-center justify-center">
          {String(index + 1).padStart(2, '0')}
        </div>
      </div>

      {/* Content section */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {event.title}
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          {event.description}
        </p>

        {/* Impact section */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <svg
              className="w-4 h-4 text-[#F40009]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span className="text-xs font-semibold text-gray-700 uppercase">Impact</span>
          </div>
          <p className="text-gray-600 text-sm">{event.impact}</p>
        </div>

        {/* Indian Participation stat */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇮🇳</span>
              <span className="text-sm font-medium text-gray-700">Indian Participation</span>
            </div>
            <span className="text-2xl font-bold text-[#F40009]">
              {event.indianParticipation}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F40009] rounded-full"
              style={{ width: `${event.indianParticipation}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Percentage of Indian social media users who engaged
          </p>
        </div>
      </div>
    </div>
  );
});

export default EventCard;
