"use client";

import { useState, useCallback } from "react";
import Timeline from "@/components/Timeline";
import TrendlineOverlay from "@/components/TrendlineOverlay";
import EventCard from "@/components/EventCard";
import eventsData from "@/data/events.json";
import dcSalesRaw from "@/data/dc-sales.json";
import { TimelineData, TimelineEvent, ChartDataPoint } from "@/types";

// Sales data type
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

// Transform dc-sales.json into the format expected by Timeline
const geographyColors: Record<string, string> = {
  "United States of America": "#F40009",
  "United Kingdom": "#10B981",
  "Canada": "#F97316",
  "India": "#8B5CF6",
};

function transformSalesData(rawSales: Record<string, Record<string, string>>): SalesData {
  const geographies: GeographySales[] = Object.entries(rawSales).map(([name, monthlyData]) => {
    const data: SalesDataPoint[] = Object.entries(monthlyData).map(([month, valueStr]) => {
      // Convert "Jan 2023" to "Jan 1, 23" format and parse percentage
      const parts = month.split(" ");
      const period = `${parts[0]} 1, ${parts[1].slice(-2)}`;
      const value = parseFloat(valueStr.replace("%", ""));
      return { period, value };
    });
    return {
      name,
      color: geographyColors[name] || "#6B7280",
      data,
    };
  });
  return {
    description: "Year-over-Year % Change in Diet Coke Sales by Geography",
    geographies,
  };
}

const salesData = transformSalesData(dcSalesRaw as Record<string, Record<string, string>>);

// Transform the raw JSON data to match the expected structure
const rawJsonData = eventsData as {
  events: Array<{
    event_name: string;
    date?: string;
    description?: string;
    total_conv_vol: number;
    total_reach?: number;
    indian_participation?: number;
    trendline: Array<{ period: string; conversations: number; reach?: number; note?: string }>;
  }>;
};

const rawData = rawJsonData.events;

// Helper function to convert ISO date (2023-07-17) to monthly chart format (Jul 1, 23)
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function isoToChartDate(isoDate: string): string {
  const date = new Date(isoDate);
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  // Use first of month to match monthly data format
  return `${month} 1, ${year}`;
}

// Deterministic pseudo-random number generator (mulberry32)
function seededRandom(seed: number) {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Convert weekly trendline data to daily data with natural variation
function weeklyToDaily(
  trendline: Array<{ period: string; conversations: number; reach?: number }>,
): Array<{ period: string; conversations: number; reach?: number }> {
  const dailyData: Array<{ period: string; conversations: number; reach?: number }> = [];

  for (let i = 0; i < trendline.length; i++) {
    const item = trendline[i];
    const parts = item.period.split(" ");
    if (parts.length !== 3) continue;

    const month = parts[0];
    const day = parseInt(parts[1].replace(",", ""));
    const year = parseInt(parts[2]);
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    const monthIdx = monthNames.indexOf(month);
    const startDate = new Date(fullYear, monthIdx, day);

    const weeklyConv = item.conversations;
    const weeklyReach = item.reach || 0;

    // Generate 7 daily values that sum to the weekly total
    const rawWeights: number[] = [];
    for (let d = 0; d < 7; d++) {
      const seed = fullYear * 10000 + (monthIdx + 1) * 100 + day + d * 7 + i * 31;
      rawWeights.push(0.5 + seededRandom(seed) * 1.5);
    }
    const weightSum = rawWeights.reduce((a, b) => a + b, 0);

    for (let d = 0; d < 7; d++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + d);

      // Stop if we'd overlap into the next week's data
      if (i < trendline.length - 1) {
        const nextParts = trendline[i + 1].period.split(" ");
        if (nextParts.length === 3) {
          const nMonth = monthNames.indexOf(nextParts[0]);
          const nDay = parseInt(nextParts[1].replace(",", ""));
          const nYear = parseInt(nextParts[2]) < 50 ? 2000 + parseInt(nextParts[2]) : 1900 + parseInt(nextParts[2]);
          const nextStart = new Date(nYear, nMonth, nDay);
          if (currentDate >= nextStart) break;
        }
      }

      const dailyConv = Math.round((weeklyConv * rawWeights[d]) / weightSum);
      const dailyReach = Math.round((weeklyReach * rawWeights[d]) / weightSum);

      const m = monthNames[currentDate.getMonth()];
      const dd = currentDate.getDate();
      const yy = currentDate.getFullYear().toString().slice(-2);
      const period = `${m} ${dd}, ${yy}`;

      dailyData.push({ period, conversations: dailyConv, reach: dailyReach });
    }
  }

  return dailyData;
}

// Generate colors for event trendlines
const eventColors = [
  "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EC4899",
  "#6366F1", "#14B8A6", "#F97316", "#84CC16", "#EF4444",
  "#3B82F6", "#A855F7",
];

// Map event names to their image paths
const eventImageMap: Record<string, string> = {
  "Elon 'Never Quit' Tweet": "/events/elon-never-quit.png",
  "Trump's Diet Coke Button Return": "/events/trump-diet-coke-button.png",
  "WHO Aspartame Cancer Ruling": "/events/who-risk.png",
  "Dua Lipa 'Dirty Cola' Viral": "/events/dualipa-cola.png",
  "GST 'Sin Tax' Hike (India 40%)": "",
  "Trump/Elon/RFK Jet Photo": "/events/trump-elon-rfk-pvtjet.png",
  "'Fridge Cigarette' Trend": "/events/fridge-cig.png",
  "Diet Coke vs Coke Zero Content (India)": "/events/coke-zero-vs-diet-coke.png",
  "Diet Coke India": "",
};

// First element contains the overall trend data
const overallTrend = rawData[0];

// Helper function to aggregate weekly data into monthly data
function aggregateToMonthly(trendline: Array<{ period: string; conversations: number; reach?: number }>): Array<{ period: string; conversations: number; reach: number }> {
  const monthlyMap = new Map<string, { conversations: number; reach: number }>();
  
  trendline.forEach((item) => {
    // Parse the period (e.g., "Dec 26, 22" or "Jan 2, 23")
    const parts = item.period.split(" ");
    if (parts.length === 3) {
      const month = parts[0];
      const year = parts[2];
      const monthKey = `${month} 1, ${year}`;
      
      const existing = monthlyMap.get(monthKey) || { conversations: 0, reach: 0 };
      monthlyMap.set(monthKey, {
        conversations: existing.conversations + item.conversations,
        reach: existing.reach + (item.reach || 0),
      });
    }
  });
  
  // Convert map to array and sort by date
  const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Array.from(monthlyMap.entries())
    .map(([period, data]) => ({ period, ...data }))
    .sort((a, b) => {
      const [aMonth, , aYear] = a.period.split(" ");
      const [bMonth, , bYear] = b.period.split(" ");
      const aYearNum = parseInt(aYear);
      const bYearNum = parseInt(bYear);
      if (aYearNum !== bYearNum) return aYearNum - bYearNum;
      return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
    });
}

// Transform trendline to monthly chartData format (for Timeline with sales data)
const monthlyTrendline = aggregateToMonthly(overallTrend.trendline);
const chartData: ChartDataPoint[] = monthlyTrendline.map((item) => ({
  date: item.period,
  conversations: item.conversations,
}));

// Convert weekly data to daily for TrendlineOverlay (Event Impact view)
const dailyOverallTrendline = weeklyToDaily(overallTrend.trendline);
const weeklyChartData: ChartDataPoint[] = dailyOverallTrendline.map((item) => ({
  date: item.period,
  conversations: item.conversations,
}));

// Transform remaining elements to events format
const events: TimelineEvent[] = rawData.slice(1).map((item, index) => ({
  id: `event-${index + 1}`,
  date: item.date ? isoToChartDate(item.date) : "",
  title: item.event_name,
  description: item.description || `Total conversation volume: ${item.total_conv_vol.toLocaleString()}`,
  image: eventImageMap[item.event_name] || "",
  impact: `${item.total_conv_vol.toLocaleString()} conversations`,
  indianParticipation: item.indian_participation ?? 0,
}));

// Prepare event trendlines for overlay view (daily granularity)
const eventTrendlines = rawData.slice(1).map((item, index) => ({
  id: `event-${index + 1}`,
  name: item.event_name,
  trendline: weeklyToDaily(item.trendline).map(d => ({ period: d.period, conversations: d.conversations })),
  color: eventColors[index % eventColors.length],
  totalVolume: item.total_conv_vol,
}));

// Get India trendline for the main timeline view (monthly aggregated)
const indiaRawTrendline = rawData.find((item) => item.event_name === "Diet Coke India")?.trendline;
const indiaTrendlineData = indiaRawTrendline ? aggregateToMonthly(indiaRawTrendline).map(item => ({
  period: item.period,
  conversations: item.conversations,
})) : undefined;

// Transform trendline to monthly reach chartData format
const reachChartData: ChartDataPoint[] = monthlyTrendline.map((item) => ({
  date: item.period,
  conversations: item.reach || 0,
}));

// Prepare reach event trendlines for overlay view
const reachEventTrendlines = rawData.slice(1).map((item, index) => ({
  id: `event-${index + 1}`,
  name: item.event_name,
  trendline: item.trendline.map(t => ({ period: t.period, conversations: t.reach || 0 })),
  color: eventColors[index % eventColors.length],
  totalVolume: item.total_reach || 0,
}));

// Get India reach trendline (monthly aggregated)
const indiaReachTrendlineData = indiaRawTrendline ? aggregateToMonthly(indiaRawTrendline).map(item => ({
  period: item.period,
  conversations: item.reach,
})) : undefined;

const data: TimelineData = { chartData, events };

// Calculate total conversations: overall + all individual events
const totalConversations = rawData.reduce((sum, item) => sum + item.total_conv_vol, 0);

// Calculate total reach
const totalReach = rawData.reduce((sum, item) => sum + (item.total_reach || 0), 0);

type ViewMode = "timeline" | "overlay" | "reach";

export default function Home() {
  const [highlightedEvent, setHighlightedEvent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");

  const handleEventClick = useCallback((eventId: string) => {
    setHighlightedEvent(eventId);
    
    const element = document.getElementById(`event-${eventId}`);
    if (element) {
      element.scrollIntoView({ behavior: "auto", block: "center" });
    }

    setTimeout(() => {
      setHighlightedEvent(null);
    }, 2000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <img 
                src="/consuma-logo.svg" 
                alt="Consuma" 
                className="h-8 w-auto"
              />
            </div>
            <div className="flex items-center gap-4">
              <img 
                src="/coca-cola-logo.png" 
                alt="Coca-Cola" 
                className="h-6 w-auto"
              />
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Rapid Research Report
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img 
                src="/coca-cola-logo.png" 
                alt="Coca-Cola" 
                className="h-10 md:h-12 w-auto"
              />
              <span className="text-gray-300 text-2xl font-light">×</span>
              <img 
                src="/consuma-logo.svg" 
                alt="Consuma" 
                className="h-8 md:h-10 w-auto"
              />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Diet Coke
              <span className="block gradient-text mt-1">Timeline Report</span>
            </h1>
            <p className="text-gray-500 mb-8 max-w-2xl mx-auto">
              Explore the key moments that shaped Diet Coke conversations across social media, 
              with insights into cultural impact and Indian audience engagement.
            </p>
            
            {/* Stats */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 text-sm">
              {/* Mobile: stacked layout, Desktop: inline */}
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-gray-600">14M conversations analyzed</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg">
                  <span className="text-emerald-600 font-semibold">{totalConversations.toLocaleString()}</span>
                  <span className="text-gray-600 hidden xs:inline sm:inline">noise-free conversations</span>
                  <span className="text-gray-600 xs:hidden sm:hidden">rich conversations</span>
                </div>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex bg-gray-100 p-1.5 sm:p-1 rounded-xl sm:rounded-lg">
              <button
                onClick={() => setViewMode("timeline")}
                className={`flex items-center gap-2 px-4 py-3 sm:px-3 sm:py-2 rounded-lg sm:rounded-md text-sm font-medium transition-all min-h-[44px] ${
                  viewMode === "timeline"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 active:bg-gray-200"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="hidden sm:inline">Timeline</span>
                <span className="sm:hidden">Mentions</span>
              </button>
              <button
                onClick={() => setViewMode("overlay")}
                className={`flex items-center gap-2 px-4 py-3 sm:px-3 sm:py-2 rounded-lg sm:rounded-md text-sm font-medium transition-all min-h-[44px] ${
                  viewMode === "overlay"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 active:bg-gray-200"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                Overlay
              </button>
              <button
                onClick={() => setViewMode("reach")}
                className={`flex items-center gap-2 px-4 py-3 sm:px-3 sm:py-2 rounded-lg sm:rounded-md text-sm font-medium transition-all min-h-[44px] ${
                  viewMode === "reach"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 active:bg-gray-200"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Reach
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Chart Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === "timeline" ? (
          <Timeline
            chartData={data.chartData}
            events={data.events}
            onEventClick={handleEventClick}
            indiaTrendline={indiaTrendlineData}
            salesData={salesData}
          />
        ) : viewMode === "overlay" ? (
          <TrendlineOverlay
            overallTrendline={weeklyChartData}
            eventTrendlines={eventTrendlines}
          />
        ) : (
          <Timeline
            chartData={reachChartData}
            events={data.events}
            onEventClick={handleEventClick}
            indiaTrendline={indiaReachTrendlineData}
            isReachView={true}
          />
        )}
      </section>

      {/* Events Section */}
      <section className="bg-gray-100 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full text-sm text-gray-600 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F40009]" />
              Detailed Analysis
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Key Moments & Events
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              A detailed look at the cultural moments that drove Diet Coke conversations.
            </p>
          </div>

          {/* Event Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {data.events.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                isHighlighted={highlightedEvent === event.id}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/consuma-logo.svg" 
                alt="Consuma" 
                className="h-10 w-auto"
              />
              <div>
                <p className="font-bold text-gray-900">Consuma</p>
                <p className="text-sm text-gray-400">Rapid Research Platform<sup className="text-[10px]">™</sup></p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <img 
                src="/coca-cola-logo.png" 
                alt="Coca-Cola" 
                className="h-6 w-auto opacity-60"
              />
              <div className="text-center md:text-right text-sm text-gray-500">
                <p>Diet Coke Rapid Research Report</p>
                <p className="text-gray-400">Generated January 2026</p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-400">
            © 2026 Consuma. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
