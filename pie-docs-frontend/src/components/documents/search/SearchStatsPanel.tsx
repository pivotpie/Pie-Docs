/**
 * SearchStatsPanel - Display search analytics and statistics
 */

import React, { useEffect, useState } from 'react';
import { searchService } from '@/services/api/searchService';

export const SearchStatsPanel: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchService.getSearchStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch search stats:', error);
        setError('Failed to load search statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-white/60 text-sm text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-3"></div>
          <div className="animate-pulse">Loading stats...</div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-xs text-white/60">{error || 'No statistics available'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Overall Statistics */}
      <div>
        <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
          <span>📊</span>
          Search Statistics
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg border border-indigo-500/30">
            <div className="text-2xl font-bold text-white mb-1">
              {stats.total_searches?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-white/60">Total Searches</div>
          </div>
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/30">
            <div className="text-2xl font-bold text-white mb-1">
              {stats.average_results?.toFixed(1) || '0.0'}
            </div>
            <div className="text-xs text-white/60">Avg Results</div>
          </div>
          {stats.total_unique_queries !== undefined && (
            <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
              <div className="text-2xl font-bold text-white mb-1">
                {stats.total_unique_queries?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-white/60">Unique Queries</div>
            </div>
          )}
          {stats.avg_similarity !== undefined && (
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg border border-amber-500/30">
              <div className="text-2xl font-bold text-white mb-1">
                {(stats.avg_similarity * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-white/60">Avg Similarity</div>
            </div>
          )}
        </div>
      </div>

      {/* Top Queries */}
      {stats.top_queries && stats.top_queries.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-1">
            <span>🔥</span>
            Top Queries
          </h4>
          <div className="space-y-1.5">
            {stats.top_queries.slice(0, 5).map((item: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-white/40 text-[10px] font-mono shrink-0">
                    #{i + 1}
                  </span>
                  <span className="text-white/70 text-xs truncate" title={item.query}>
                    {item.query}
                  </span>
                </div>
                <span className="text-white/50 text-xs ml-2 shrink-0 bg-white/10 px-2 py-0.5 rounded">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Types Distribution */}
      {stats.search_types && stats.search_types.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-1">
            <span>📈</span>
            Search Types
          </h4>
          <div className="space-y-2">
            {stats.search_types.map((item: any, i: number) => {
              const total = stats.search_types.reduce((sum: number, t: any) => sum + (t.count || 0), 0);
              const percentage = total > 0 ? (item.count / total) * 100 : 0;

              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70 capitalize">{item.type}</span>
                    <span className="text-white/50">{item.count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.type === 'semantic' ? 'bg-gradient-to-r from-indigo-500 to-purple-500' :
                        item.type === 'keyword' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                        'bg-gradient-to-r from-green-500 to-emerald-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Trends - Optional */}
      {stats.recent_searches && stats.recent_searches.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-1">
            <span>⏱️</span>
            Recent Activity
          </h4>
          <div className="space-y-1">
            {stats.recent_searches.slice(0, 3).map((item: any, i: number) => (
              <div
                key={i}
                className="p-2 bg-white/5 rounded text-xs text-white/60 flex items-center gap-2"
              >
                <span className="text-white/40">•</span>
                <span className="flex-1 truncate">{item.query}</span>
                <span className="text-[10px] text-white/40">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={() => {
          setLoading(true);
          fetchStats();
        }}
        className="w-full btn-glass text-xs py-2 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
      >
        <span>🔄</span>
        Refresh Stats
      </button>
    </div>
  );
};

export default SearchStatsPanel;
