export interface ChartDataPoint {
  date: string;
  conversations: number;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  image: string;
  impact: string;
  indianParticipation: number;
}

export interface TimelineData {
  chartData: ChartDataPoint[];
  events: TimelineEvent[];
}
