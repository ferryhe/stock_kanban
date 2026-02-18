import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Info, AlertTriangle, Bug } from "lucide-react";

interface BackendLog {
  id: string;
  level: string;
  category: string;
  message: string;
  details?: Record<string, unknown>;
  userId?: string;
  ipAddress?: string;
  createdAt: string;
}

export default function BackendLogsPage() {
  const [page, setPage] = useState(0);
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const limit = 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["backendLogs", page, levelFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      if (levelFilter) params.append("level", levelFilter);
      if (categoryFilter) params.append("category", categoryFilter);

      const res = await fetch(`/api/admin/backend-logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch backend logs");
      return res.json();
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const logs: BackendLog[] = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warn":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "debug":
        return <Bug className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "border-l-4 border-red-500 bg-red-50";
      case "warn":
        return "border-l-4 border-yellow-500 bg-yellow-50";
      case "debug":
        return "border-l-4 border-purple-500 bg-purple-50";
      default:
        return "border-l-4 border-blue-500 bg-blue-50";
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Level</label>
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setPage(0);
              }}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">All Levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">All Categories</option>
              <option value="system">System</option>
              <option value="database">Database</option>
              <option value="api">API</option>
              <option value="auth">Auth</option>
              <option value="security">Security</option>
              <option value="performance">Performance</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div className="flex-1"></div>

          <div className="text-sm text-slate-600">
            Total: {total} logs
          </div>

          <Button size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Loading logs...</div>
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          No logs found
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className={`p-4 ${getLevelColor(log.level)}`}>
              <div className="flex items-start gap-3">
                <div className="mt-1">{getLevelIcon(log.level)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-xs uppercase tracking-wide text-slate-700">
                      {log.level}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-slate-200 rounded">
                      {log.category}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    {log.ipAddress && (
                      <span className="text-xs text-slate-400">
                        IP: {log.ipAddress}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 break-words">
                    {log.message}
                  </p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                        Show details
                      </summary>
                      <pre className="mt-2 text-xs bg-slate-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="py-2 px-4 text-sm">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
