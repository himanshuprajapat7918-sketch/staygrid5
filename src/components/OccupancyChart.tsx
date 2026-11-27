import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface OccupancyChartProps {
  available: number;
  occupied: number;
}

export default function OccupancyChart({ available, occupied }: OccupancyChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart<'doughnut'> | null>(null);

  const total = available + occupied;
  const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const hasRooms = total > 0;
    const dataValues = hasRooms ? [available, occupied] : [1];
    const labels = hasRooms ? ['Available', 'Occupied'] : ['No rooms yet'];
    const bgColors = hasRooms ? ['#10B981', '#F43F5E'] : ['#E2E8F0'];
    const hoverColors = hasRooms ? ['#059669', '#E11D48'] : ['#CBD5E1'];

    if (chartInstanceRef.current) {
      const chart = chartInstanceRef.current;
      chart.data.labels = labels;
      chart.data.datasets[0].data = dataValues;
      chart.data.datasets[0].backgroundColor = bgColors;
      chart.data.datasets[0].hoverBackgroundColor = hoverColors;
      chart.update('active');
      return;
    }

    chartInstanceRef.current = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: dataValues,
            backgroundColor: bgColors,
            hoverBackgroundColor: hoverColors,
            borderWidth: 2,
            borderColor: '#FFFFFF',
            hoverOffset: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '72%',
        animation: {
          duration: 320,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            backgroundColor: '#0F172A',
            titleFont: { family: 'Plus Jakarta Sans, sans-serif', size: 12, weight: 600 },
            bodyFont: { family: 'JetBrains Mono, monospace', size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label(ctx) {
                if (!hasRooms) return ' Add rooms to track occupancy';
                const val = Number(ctx.parsed) || 0;
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return ` ${ctx.label}: ${val} room${val === 1 ? '' : 's'} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }, [available, occupied, total]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0">
        <canvas ref={canvasRef} aria-label="Room occupancy doughnut chart" />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-lg font-semibold leading-none text-slate-900 tabular-nums">
            {total > 0 ? `${occupancyPct}%` : '—'}
          </span>
          <span className="mt-1 text-[11px] font-medium text-slate-500">Occupied</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-slate-700">
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" aria-hidden="true" />
            Available
          </span>
          <span className="font-mono font-semibold text-emerald-700 tabular-nums">{available}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-slate-700">
            <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" aria-hidden="true" />
            Occupied
          </span>
          <span className="font-mono font-semibold text-rose-700 tabular-nums">{occupied}</span>
        </div>
        <div className="border-t border-slate-100 pt-1.5 text-xs text-slate-500">
          Updates live as rooms change
        </div>
      </div>
    </div>
  );
}
