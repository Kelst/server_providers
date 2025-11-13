'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useTokensStore } from '@/lib/stores/tokensStore';
import { tokensApi } from '@/lib/api/tokensApi';
import { analyticsApi } from '@/lib/api/analyticsApi';
import { ApiScope, TokenStats, TokenAuditLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Save, Eye, EyeOff, Copy, Check, Key } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SecurityTab } from '@/components/tokens/SecurityTab';

const SCOPES = [
  { value: ApiScope.BILLING, label: 'Billing', description: 'Access billing endpoints' },
  { value: ApiScope.USERSIDE, label: 'Userside', description: 'Access user-related endpoints' },
  { value: ApiScope.ANALYTICS, label: 'Analytics', description: 'Access analytics endpoints' },
  { value: ApiScope.SHARED, label: 'Shared', description: 'Access shared API endpoints' },
  { value: ApiScope.EQUIPMENT, label: 'Equipment', description: 'Access equipment endpoints' },
];

export default function TokenDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  const { selectedToken, fetchToken, updateToken, isLoading } = useTokensStore();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<ApiScope[]>([]);
  const [rateLimit, setRateLimit] = useState('100');
  const [isActive, setIsActive] = useState(true);

  const [stats, setStats] = useState<TokenStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<TokenAuditLog[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tokenId) {
      fetchToken(tokenId);
    }
  }, [tokenId, fetchToken]);

  useEffect(() => {
    if (selectedToken) {
      setProjectName(selectedToken.projectName);
      setDescription(selectedToken.description || '');
      setSelectedScopes(selectedToken.scopes);
      setRateLimit(selectedToken.rateLimit.toString());
      setIsActive(selectedToken.isActive);
    }
  }, [selectedToken]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await tokensApi.getStats(tokenId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const data = await analyticsApi.getAuditLog(tokenId);
      setAuditLogs(data.logs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoadingAudit(false);
    }
  };

  const toggleScope = (scope: ApiScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSave = async () => {
    if (selectedScopes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select at least one scope',
      });
      return;
    }

    try {
      await updateToken(tokenId, {
        projectName,
        description: description || undefined,
        scopes: selectedScopes,
        rateLimit: parseInt(rateLimit),
        isActive,
      });

      toast({
        title: 'Token updated',
        description: 'API token has been successfully updated',
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update token. Please try again.',
      });
    }
  };

  const handleCopyToken = async () => {
    if (!selectedToken?.token) return;

    try {
      await navigator.clipboard.writeText(selectedToken.token);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Token copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy token',
      });
    }
  };

  if (!selectedToken && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-lg font-medium mb-2">Token not found</p>
        <Button onClick={() => router.push('/dashboard/tokens')}>Go to Tokens</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={selectedToken.projectName} description="Token details and settings" />

      <div className="flex-1 p-6 overflow-y-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/tokens')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tokens
        </Button>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="statistics" onClick={loadStats}>Statistics</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="audit" onClick={loadAuditLogs}>Audit Log</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Token Information</CardTitle>
                    <CardDescription>View and edit token details</CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)}>Edit</Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                        ) : (
                          <><Save className="mr-2 h-4 w-4" />Save</>
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  {isEditing ? (
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">{selectedToken.projectName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {selectedToken.description || 'No description'}
                    </p>
                  )}
                </div>

                {/* Token Value Section */}
                {selectedToken.token && (
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        <Label>API Token</Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? (
                          <><EyeOff className="h-4 w-4 mr-2" />Hide</>
                        ) : (
                          <><Eye className="h-4 w-4 mr-2" />Show</>
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type={showToken ? 'text' : 'password'}
                        value={selectedToken.token}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyToken}
                        disabled={copied}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Keep this token secure. Anyone with this token can access your API with the granted scopes.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Scopes</Label>
                  {isEditing ? (
                    <div className="space-y-2">
                      {SCOPES.map((scope) => (
                        <div key={scope.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={scope.value}
                            checked={selectedScopes.includes(scope.value)}
                            onCheckedChange={() => toggleScope(scope.value)}
                          />
                          <label htmlFor={scope.value} className="text-sm cursor-pointer">
                            {scope.label} - {scope.description}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {selectedToken.scopes.map((scope) => (
                        <Badge key={scope} variant="outline">{scope}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Rate Limit (per minute)</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={rateLimit}
                      onChange={(e) => setRateLimit(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">{selectedToken.rateLimit}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isActive"
                        checked={isActive}
                        onCheckedChange={(checked) => setIsActive(checked as boolean)}
                      />
                      <label htmlFor="isActive" className="text-sm cursor-pointer">
                        Active
                      </label>
                    </div>
                  ) : (
                    <div>
                      {selectedToken.isActive ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
                  <p>Created: {format(new Date(selectedToken.createdAt), 'PPpp')}</p>
                  <p>Last Updated: {format(new Date(selectedToken.updatedAt), 'PPpp')}</p>
                  {selectedToken.expiresAt && (
                    <p>Expires: {format(new Date(selectedToken.expiresAt), 'PPpp')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>Token Statistics</CardTitle>
                <CardDescription>Usage statistics for this token</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : stats ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                      <p className="text-2xl font-bold">{stats.totalRequests || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold">{((stats.successRate || 0) * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                      <p className="text-2xl font-bold">{((stats.errorRate || 0) * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                      <p className="text-2xl font-bold">{(stats.avgResponseTime || 0).toFixed(0)}ms</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No statistics available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>History of changes to this token</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAudit ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : auditLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Changes</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge>{log.action}</Badge>
                          </TableCell>
                          <TableCell>
                            {log.admin ? `${log.admin.firstName} ${log.admin.lastName}` : 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <pre className="text-xs">{JSON.stringify(log.changes, null, 2)}</pre>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(log.createdAt), 'PPp')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No audit logs available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <SecurityTab tokenId={tokenId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
