import { useEffect } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PollutionPieChart({ regionData }) {
  if (!regionData || regionData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        無區域資料
      </div>
    );
  }
  
  const chartData = {
    labels: regionData.map(d => d.region),
    datasets: [
      {
        label: '污染量',
        data: regionData.map(d => d.value),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // 紅
          'rgba(245, 158, 11, 0.8)',  // 橙
          'rgba(59, 130, 246, 0.8)',  // 藍
          'rgba(16, 185, 129, 0.8)',  // 綠
          'rgba(139, 92, 246, 0.8)',  // 紫
          'rgba(236, 72, 153, 0.8)',  // 粉
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(236, 72, 153, 1)',
        ],
        borderWidth: 2,
      }
    ]
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value.toFixed(2)} kg/km² (${percentage}%)`;
          }
        }
      }
    }
  };
  
  return (
    <div className="h-64 md:h-80">
      <Pie data={chartData} options={options} />
    </div>
  );
}
