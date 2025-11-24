import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TimeSeriesChart({ data, title }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        無時間序列資料
      </div>
    );
  }
  
  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: '污染值',
        data: data.map(d => d.value),
        borderColor: 'rgb(0, 153, 230)',
        backgroundColor: 'rgba(0, 153, 230, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `污染值: ${context.parsed.y.toFixed(2)} kg/km²`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '污染值 (kg/km²)'
        }
      },
      x: {
        title: {
          display: true,
          text: '時間'
        }
      }
    }
  };
  
  return (
    <div className="h-64 md:h-80">
      <Line data={chartData} options={options} />
    </div>
  );
}
