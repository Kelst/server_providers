'use client';

import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRealtimeStore } from '@/lib/stores/realtimeStore';
import { Activity, TrendingUp, AlertCircle, Clock, Play, Pause } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function MonitoringPage() {
  const { metrics, isAutoRefresh, startAutoRefresh, stopAutoRefresh } = useRealtimeStore();

  useEffect(() => {
    // Start auto-refresh when component mounts
    startAutoRefresh();

    // Cleanup: stop auto-refresh when component unmounts
    return () => {
      stopAutoRefresh();
    };
  }, [startAutoRefresh, stopAutoRefresh]);

  const toggleAutoRefresh = () => {
    if (isAutoRefresh) {
      stopAutoRefresh();
    } else {
      startAutoRefresh();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Real-time Monitoring"
        description="Live API metrics updated every 5 seconds"
      />

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Control Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <Badge variant={isAutoRefresh ? 'default' : 'outline'}>
              {isAutoRefresh ? 'Live' : 'Paused'}
            </Badge>
            {metrics && (
              <span className="text-sm text-muted-foreground">
                Last updated: {format(new Date(metrics.lastUpdated), 'HH:mm:ss')}
              </span>
            )}
          </div>
          <Button
            variant={isAutoRefresh ? 'outline' : 'default'}
            onClick={toggleAutoRefresh}
          >
            {isAutoRefresh ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </>
            )}
          </Button>
        </div>

        {/* Summary Cards */}
        {metrics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requests/Second</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.summary.requestsPerSecond}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.summary.totalRequests} total in last 5 min
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Errors/Second</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {metrics.summary.errorsPerSecond}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.summary.totalErrors} total errors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.summary.avgResponseTime}ms</div>
                <p className="text-xs text-muted-foreground">Average across all requests</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tokens</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.summary.activeTokens}</div>
                <p className="text-xs text-muted-foreground">With recent activity</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Timeline Chart */}
        {metrics && metrics.timeline.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Request Timeline (Last 5 Minutes)</CardTitle>
              <CardDescription>Requests and errors per minute</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value), 'HH:mm:ss')}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    name="Requests"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="errors"
                    stroke="hsl(var(--destructive))"
                    name="Errors"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Active Tokens */}
        {metrics && metrics.activeTokens.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Tokens</CardTitle>
              <CardDescription>Tokens with recent activity in the last 5 minutes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.activeTokens.map((token: any) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{token.projectName}</p>
                      <p className="text-sm text-muted-foreground">ID: {token.id.substring(0, 8)}...</p>
                    </div>
                    <Badge variant="outline">{token._count.requests} requests</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!metrics && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Loading real-time data...</p>
                <p className="text-sm text-muted-foreground">
                  Waiting for first update (refreshes every 5 seconds)
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
