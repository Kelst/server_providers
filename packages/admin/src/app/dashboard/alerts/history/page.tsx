'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAlertsStore } from '@/lib/stores/alertsStore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, AlertTriangle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Severity } from '@/lib/api/alertRulesApi';

const severityColors = {
  INFO: 'bg-blue-500',
  WARNING: 'bg-yellow-500',
  CRITICAL: 'bg-orange-500',
  EMERGENCY: 'bg-red-500',
};

export default function AlertsHistoryPage() {
  const {
    alerts,
    recentAlerts,
    stats,
    pagination,
    isLoading,
    fetchHistory,
    fetchRecent,
    fetchStats,
    acknowledgeAlert,
    resolveAlert,
  } = useAlertsStore();

  const { toast } = useToast();
  const [severityFilter, setSeverityFilter] = useState<Severity | 'ALL'>('ALL');
  const [resolvedFilter, setResolvedFilter] = useState<'all' | 'resolved' | 'unresolved'>('all');

  useEffect(() => {
    loadAlerts();
    fetchRecent(5);
    fetchStats(7);
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [severityFilter, resolvedFilter]);

  const loadAlerts = () => {
    const params: any = {
      limit: 20,
      offset: 0,
    };

    if (severityFilter !== 'ALL') {
      params.severity = severityFilter;
    }

    if (resolvedFilter === 'resolved') {
      params.resolved = true;
    } else if (resolvedFilter === 'unresolved') {
      params.resolved = false;
    }

    fetchHistory(params);
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      toast({
        title: 'Alert acknowledged',
        description: 'The alert has been marked as acknowledged',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to acknowledge alert',
      });
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveAlert(id);
      toast({
        title: 'Alert resolved',
        description: 'The alert has been marked as resolved',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to resolve alert',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Alerts History"
        description="View and manage triggered alerts"
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Statistics Overview */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.alerts.total}</div>
                  <p className="text-xs text-muted-foreground">Last {stats.period.days} days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">
                    {stats.alerts.unresolved}
                  </div>
                  <p className="text-xs text-muted-foreground">Requires attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{stats.alerts.resolved}</div>
                  <p className="text-xs text-muted-foreground">Successfully handled</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.rules.active}</div>
                  <p className="text-xs text-muted-foreground">
                    of {stats.rules.total} total rules
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Unresolved Alerts */}
          {recentAlerts.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <CardTitle>Recent Unresolved Alerts</CardTitle>
                </div>
                <CardDescription>These alerts require your attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={severityColors[alert.severity]}>{alert.severity}</Badge>
                          <span className="font-medium">{alert.ruleName}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.metric}: {alert.currentValue.toFixed(2)} (threshold:{' '}
                          {alert.threshold})
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(alert.sentAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        {!alert.acknowledgedBy && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleResolve(alert.id)}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alerts History Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Alerts</CardTitle>
                  <CardDescription>Complete history of triggered alerts</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={severityFilter}
                    onValueChange={(value) => setSeverityFilter(value as Severity | 'ALL')}
                  >
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Severities</SelectItem>
                      <SelectItem value={Severity.INFO}>Info</SelectItem>
                      <SelectItem value={Severity.WARNING}>Warning</SelectItem>
                      <SelectItem value={Severity.CRITICAL}>Critical</SelectItem>
                      <SelectItem value={Severity.EMERGENCY}>Emergency</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={resolvedFilter}
                    onValueChange={(value) => setResolvedFilter(value as 'all' | 'resolved' | 'unresolved')}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Alerts</SelectItem>
                      <SelectItem value="unresolved">Unresolved</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No alerts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="text-sm">{formatDate(alert.sentAt)}</TableCell>
                        <TableCell className="font-medium">{alert.ruleName}</TableCell>
                        <TableCell>
                          <Badge className={severityColors[alert.severity]}>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{alert.metric}</TableCell>
                        <TableCell className="text-sm">
                          {alert.currentValue.toFixed(2)}
                          <span className="text-muted-foreground"> / {alert.threshold}</span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {alert.resolved ? (
                              <Badge variant="secondary">
                                <Check className="h-3 w-3 mr-1" />
                                Resolved
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Active</Badge>
                            )}
                            {alert.acknowledgedBy && !alert.resolved && (
                              <Badge variant="outline" className="block w-fit">
                                Acknowledged
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!alert.acknowledgedBy && !alert.resolved && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAcknowledge(alert.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {!alert.resolved && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResolve(alert.id)}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {pagination.offset + 1} to{' '}
                    {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
                    {pagination.total} alerts
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pagination.offset === 0}
                      onClick={() =>
                        fetchHistory({
                          limit: pagination.limit,
                          offset: Math.max(0, pagination.offset - pagination.limit),
                        })
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!pagination.hasMore}
                      onClick={() =>
                        fetchHistory({
                          limit: pagination.limit,
                          offset: pagination.offset + pagination.limit,
                        })
                      }
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
