'use client';

import { useState, useEffect } from 'react';
import { analyticsApi } from '@/lib/api/analyticsApi';
import type {
  CacheStats,
  CachePattern,
} from '@/types/cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, RefreshCw, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CacheManagement() {
  const { toast } = useToast();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [flushing, setFlushing] = useState(false);
  const [invalidating, setInvalidating] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Common cache patterns
  const cachePatterns: CachePattern[] = [
    {
      name: 'All Analytics',
      pattern: 'analytics:*',
      description: 'Clear all analytics cache',
    },
    {
      name: 'Dashboard Stats',
      pattern: 'analytics:dashboard:*',
      description: 'Clear dashboard statistics',
    },
    {
      name: 'Realtime Metrics',
      pattern: 'analytics:realtime:*',
      description: 'Clear real-time metrics',
    },
    {
      name: 'Top Endpoints',
      pattern: 'analytics:top-endpoints:*',
      description: 'Clear top endpoints cache',
    },
    {
      name: 'Performance Metrics',
      pattern: 'analytics:performance:*',
      description: 'Clear performance metrics',
    },
    {
      name: 'All Settings',
      pattern: 'settings:*',
      description: 'Clear admin settings cache',
    },
    {
      name: 'Token Validation',
      pattern: 'token:validation:*',
      description: 'Clear token validation cache',
    },
  ];

  const loadStats = async () => {
    try {
      const data = await analyticsApi.getCacheStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cache statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();

    if (autoRefresh) {
      const interval = setInterval(loadStats, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh]);

  const handleFlushCache = async () => {
    if (!confirm('Are you sure you want to flush all analytics cache? This cannot be undone.')) {
      return;
    }

    setFlushing(true);
    try {
      const result = await analyticsApi.flushCache();
      toast({
        title: 'Success',
        description: `Cache flushed successfully. ${result.keysDeleted} keys deleted.`,
      });
      await loadStats();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to flush cache',
        variant: 'destructive',
      });
    } finally {
      setFlushing(false);
    }
  };

  const handleInvalidatePattern = async () => {
    if (!selectedPattern) {
      toast({
        title: 'Error',
        description: 'Please select a pattern to invalidate',
        variant: 'destructive',
      });
      return;
    }

    setInvalidating(true);
    try {
      const result = await analyticsApi.invalidateCachePattern(selectedPattern);
      toast({
        title: 'Success',
        description: `Pattern invalidated successfully. ${result.keysDeleted} keys deleted.`,
      });
      await loadStats();
      setSelectedPattern('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to invalidate cache pattern',
        variant: 'destructive',
      });
    } finally {
      setInvalidating(false);
    }
  };

  const getPerformanceStatus = (hitRate: number) => {
    if (hitRate >= 70) return { label: 'Excellent', color: 'bg-green-500' };
    if (hitRate >= 50) return { label: 'Good', color: 'bg-yellow-500' };
    return { label: 'Poor', color: 'bg-red-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load cache statistics</AlertDescription>
      </Alert>
    );
  }

  const performanceStatus = getPerformanceStatus(stats.hitRate);

  return (
    <div className="space-y-6">
      {/* Cache Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hitRate.toFixed(1)}%</div>
            <Badge className={`mt-2 ${performanceStatus.color}`}>
              {performanceStatus.label}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hits</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Served from cache</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Misses</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.misses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Fetched from database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Since last restart</p>
          </CardContent>
        </Card>
      </div>

      {/* Cache Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
          <CardDescription>
            Manage Redis cache for analytics data and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Flush All Cache */}
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h4 className="text-sm font-medium mb-1">Flush All Analytics Cache</h4>
              <p className="text-sm text-muted-foreground">
                Clear all analytics cache entries. Use with caution as this will force all
                subsequent requests to hit the database until cache is rebuilt.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleFlushCache}
              disabled={flushing}
            >
              {flushing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Flushing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Flush All
                </>
              )}
            </Button>
          </div>

          {/* Invalidate Specific Pattern */}
          <div className="border-t pt-6">
            <h4 className="text-sm font-medium mb-3">Invalidate Specific Pattern</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Clear cache entries matching a specific pattern. Select from common patterns below.
            </p>
            <div className="flex gap-2">
              <Select value={selectedPattern} onValueChange={setSelectedPattern}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a cache pattern..." />
                </SelectTrigger>
                <SelectContent>
                  {cachePatterns.map((pattern) => (
                    <SelectItem key={pattern.pattern} value={pattern.pattern}>
                      <div className="flex flex-col">
                        <span className="font-medium">{pattern.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {pattern.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleInvalidatePattern}
                disabled={!selectedPattern || invalidating}
              >
                {invalidating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Invalidating...
                  </>
                ) : (
                  'Invalidate'
                )}
              </Button>
            </div>
          </div>

          {/* Auto Refresh Toggle */}
          <div className="border-t pt-6 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Auto Refresh</h4>
              <p className="text-sm text-muted-foreground">
                Automatically refresh statistics every 10 seconds
              </p>
            </div>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              size="sm"
            >
              {autoRefresh ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Recommendations */}
      {stats.hitRate < 50 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cache hit rate is below 50%. Consider increasing cache TTL or enabling pre-warming
            to improve performance.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
