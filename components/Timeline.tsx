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
  ReferenceLine,
} from "recharts";
import { ChartDataPoint, TimelineEvent } from "@/types";

interface IndiaTrendline {
  period: string;
  conversations: number;
}

interface SalesDataPoint {
  period: string;
  value: number;
}

interface GeographySales {
  name: string;
  color: string;
  data: SalesDataPoint[];
}

interface SalesData {
  description: string;
  geographies: GeographySales[];
}

import EventTooltip from "./EventTooltip";
import { useIsMobile, useIsTouchDevice } from "@/hooks/useIsMobile";

interface TimelineProps {
  chartData: ChartDataPoint[];
  events: TimelineEvent[];
  onEventClick: (eventId: string) => void;
  indiaTrendline?: IndiaTrendline[];
  isReachView?: boolean;
  salesData?: SalesData;
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
  payload?: Array<{ value: number; dataKey: string; color: string; name: string; payload?: Record<string, unknown> }>;
  label?: string;
  isReachView?: boolean;
}) {
  if (!active || !payload || !payload.length) return null;

  // Separate conversation data from sales data
  const conversationData = payload.filter(entry => !entry.dataKey.startsWith('sales_'));
  const salesDataEntries = payload.filter(entry => entry.dataKey.startsWith('sales_'));

  return (
    <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-100 max-w-xs">
      <p className="text-xs text-gray-400 uppercase mb-2">{label}</p>
      {conversationData.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {conversationData.map((entry, index) => (
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
      )}
      {salesDataEntries.length > 0 && (
        <>
          <div className="border-t border-gray-100 pt-2 mt-2">
            <p className="text-[10px] text-gray-400 uppercase mb-1.5">Sales YoY %</p>
            <div className="space-y-1">
              {salesDataEntries.map((entry, index) => {
                const displayValue = entry.value;
                
                return (
                  displayValue !== undefined && displayValue !== null && (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-gray-500">{entry.name}:</span>
                      <span className={`text-sm font-bold ${displayValue >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {displayValue >= 0 ? '+' : ''}{displayValue.toFixed(1)}%
                      </span>
                    </div>
                  )
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default function Timeline({ chartData, events, onEventClick, indiaTrendline, isReachView = false, salesData }: TimelineProps) {
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [showSalesData, setShowSalesData] = useState(true);
  const [selectedGeographies, setSelectedGeographies] = useState<Set<string>>(
    new Set(salesData?.geographies.map(g => g.name) || [])
  );
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();

  const toggleGeography = useCallback((name: string) => {
    setSelectedGeographies(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  // Calculate max conversation value for the left Y-axis
  const maxConversations = useMemo(() => {
    return Math.max(...chartData.map(d => d.conversations));
  }, [chartData]);

  // Calculate the min and max sales values for the right Y-axis domain
  const salesDomain = useMemo(() => {
    if (!salesData) return { min: -20, max: 15 };
    let min = 0;
    let max = 0;
    salesData.geographies.forEach(geo => {
      geo.data.forEach(d => {
        if (d.value < min) min = d.value;
        if (d.value > max) max = d.value;
      });
    });
    // Add some padding and round to nice numbers
    const padding = Math.max(Math.abs(min), Math.abs(max)) * 0.1;
    return { 
      min: Math.floor(min - padding), 
      max: Math.ceil(max + padding) 
    };
  }, [salesData]);

  // Calculate conversation domain to align 0 with sales axis 0
  // We extend the conversation axis into negative territory so both zeros align
  const conversationDomain = useMemo(() => {
    if (!salesData || !showSalesData || isReachView) {
      return { min: 0, max: maxConversations };
    }
    
    const salesRange = salesDomain.max - salesDomain.min;
    const salesZeroRatio = Math.abs(salesDomain.min) / salesRange; // Where 0 falls as ratio from bottom
    
    // For conversation axis: if 0 is at salesZeroRatio from bottom
    // and max is at top, calculate min so 0 aligns
    // salesZeroRatio = (0 - convMin) / (convMax - convMin)
    // Solving for convMin: convMin = -convMax * salesZeroRatio / (1 - salesZeroRatio)
    const convMin = -maxConversations * salesZeroRatio / (1 - salesZeroRatio);
    
    return { 
      min: convMin, 
      max: maxConversations 
    };
  }, [salesData, showSalesData, isReachView, salesDomain, maxConversations]);

  // Calculate explicit tick values for both axes (including 0)
  const conversationTicks = useMemo(() => {
    const max = conversationDomain.max;
    // Generate nice round ticks: 0, 1k, 2k, 3k, 4k etc.
    const step = max > 3000 ? 1000 : max > 1000 ? 500 : 100;
    const ticks: number[] = [];
    for (let i = 0; i <= max; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [conversationDomain]);

  const salesTicks = useMemo(() => {
    // Generate nice round ticks that include 0
    const { min, max } = salesDomain;
    const range = max - min;
    const step = range > 30 ? 10 : range > 15 ? 5 : 2;
    const ticks: number[] = [];
    // Start from a rounded min, go to rounded max, include 0
    const startTick = Math.floor(min / step) * step;
    const endTick = Math.ceil(max / step) * step;
    for (let i = startTick; i <= endTick; i += step) {
      ticks.push(i);
    }
    if (!ticks.includes(0)) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }
    return ticks;
  }, [salesDomain]);

  // Merge global, India, and sales data
  const combinedChartData = useMemo(() => {
    const baseData = chartData.map(d => ({ 
      ...d, 
      india: undefined as number | undefined,
    }));
    
    // Add India trendline data
    if (indiaTrendline) {
      const indiaMap = new Map<string, number>();
      indiaTrendline.forEach((d) => indiaMap.set(d.period, d.conversations));
      baseData.forEach((d) => {
        d.india = indiaMap.get(d.date);
      });
    }
    
    // Add sales data for each geography (using original percentage values for dual-axis)
    // Both datasets are now monthly with matching period format
    if (salesData && !isReachView) {
      salesData.geographies.forEach((geo) => {
        const salesMap = new Map<string, number>();
        geo.data.forEach((d) => salesMap.set(d.period, d.value));
        
        // Direct match since both are monthly with same format
        baseData.forEach((d) => {
          const salesValue = salesMap.get(d.date);
          if (salesValue !== undefined) {
            (d as Record<string, unknown>)[`sales_${geo.name.replace(/\s+/g, '_')}`] = salesValue;
          }
        });
      });
    }
    
    return baseData;
  }, [chartData, indiaTrendline, salesData, isReachView]);

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
            {isTouch ? "Tap markers to view event details" : "Click on markers to explore key moments"}
          </p>
        </div>

        <div className="h-[320px] sm:h-[350px] md:h-[400px] w-full" onClick={handleChartClick}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={combinedChartData}
              margin={{ top: 10, right: salesData && showSalesData && !isReachView ? 10 : 10, left: isMobile ? 0 : 10, bottom: 10 }}
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
                interval={isMobile ? 5 : 2}
                tickFormatter={(value) => {
                  // Show "Mon 'YY" format for monthly data
                  const parts = value.split(" ");
                  if (parts.length === 3) {
                    return parts[0] + " '" + parts[2];
                  }
                  return value;
                }}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 50 : 30}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "#9ca3af", fontSize: isMobile ? 10 : 11 }}
                tickLine={false}
                axisLine={false}
                domain={[conversationDomain.min, conversationDomain.max]}
                ticks={salesData && showSalesData && !isReachView ? conversationTicks : undefined}
                tickFormatter={(value) => {
                  // Don't show negative tick labels (they're just for alignment), but show 0
                  if (value < 0) return '';
                  if (value === 0) return '0';
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
              {/* Right Y-axis for sales growth rate (percentage) */}
              {salesData && showSalesData && !isReachView && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#9ca3af", fontSize: isMobile ? 10 : 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[salesDomain.min, salesDomain.max]}
                  ticks={salesTicks}
                  tickFormatter={(value) => value === 0 ? '0%' : `${value > 0 ? '+' : ''}${value}%`}
                  width={isMobile ? 45 : 55}
                />
              )}
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
                yAxisId="left"
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
                  yAxisId="left"
                />
              )}
              {/* Zero reference line for sales data (right axis) */}
              {salesData && showSalesData && !isReachView && (
                <ReferenceLine 
                  y={0} 
                  yAxisId="right" 
                  stroke="#d1d5db" 
                  strokeDasharray="4 4" 
                  strokeWidth={1}
                />
              )}
              {/* Sales data lines (dashed) - using right Y-axis for percentage values */}
              {salesData && showSalesData && !isReachView && salesData.geographies.map((geo) => (
                selectedGeographies.has(geo.name) && (
                  <Line
                    key={`sales_${geo.name}`}
                    type="monotone"
                    dataKey={`sales_${geo.name.replace(/\s+/g, '_')}`}
                    name={geo.name}
                    stroke={geo.color}
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    dot={false}
                    activeDot={{ r: 4, fill: geo.color, stroke: "#fff", strokeWidth: 2 }}
                    connectNulls={true}
                    yAxisId="right"
                  />
                )
              ))}
              {eventMarkers.map((event) => (
                <ReferenceDot
                  key={event.id}
                  x={event.date}
                  y={event.conversations}
                  yAxisId="left"
                  shape={renderDot(event)}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {/* Conversation volume legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-[#F40009] rounded-full" />
              <span>{isReachView ? "Global Reach" : "Global Conv. Volume"}</span>
            </div>
            {indiaTrendline && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-[#8B5CF6] rounded-full" />
                <span>{isReachView ? "India Reach" : "India Conv. Volume"}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#F40009] border-2 border-white shadow" />
              <span>Key Events</span>
            </div>
          </div>
          
          {/* Sales data controls - only show when not in reach view */}
          {salesData && !isReachView && (
            <div className="pt-3 border-t border-gray-100">
              <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                <span className="text-xs font-medium text-gray-600">Sales Data (YoY %):</span>
                <button
                  onClick={() => setShowSalesData(!showSalesData)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    showSalesData 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {showSalesData ? 'Hide All' : 'Show All'}
                </button>
              </div>
              {showSalesData && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {salesData.geographies.map((geo) => {
                    const isSelected = selectedGeographies.has(geo.name);
                    return (
                      <button
                        key={geo.name}
                        onClick={() => toggleGeography(geo.name)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-white border border-gray-200 shadow-sm text-gray-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <svg 
                          className="w-4 h-0.5 flex-shrink-0"
                          style={{ 
                            backgroundColor: geo.color, 
                            opacity: isSelected ? 1 : 0.3,
                            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, white 2px, white 4px)'
                          }}
                        />
                        <span>{geo.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-[10px] text-gray-400 text-center mt-2">
                Dashed lines show YoY% sales change (right axis)
              </p>
            </div>
          )}
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
