# Diet Coke Rapid Research Timeline

An interactive single-page timeline visualization showcasing Diet Coke conversations and key cultural moments. Built for Consuma's rapid research project.

## Features

- **Interactive Line Chart**: Visualize conversation trends over time with Recharts
- **Timeline Event Markers**: Click on markers to explore key moments
- **Hover Tooltips**: Preview event details on hover
- **Event Cards**: Detailed cards with impact analysis and Indian participation stats
- **Scroll Animations**: Smooth entrance animations powered by Framer Motion
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Charting**: Recharts
- **Animations**: Framer Motion
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (static export)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

Static files will be generated in the `out/` directory.

## Deployment to Vercel

### Option 1: Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy
vercel
```

### Option 2: GitHub Integration

1. Push this repository to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import the repository
4. Vercel will auto-detect Next.js and deploy

## Customizing Data

Update the timeline data in `data/events.json`:

```json
{
  "chartData": [
    { "date": "YYYY-MM", "conversations": number }
  ],
  "events": [
    {
      "id": "unique-id",
      "date": "YYYY-MM",
      "title": "Event Title",
      "description": "Event description",
      "image": "/images/event-image.jpg",
      "impact": "Impact description",
      "indianParticipation": 15.5
    }
  ]
}
```

## Adding Images

Place event images in `public/images/` and reference them as `/images/filename.jpg` in the events data.

## Project Structure

```
├── app/
│   ├── page.tsx          # Main page component
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── Timeline.tsx      # Chart with event markers
│   ├── EventCard.tsx     # Event detail cards
│   └── EventTooltip.tsx  # Hover tooltips
├── data/
│   └── events.json       # Timeline data
├── types/
│   └── index.ts          # TypeScript interfaces
└── public/
    └── images/           # Event images
```

## License

Private - Consuma © 2026
