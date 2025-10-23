'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { analyticsApi } from '@/lib/api/analyticsApi';
import type { RequestsOverTime, TopEndpoint, RateLimitEvent, RateLimitStats, ErrorLog } from '@/lib/types';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsPage() {
  const [requestsData, setRequestsData] = useState<RequestsOverTime[]>([]);
  const [topEndpoints, setTopEndpoints] = useState<TopEndpoint[]>([]);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [rateLimitEvents, setRateLimitEvents] = useState<RateLimitEvent[]>([]);
  const [rateLimitStats, setRateLimitStats] = useState<RateLimitStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadAnalyticsData();
  }, [period]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const [requests, endpoints, errorLogs, rateLimits, rateLimitStatsData] = await Promise.all([
        analyticsApi.getRequestsOverTime(period),
        analyticsApi.getTopEndpoints(),
        analyticsApi.getErrors(),
        analyticsApi.getRateLimitEvents(undefined, 20),
        analyticsApi.getRateLimitStats(),
      ]);

      setRequestsData(requests);
      setTopEndpoints(endpoints);
      setErrors(errorLogs);
      setRateLimitEvents(rateLimits.events);
      setRateLimitStats(rateLimitStatsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare data for charts
  const methodsData = topEndpoints.reduce((acc: any[], endpoint) => {
    const existing = acc.find((item) => item.method === endpoint.method);
    if (existing) {
      existing.count += endpoint.count;
    } else {
      acc.push({ method: endpoint.method, count: endpoint.count });
    }
    return acc;
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Analytics" description="Detailed analytics and insights" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Analytics" description="Detailed analytics and insights" />

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Requests Over Time</CardTitle>
                    <CardDescription>API request volume trends</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {(['24h', '7d', '30d'] as const).map((p) => (
                      <Badge
                        key={p}
                        variant={period === p ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setPeriod(p)}
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
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
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requests by Method</CardTitle>
                <CardDescription>Distribution of HTTP methods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={methodsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ method, percent }: any) => `${method} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {methodsData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Endpoints Tab */}
          <TabsContent value="endpoints" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Endpoints</CardTitle>
                <CardDescription>Most frequently accessed endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topEndpoints.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="endpoint" type="category" width={200} style={{ fontSize: '12px' }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Endpoint Performance</CardTitle>
                <CardDescription>Average response time per endpoint</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Avg Response Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topEndpoints.slice(0, 10).map((endpoint, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{endpoint.endpoint}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{endpoint.method}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{endpoint.count}</TableCell>
                        <TableCell className="text-right">{endpoint.avgResponseTime.toFixed(0)}ms</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Errors</CardTitle>
                <CardDescription>Latest API errors and failures</CardDescription>
              </CardHeader>
              <CardContent>
                {errors.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No errors recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errors.slice(0, 20).map((error) => (
                        <TableRow key={error.id}>
                          <TableCell className="font-mono text-xs">{error.endpoint}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{error.method}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">{error.statusCode}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{error.message}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(error.timestamp), 'PPp')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rate Limits Tab */}
          <TabsContent value="rate-limits" className="space-y-4 mt-4">
            {rateLimitStats && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{rateLimitStats.totalEvents}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Last 24h</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{rateLimitStats.last24h}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Top Offenders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{rateLimitStats.topOffenders.length}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Top Offenders</CardTitle>
                <CardDescription>Tokens with most rate limit violations</CardDescription>
              </CardHeader>
              <CardContent>
                {rateLimitStats && rateLimitStats.topOffenders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead>Rate Limit</TableHead>
                        <TableHead className="text-right">Violations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rateLimitStats.topOffenders.map((offender) => (
                        <TableRow key={offender.tokenId}>
                          <TableCell className="font-medium">{offender.projectName}</TableCell>
                          <TableCell>{offender.rateLimit}/min</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">{offender.hitCount}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No violations recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Rate Limit Events</CardTitle>
                <CardDescription>Latest rate limit violations</CardDescription>
              </CardHeader>
              <CardContent>
                {rateLimitEvents.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No events recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Limit</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rateLimitEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>{event.token?.projectName || 'Unknown'}</TableCell>
                          <TableCell className="font-mono text-xs">{event.endpoint}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              {event.requestsCount}/{event.limitValue}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{event.ipAddress}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(event.blockedAt), 'PPp')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
