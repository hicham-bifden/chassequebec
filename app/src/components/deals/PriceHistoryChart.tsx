import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { fetchHistory, type PricePoint } from '../../services/api';

interface Props {
  dealName: string;
  storeId: string;
  storeColor?: string;
}

export default function PriceHistoryChart({ dealName, storeId, storeColor = '#dc2626' }: Props) {
  const [data, setData]       = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchHistory(dealName, storeId)
      .then(rows => { if (!cancelled) setData(rows); })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dealName, storeId]);

  if (loading) {
    return <div className="h-24 flex items-center justify-center text-xs text-gray-400">Chargement…</div>;
  }
  if (data.length < 2) {
    return <div className="h-16 flex items-center justify-center text-xs text-gray-300">Historique insuffisant</div>;
  }

  return (
    <div className="mt-3">
      <p className="text-xs text-gray-400 mb-1">Historique de prix</p>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9 }}
            tickFormatter={d => d.slice(5)} // "03-27" from "2026-03-27"
          />
          <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(2)} $`, 'Prix']}
            labelFormatter={l => `Semaine du ${l}`}
            contentStyle={{ fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={storeColor}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
