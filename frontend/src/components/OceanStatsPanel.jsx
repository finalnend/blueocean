export default function OceanStatsPanel({ oceans }) {
  if (!Array.isArray(oceans) || oceans.length === 0) return null;

  const maxArea = Math.max(...oceans.map((o) => o?.stats?.area?.value || 0));
  const maxDepth = Math.max(...oceans.map((o) => o?.stats?.meanDepth?.value || 0));
  const maxVolume = Math.max(...oceans.map((o) => o?.stats?.volume?.value || 0));

  const ratio = (value, max) => {
    if (!max || !value) return 0;
    return Math.max(0, Math.min(100, (value / max) * 100));
  };

  const formatNumber = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold">Ocean Stats</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Live data from Wikidata. Missing stats are omitted.
          </p>
        </div>
        <a
          href="https://www.wikidata.org/wiki/Special:EntityData"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ocean-blue-600 dark:text-ocean-blue-300 font-semibold hover:underline text-sm"
        >
          Source
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {oceans.map((ocean) => (
          <div
            key={ocean.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white/60 dark:bg-gray-900/20"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-lg font-bold">{ocean.name}</div>
                {ocean.description && (
                  <div className="text-xs text-gray-600 dark:text-gray-300">{ocean.description}</div>
                )}
              </div>
              <div className="flex gap-2 text-xs">
                {ocean.wikipediaUrl && (
                  <a
                    href={ocean.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ocean-blue-600 dark:text-ocean-blue-300 hover:underline"
                  >
                    Wikipedia
                  </a>
                )}
                {ocean.wikidataUrl && (
                  <a
                    href={ocean.wikidataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ocean-blue-600 dark:text-ocean-blue-300 hover:underline"
                  >
                    Wikidata
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {ocean.stats.area && (
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Area</span>
                    <span className="text-gray-700 dark:text-gray-200">
                      {formatNumber(ocean.stats.area.value)} {ocean.stats.area.unit}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mt-1 overflow-hidden">
                    <div
                      className="h-2 bg-ocean-blue-500 rounded"
                      style={{ width: `${ratio(ocean.stats.area.value, maxArea)}%` }}
                    />
                  </div>
                </div>
              )}

              {ocean.stats.meanDepth && (
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Mean depth</span>
                    <span className="text-gray-700 dark:text-gray-200">
                      {formatNumber(ocean.stats.meanDepth.value)} {ocean.stats.meanDepth.unit}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mt-1 overflow-hidden">
                    <div
                      className="h-2 bg-earth-green-500 rounded"
                      style={{ width: `${ratio(ocean.stats.meanDepth.value, maxDepth)}%` }}
                    />
                  </div>
                </div>
              )}

              {ocean.stats.volume && (
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Volume</span>
                    <span className="text-gray-700 dark:text-gray-200">
                      {formatNumber(ocean.stats.volume.value)} {ocean.stats.volume.unit}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mt-1 overflow-hidden">
                    <div
                      className="h-2 bg-purple-500 rounded"
                      style={{ width: `${ratio(ocean.stats.volume.value, maxVolume)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

