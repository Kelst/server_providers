'use client';

import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useHealthStore } from '@/lib/stores/healthStore';
import { Loader2, CheckCircle2, AlertCircle, XCircle, Activity, Database, Server } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function HealthPage() {
  const { health, isLoading, fetchHealth } = useHealthStore();

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      healthy: 'bg-green-500 hover:bg-green-600',
      degraded: 'bg-yellow-500 hover:bg-yellow-600',
      unhealthy: 'bg-red-500 hover:bg-red-600',
    };

    return (
      <Badge className={`${colors[status] || 'bg-gray-500'} text-white`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (isLoading && !health) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="System Health"
        description="Monitor the health status of all system services"
        action={
          <Button onClick={fetchHealth} disabled={isLoading} variant="outline">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <Activity className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Overall Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(health?.status || 'unknown')}
                <CardTitle>Overall Status</CardTitle>
              </div>
              {health?.status && getStatusBadge(health.status)}
            </div>
            <CardDescription>
              Last checked: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A'}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Services Status */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* PostgreSQL */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <CardTitle>PostgreSQL</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {health?.services.postgres.status && getStatusBadge(health.services.postgres.status)}
                </div>
                {health?.services.postgres.latency !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Latency:</span>
                    <span className="text-sm font-medium">{health.services.postgres.latency}ms</span>
                  </div>
                )}
                {health?.services.postgres.connections && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Connections:</span>
                      <span className="text-sm font-medium">
                        {health.services.postgres.connections.active} active / {health.services.postgres.connections.total} total
                      </span>
                    </div>
                  </>
                )}
                {health?.services.postgres.database && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">DB Size:</span>
                      <span className="text-sm font-medium">{health.services.postgres.database.size}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tables:</span>
                      <span className="text-sm font-medium">{health.services.postgres.database.tables}</span>
                    </div>
                  </>
                )}
                {health?.services.postgres.error && (
                  <div className="text-xs text-red-500 mt-2">{health.services.postgres.error}</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Redis */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                <CardTitle>Redis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {health?.services.redis.status && getStatusBadge(health.services.redis.status)}
                </div>
                {health?.services.redis.latency !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Latency:</span>
                    <span className="text-sm font-medium">{health.services.redis.latency}ms</span>
                  </div>
                )}
                {health?.services.redis.memory && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Memory:</span>
                      <span className="text-sm font-medium">{health.services.redis.memory.used}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Fragmentation:</span>
                      <span className="text-sm font-medium">{health.services.redis.memory.fragmentation.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {health?.services.redis.stats && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Keys:</span>
                      <span className="text-sm font-medium">{health.services.redis.stats.totalKeys}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Ops/sec:</span>
                      <span className="text-sm font-medium">{health.services.redis.stats.opsPerSec.toFixed(0)}</span>
                    </div>
                  </>
                )}
                {health?.services.redis.error && (
                  <div className="text-xs text-red-500 mt-2">{health.services.redis.error}</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ABills */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <CardTitle>ABills</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {health?.services.abills.status && getStatusBadge(health.services.abills.status)}
                </div>
                {health?.services.abills.details && (
                  <div className="text-xs text-muted-foreground mt-2">{health.services.abills.details}</div>
                )}
                {health?.services.abills.error && (
                  <div className="text-xs text-red-500 mt-2">{health.services.abills.error}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Server resource usage and system details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Uptime */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-2xl font-bold">
                  {health?.system?.uptime ? formatUptime(health.system.uptime) : 'N/A'}
                </p>
              </div>

              {/* Memory Usage */}
              {health?.system?.memory && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Memory Usage</p>
                  <p className="text-2xl font-bold">
                    {health.system.memory.percentage
                      ? `${health.system.memory.percentage.toFixed(1)}%`
                      : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(health.system.memory.used)} / {formatBytes(health.system.memory.total)}
                  </p>
                </div>
              )}

              {/* CPU Usage */}
              {health?.system?.cpu && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">CPU Usage</p>
                  <p className="text-2xl font-bold">
                    {health.system.cpu.usage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {health.system.cpu.cores} cores
                  </p>
                </div>
              )}

              {/* Disk Usage */}
              {health?.system?.disk && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Disk Usage</p>
                  <p className="text-2xl font-bold">
                    {health.system.disk.percentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(health.system.disk.used)} / {formatBytes(health.system.disk.total)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Application Performance */}
        {health?.application && (
          <Card>
            <CardHeader>
              <CardTitle>Application Performance</CardTitle>
              <CardDescription>Node.js event loop and HTTP metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Event Loop Lag */}
                {health.application.eventLoop && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Event Loop Lag</p>
                    <p className="text-2xl font-bold">
                      {health.application.eventLoop.lag.toFixed(2)}ms
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {health.application.eventLoop.lag > 100 ? 'High latency detected' : 'Normal'}
                    </p>
                  </div>
                )}

                {/* Active Connections */}
                {health.application.http && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Active HTTP Connections</p>
                    <p className="text-2xl font-bold">
                      {health.application.http.activeConnections}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
