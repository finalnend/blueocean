export default function DataSourcesPanel({ sources = [], loading }) {
  if (loading) {
    return (
      <div className="card">
        <p className="text-sm text-gray-500">資料來源載入中...</p>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <h3 className="text-lg font-bold">資料來源</h3>
      {sources.map((src, idx) => (
        <div key={idx} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold">{src.name}</div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                src.status === 'available'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {src.status === 'available' ? '可用' : '待啟用'}
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-1">{src.type}</p>
          <p className="text-xs text-gray-500 mb-1">授權：{src.auth}</p>
          <p className="text-xs text-gray-500 mb-1">Endpoint：{src.endpoint}</p>
          <p className="text-xs text-gray-500">{src.notes}</p>
        </div>
      ))}
    </div>
  );
}
