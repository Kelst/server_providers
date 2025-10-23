'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker, DateRange } from '@/components/DateRangePicker';
import { analyticsApi } from '@/lib/api/analyticsApi';
import type { DashboardStats, RequestsOverTime, TopEndpoint, RateLimitEvent } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Key, AlertTriangle, TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [requestsData, setRequestsData] = useState<RequestsOverTime[]>([]);
  const [topEndpoints, setTopEndpoints] = useState<TopEndpoint[]>([]);
  const [rateLimitEvents, setRateLimitEvents] = useState<RateLimitEvent[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(subDays(new Date(), 6)),
    to: endOfDay(new Date()),
    label: 'Last 7 days',
  });

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      // Convert date range to period format for API
      const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      let period: '24h' | '7d' | '30d' = '7d';
      if (days <= 1) period = '24h';
      else if (days <= 7) period = '7d';
      else period = '30d';

      const [dashboardStats, requests, endpoints, events] = await Promise.all([
        analyticsApi.getDashboard(),
        analyticsApi.getRequestsOverTime(period),
        analyticsApi.getTopEndpoints(),
        analyticsApi.getRateLimitEvents(undefined, 5),
      ]);

      setStats(dashboardStats);
      setRequestsData(requests);
      setTopEndpoints(endpoints);
      setRateLimitEvents(events.events);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const statCards = [
    {
      title: 'Total Requests (24h)',
      value: stats?.totalRequests || 0,
      icon: Activity,
      description: 'API requests in the last 24 hours',
      trend: null,
    },
    {
      title: 'Active Tokens',
      value: stats?.activeTokens || 0,
      icon: Key,
      description: 'Currently active API tokens',
      trend: null,
    },
    {
      title: 'Error Rate',
      value: `${((stats?.errorRate || 0) * 100).toFixed(1)}%`,
      icon: AlertTriangle,
      description: 'Percentage of failed requests',
      trend: null,
    },
    {
      title: 'Rate Limit Events',
      value: stats?.rateLimitEvents || 0,
      icon: TrendingUp,
      description: 'Rate limit hits in the last 24h',
      trend: null,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" description="Overview of your API Gateway" />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Date Range Selector */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Analytics Overview</h3>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Requests Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Requests Over Time</CardTitle>
            <CardDescription>
              API requests for {dateRange.label.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={requestsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value), 'PPP')}
                    formatter={(value) => [value, 'Requests']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle>Top Endpoints</CardTitle>
              <CardDescription>Most frequently accessed endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topEndpoints.slice(0, 5).map((endpoint, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{endpoint.endpoint}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{endpoint.method}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{endpoint.count}</TableCell>
                    </TableRow>
                  ))}
                  {topEndpoints.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Rate Limit Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Rate Limit Events</CardTitle>
              <CardDescription>Latest rate limit violations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rateLimitEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No rate limit events
                  </p>
                ) : (
                  rateLimitEvents.map((event) => (
                    <div key={event.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.token?.projectName || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{event.endpoint}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(event.blockedAt), 'PPp')}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {event.requestsCount}/{event.limitValue}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
