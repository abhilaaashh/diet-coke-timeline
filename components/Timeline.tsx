"use client";

import { useState, useMemo, useCallback, memo, useRef } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { ChartDataPoint, TimelineEvent } from "@/types";

interface IndiaTrendline {
  period: string;
  conversations: number;
}
import EventTooltip from "./EventTooltip";
import { useIsMobile, useIsTouchDevice } from "@/hooks/useIsMobile";

interface TimelineProps {
  chartData: ChartDataPoint[];
  events: TimelineEvent[];
  onEventClick: (eventId: string) => void;
  indiaTrendline?: IndiaTrendline[];
  isReachView?: boolean;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  isHovered: boolean;
  isMobile: boolean;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

const CustomEventDot = memo(function CustomEventDot({
  cx,
  cy,
  isHovered,
  isMobile,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onTouchStart,
}: CustomDotProps) {
  if (cx === undefined || cy === undefined) return null;

  // Larger hit area and dot size on mobile for better touch targets
  const hitAreaRadius = isMobile ? 28 : 20;
  const hoverRingRadius = isMobile ? 20 : 16;
  const dotRadius = isMobile ? (isHovered ? 11 : 9) : (isHovered ? 9 : 7);
  const innerDotRadius = isMobile ? 3 : 2;

  return (
    <g
      onMouseEnter={!isMobile ? onMouseEnter : undefined}
      onMouseLeave={!isMobile ? onMouseLeave : undefined}
      onClick={onClick}
      onTouchStart={onTouchStart}
      style={{ cursor: "pointer" }}
    >
      {/* Invisible larger hit area for easier hovering/tapping */}
      <circle cx={cx} cy={cy} r={hitAreaRadius} fill="transparent" />
      {isHovered && (
        <circle cx={cx} cy={cy} r={hoverRingRadius} fill="rgba(244, 0, 9, 0.15)" />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={dotRadius}
        fill="#F40009"
        stroke="#fff"
        strokeWidth={2}
      />
      <circle cx={cx} cy={cy} r={innerDotRadius} fill="#fff" />
    </g>
  );
});

const formatValue = (value: number, isReach: boolean) => {
  if (isReach && value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  return value.toLocaleString();
};

const CustomTooltipContent = memo(function CustomTooltipContent({
  active,
  payload,
  label,
  isReachView = false,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string; name: string }>;
  label?: string;
  isReachView?: boolean;
}) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-100">
      <p className="text-xs text-gray-400 uppercase mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          entry.value !== undefined && entry.value !== null && (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-gray-500">{entry.name}:</span>
              <span className="text-sm font-bold text-gray-900">
                {formatValue(entry.value, isReachView)}
              </span>
            </div>
          )
        ))}
      </div>
      {isReachView && (
        <p className="text-[10px] text-gray-400 mt-2 border-t border-gray-100 pt-1">Estimated reach</p>
      )}
    </div>
  );
});

export default function Timeline({ chartData, events, onEventClick, indiaTrendline, isReachView = false }: TimelineProps) {
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();

  // Merge global and India data
  const combinedChartData = useMemo(() => {
    if (!indiaTrendline) return chartData.map(d => ({ ...d, india: undefined }));
    
    const indiaMap = new Map<string, number>();
    indiaTrendline.forEach((d) => indiaMap.set(d.period, d.conversations));
    
    return chartData.map((d) => ({
      ...d,
      india: indiaMap.get(d.date),
    }));
  }, [chartData, indiaTrendline]);

  const dateToConversations = useMemo(() => {
    const map = new Map<string, number>();
    chartData.forEach((d) => map.set(d.date, d.conversations));
    return map;
  }, [chartData]);

  const firstChartDate = chartData.length > 0 ? chartData[0].date : "";

  const eventMarkers = useMemo(() => {
    return events.map((event) => {
      const hasMatchingDate = dateToConversations.has(event.date);
      const displayDate = hasMatchingDate ? event.date : firstChartDate;
      const conversations = dateToConversations.get(displayDate) || 0;
      
      return {
        ...event,
        date: displayDate,
        conversations,
      };
    });
  }, [events, dateToConversations, firstChartDate]);

  const handleMouseEnter = useCallback((eventId: string, e: React.MouseEvent) => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setHoveredEvent(eventId);
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Add a small delay before hiding to prevent flickering
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredEvent(null);
      setTooltipPosition(null);
    }, 150);
  }, []);

  // Handle touch events for mobile - tap directly navigates to event (no tooltip)
  const handleTouchStart = useCallback((eventId: string, e: React.TouchEvent) => {
    e.preventDefault();
    // On mobile, directly navigate to the event card
    onEventClick(eventId);
  }, [onEventClick]);

  // Close tooltip when tapping elsewhere on mobile
  const handleChartClick = useCallback(() => {
    if (isTouch && hoveredEvent) {
      setHoveredEvent(null);
      setTooltipPosition(null);
    }
  }, [isTouch, hoveredEvent]);

  const handleEventClick = useCallback((eventId: string) => {
    if (isTouch) {
      // On touch devices, clicks are handled via touch events
      return;
    }
    onEventClick(eventId);
  }, [onEventClick, isTouch]);

  const hoveredEventData = events.find((e) => e.id === hoveredEvent);

  const renderDot = useCallback((event: typeof eventMarkers[0]) => {
    return (props: { cx?: number; cy?: number }) => (
      <CustomEventDot
        cx={props.cx}
        cy={props.cy}
        isHovered={hoveredEvent === event.id}
        isMobile={isMobile}
        onMouseEnter={(e) => handleMouseEnter(event.id, e)}
        onMouseLeave={handleMouseLeave}
        onClick={() => handleEventClick(event.id)}
        onTouchStart={(e) => handleTouchStart(event.id, e)}
      />
    );
  }, [hoveredEvent, isMobile, handleMouseEnter, handleMouseLeave, handleEventClick, handleTouchStart]);

  return (
    <div className="relative w-full">
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-1 h-6 rounded-full ${isReachView ? "bg-gradient-to-b from-[#F40009] to-[#8B5CF6]" : "bg-[#F40009]"}`} />
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {isReachView ? "Estimated Reach" : "Conversation Trends"}
            </h2>
          </div>
          <p className="text-gray-500 text-sm ml-3">
            {isReachView 
              ? "Reach is estimated at ~6,200-6,500x mentions"
              : isTouch ? "Tap markers to view event details" : "Click on markers to explore key moments"}
          </p>
        </div>

        <div className="h-[320px] sm:h-[350px] md:h-[400px] w-full" onClick={handleChartClick}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={combinedChartData}
              margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 10 }}
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F40009" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#F40009" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#9ca3af", fontSize: isMobile ? 9 : 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                interval={isMobile ? 60 : 30}
                tickFormatter={(value) => {
                  // Show "Mon 'YY" format for cleaner labels
                  const parts = value.split(" ");
                  if (parts.length === 3) {
                    const day = parseInt(parts[1].replace(",", ""));
                    if (day === 1 || day === 15) {
                      return parts[0] + " '" + parts[2];
                    }
                    return "";
                  }
                  return value;
                }}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 50 : 30}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: isMobile ? 10 : 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  if (isReachView) {
                    // Format in millions for reach view
                    if (value >= 1000000) {
                      return `${(value / 1000000).toFixed(1)}M`;
                    } else if (value >= 1000) {
                      return `${(value / 1000).toFixed(0)}k`;
                    }
                    return value.toString();
                  }
                  return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString();
                }}
                width={isMobile ? 40 : 55}
              />
              <Tooltip content={<CustomTooltipContent isReachView={isReachView} />} />
              <Area
                type="monotone"
                dataKey="conversations"
                name="Global"
                stroke="#F40009"
                strokeWidth={2}
                fill="url(#areaGradient)"
                dot={false}
                activeDot={{ r: isMobile ? 6 : 5, fill: "#F40009", stroke: "#fff", strokeWidth: 2 }}
              />
              {indiaTrendline && (
                <Line
                  type="monotone"
                  dataKey="india"
                  name="India"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: isMobile ? 5 : 4, fill: "#8B5CF6", stroke: "#fff", strokeWidth: 2 }}
                  connectNulls={false}
                />
              )}
              {eventMarkers.map((event) => (
                <ReferenceDot
                  key={event.id}
                  x={event.date}
                  y={event.conversations}
                  shape={renderDot(event)}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-[#F40009] rounded-full" />
            <span>{isReachView ? "Global Reach" : "Global"}</span>
          </div>
          {indiaTrendline && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-[#8B5CF6] rounded-full" />
              <span>{isReachView ? "India Reach" : "India"}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#F40009] border-2 border-white shadow" />
            <span>Key Events</span>
          </div>
        </div>
      </div>

      {/* Floating tooltip - only show on desktop (non-touch devices) */}
      {!isTouch && hoveredEventData && tooltipPosition && (
        <EventTooltip
          event={hoveredEventData}
          position={tooltipPosition}
        />
      )}
    </div>
  );
}
