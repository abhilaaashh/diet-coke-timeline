"use client";

import { useState, useMemo, memo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartDataPoint } from "@/types";
import { useIsMobile } from "@/hooks/useIsMobile";

interface TrendlineData {
  period: string;
  conversations: number;
}

interface EventTrendline {
  id: string;
  name: string;
  trendline: TrendlineData[];
  color: string;
  totalVolume: number;
}

interface TrendlineOverlayProps {
  overallTrendline: ChartDataPoint[];
  eventTrendlines: EventTrendline[];
}

type Granularity = "daily" | "weekly" | "monthly";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Parse period string to Date object
function parsePeriodToDate(period: string): Date {
  const parts = period.split(" ");
  const month = parts[0];
  const monthIndex = monthNames.indexOf(month);
  
  let day = 1;
  let year: number;
  
  if (parts.length === 3) {
    // Daily format: "Jan 1, 23"
    day = parseInt(parts[1].replace(",", ""));
    year = parseInt(parts[2]);
  } else {
    // Monthly format: "Jan 23"
    year = parseInt(parts[1]);
  }
  
  const fullYear = year < 50 ? 2000 + year : 1900 + year;
  return new Date(fullYear, monthIndex, day);
}

// Get the week start date (Monday) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  return new Date(d.setDate(diff));
}

// Aggregate data to weekly granularity
function aggregateToWeekly(data: Array<{ period: string; conversations: number }>): Array<{ period: string; conversations: number }> {
  const weeklyMap = new Map<string, number>();
  
  data.forEach((item) => {
    const date = parsePeriodToDate(item.period);
    const weekStart = getWeekStart(date);
    const m = monthNames[weekStart.getMonth()];
    const dd = weekStart.getDate();
    const yy = weekStart.getFullYear().toString().slice(-2);
    const weekKey = `${m} ${dd}, ${yy}`;
    
    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + item.conversations);
  });
  
  return Array.from(weeklyMap.entries())
    .map(([period, conversations]) => ({ period, conversations }))
    .sort((a, b) => parsePeriodToDate(a.period).getTime() - parsePeriodToDate(b.period).getTime());
}

// Aggregate data to monthly granularity
function aggregateToMonthly(data: Array<{ period: string; conversations: number }>): Array<{ period: string; conversations: number }> {
  const monthlyMap = new Map<string, number>();
  
  data.forEach((item) => {
    const date = parsePeriodToDate(item.period);
    const m = monthNames[date.getMonth()];
    const yy = date.getFullYear().toString().slice(-2);
    const monthKey = `${m} 1, ${yy}`;
    
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + item.conversations);
  });
  
  return Array.from(monthlyMap.entries())
    .map(([period, conversations]) => ({ period, conversations }))
    .sort((a, b) => parsePeriodToDate(a.period).getTime() - parsePeriodToDate(b.period).getTime());
}

const CustomTooltipContent = memo(function CustomTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string; name: string }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  const sortedPayload = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));

  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100 max-w-xs">
      <p className="text-xs text-gray-400 uppercase mb-2 border-b border-gray-100 pb-1">
        {label}
      </p>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {sortedPayload.map((entry, index) => (
          entry.value > 0 && (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 truncate flex-1" title={entry.name}>
                {entry.name.length > 20 ? entry.name.slice(0, 20) + "..." : entry.name}
              </span>
              <span className="font-semibold text-gray-900">
                {(entry.value || 0).toLocaleString()}
              </span>
            </div>
          )
        ))}
      </div>
    </div>
  );
});

export default function TrendlineOverlay({
  overallTrendline,
  eventTrendlines,
}: TrendlineOverlayProps) {
  // Default to only showing "Diet Coke India" (event-1) alongside the global trend
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(
    new Set(eventTrendlines.filter((e) => e.name === "Diet Coke India").map((e) => e.id))
  );
  const [showOverall, setShowOverall] = useState(true);
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const isMobile = useIsMobile();

  // Aggregate overall trendline based on granularity
  const aggregatedOverallTrendline = useMemo(() => {
    const rawData = overallTrendline.map((p) => ({ period: p.date, conversations: p.conversations }));
    switch (granularity) {
      case "weekly":
        return aggregateToWeekly(rawData);
      case "monthly":
        return aggregateToMonthly(rawData);
      default:
        return rawData;
    }
  }, [overallTrendline, granularity]);

  // Aggregate event trendlines based on granularity
  const aggregatedEventTrendlines = useMemo(() => {
    return eventTrendlines.map((event) => ({
      ...event,
      trendline:
        granularity === "weekly"
          ? aggregateToWeekly(event.trendline)
          : granularity === "monthly"
          ? aggregateToMonthly(event.trendline)
          : event.trendline,
    }));
  }, [eventTrendlines, granularity]);

  const combinedData = useMemo(() => {
    const periodMap = new Map<string, Record<string, number>>();

    aggregatedOverallTrendline.forEach((point) => {
      if (!periodMap.has(point.period)) {
        periodMap.set(point.period, {});
      }
      periodMap.get(point.period)!["overall"] = point.conversations;
    });

    aggregatedEventTrendlines.forEach((event) => {
      event.trendline.forEach((point) => {
        if (!periodMap.has(point.period)) {
          periodMap.set(point.period, {});
        }
        periodMap.get(point.period)![event.id] = point.conversations;
      });
    });

    const entries = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        date: parsePeriodToDate(period),
        ...data,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    aggregatedEventTrendlines.forEach((event) => {
      const indicesWithData: number[] = [];
      entries.forEach((entry, idx) => {
        if (event.id in entry && entry[event.id as keyof typeof entry] !== undefined) {
          indicesWithData.push(idx);
        }
      });

      if (indicesWithData.length > 0) {
        const firstIdx = indicesWithData[0];
        const lastIdx = indicesWithData[indicesWithData.length - 1];

        if (firstIdx > 0) {
          (entries[firstIdx - 1] as Record<string, unknown>)[event.id] = 0;
        }

        if (lastIdx < entries.length - 1) {
          (entries[lastIdx + 1] as Record<string, unknown>)[event.id] = 0;
        }
      }
    });

    return entries;
  }, [aggregatedOverallTrendline, aggregatedEventTrendlines]);

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedEvents(new Set(eventTrendlines.map((e) => e.id)));
  };

  const deselectAll = () => {
    setSelectedEvents(new Set());
  };

  return (
    <div className="relative w-full">
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 bg-gradient-to-b from-[#8B5CF6] to-[#06B6D4] rounded-full" />
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Event Impact Overlay
            </h2>
          </div>
          <p className="text-gray-500 text-sm ml-3">
            Compare how individual events contributed to overall conversations
          </p>
        </div>

        {/* Mobile granularity toggle */}
        <div className="sm:hidden mb-4 flex justify-center">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            {(["daily", "weekly", "monthly"] as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  granularity === g
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Controls - hidden on mobile */}
        <div className="hidden sm:block mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-700">Actions:</span>
            <button
              onClick={selectAll}
              className="px-2.5 py-1 text-xs font-medium bg-white rounded border border-gray-200 hover:bg-gray-50"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-2.5 py-1 text-xs font-medium bg-white rounded border border-gray-200 hover:bg-gray-50"
            >
              Deselect All
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showOverall}
                onChange={(e) => setShowOverall(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-[#F40009] focus:ring-[#F40009]"
              />
              <span className="text-xs font-medium text-gray-700">Diet Coke Conversations</span>
            </label>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-700">View:</span>
              <div className="inline-flex bg-white rounded border border-gray-200">
                {(["daily", "weekly", "monthly"] as Granularity[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGranularity(g)}
                    className={`px-2 py-1 text-xs font-medium transition-colors ${
                      granularity === g
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    } ${g === "daily" ? "rounded-l" : g === "monthly" ? "rounded-r" : ""}`}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Event toggles */}
          <div className="flex flex-wrap gap-1.5">
            {eventTrendlines.map((event) => {
              const isSelected = selectedEvents.has(event.id);
              return (
                <button
                  key={event.id}
                  onClick={() => toggleEvent(event.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-white border border-gray-200 shadow-sm"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected ? "" : "opacity-30"}`}
                    style={{ backgroundColor: event.color }}
                  />
                  <span className="max-w-[120px] truncate" title={event.name}>
                    {event.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart */}
        <div className="h-[350px] sm:h-[400px] md:h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={combinedData}
              margin={{ top: 10, right: 10, left: isMobile ? 0 : 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fill: "#9ca3af", fontSize: isMobile ? 9 : 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                interval="preserveStartEnd"
                tickFormatter={(value) => {
                  // Show "Mon 'YY" format for cleaner labels
                  const parts = value.split(" ");
                  if (parts.length === 3) {
                    // Daily format: "Jan 1, 23" -> "Jan '23"
                    return parts[0] + " '" + parts[2];
                  } else if (parts.length === 2) {
                    // Monthly format: "Jan 23" -> "Jan '23"
                    return parts[0] + " '" + parts[1];
                  }
                  return value;
                }}
                angle={isMobile ? -45 : -30}
                textAnchor="end"
                height={isMobile ? 60 : 50}
                minTickGap={isMobile ? 40 : 60}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: isMobile ? 10 : 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => 
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                }
                domain={[0, 'auto']}
                width={isMobile ? 35 : 50}
              />
              <Tooltip content={<CustomTooltipContent />} />
              
              {showOverall && (
                <Line
                  type="linear"
                  dataKey="overall"
                  name="Diet Coke Conversations"
                  stroke="#F40009"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#F40009", stroke: "#fff", strokeWidth: 2 }}
                />
              )}

              {eventTrendlines.map((event) => (
                selectedEvents.has(event.id) && (
                  <Line
                    key={event.id}
                    type="linear"
                    dataKey={event.id}
                    name={event.name}
                    stroke={event.color}
                    strokeWidth={1.5}
                    strokeOpacity={0.8}
                    dot={false}
                    activeDot={{ r: 3, fill: event.color, stroke: "#fff", strokeWidth: 1 }}
                    connectNulls={false}
                  />
                )
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {showOverall && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                <div className="w-6 h-1 bg-[#F40009] rounded-full" />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-gray-800 block truncate">
                    Diet Coke Conversations
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {overallTrendline.reduce((a, b) => a + b.conversations, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            {eventTrendlines
              .filter((e) => selectedEvents.has(e.id))
              .map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                >
                  <div
                    className="w-6 h-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="min-w-0">
                    <span
                      className="text-xs font-medium text-gray-700 block truncate"
                      title={event.name}
                    >
                      {event.name}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {event.totalVolume.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
