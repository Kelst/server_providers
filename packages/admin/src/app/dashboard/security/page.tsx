'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useSecurityStore } from '@/lib/stores/securityStore';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Ban, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function SecurityCenterPage() {
  const {
    suspiciousActivity,
    failedAttempts,
    blockedIPs,
    isLoading,
    fetchSuspiciousActivity,
    fetchFailedAttempts,
    fetchBlockedIPs,
    blockIP,
  } = useSecurityStore();

  const { toast } = useToast();
  const [days, setDays] = useState(7);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockIPAddress, setBlockIPAddress] = useState('');
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    loadSecurityData();
  }, [days]);

  const loadSecurityData = () => {
    fetchSuspiciousActivity(days);
    fetchFailedAttempts(days);
    fetchBlockedIPs();
  };

  const handleBlockIP = async () => {
    if (!blockIPAddress) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter an IP address',
      });
      return;
    }

    try {
      await blockIP(blockIPAddress, blockReason || 'Manually blocked from Security Center');
      toast({
        title: 'IP Blocked',
        description: `IP ${blockIPAddress} has been blocked`,
      });
      setShowBlockDialog(false);
      setBlockIPAddress('');
      setBlockReason('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to block IP',
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Security Center" description="Monitor and manage security threats" />

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Time Range Selector */}
        <div className="mb-6 flex items-center gap-2">
          <Label>Time Range:</Label>
          <div className="flex gap-2">
            {[7, 14, 30].map((d) => (
              <Button
                key={d}
                variant={days === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d} days
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={loadSecurityData} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="suspicious" className="space-y-4">
          <TabsList>
            <TabsTrigger value="suspicious">Suspicious Activity</TabsTrigger>
            <TabsTrigger value="failed">Failed Attempts</TabsTrigger>
            <TabsTrigger value="blocked">Blocked IPs</TabsTrigger>
          </TabsList>

          {/* Suspicious Activity Tab */}
          <TabsContent value="suspicious" className="space-y-4">
            {suspiciousActivity && (
              <>
                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{suspiciousActivity.total}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Suspicious IPs</CardTitle>
                      <Ban className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{suspiciousActivity.suspiciousIPs.length}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">High Threats</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        {suspiciousActivity.suspiciousIPs.filter((ip) => ip.threatLevel === 'HIGH').length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Suspicious IPs Table */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Suspicious IP Addresses</CardTitle>
                        <CardDescription>IPs with unusual activity patterns</CardDescription>
                      </div>
                      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Ban className="mr-2 h-4 w-4" />
                            Block IP
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Block IP Address</DialogTitle>
                            <DialogDescription>
                              Add an IP address to the system-wide blocklist
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>IP Address</Label>
                              <Input
                                value={blockIPAddress}
                                onChange={(e) => setBlockIPAddress(e.target.value)}
                                placeholder="192.168.1.1"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Reason</Label>
                              <Textarea
                                value={blockReason}
                                onChange={(e) => setBlockReason(e.target.value)}
                                placeholder="Suspicious activity detected"
                                rows={3}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
                              Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleBlockIP}>
                              Block IP
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {suspiciousActivity.suspiciousIPs.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Threat Level</TableHead>
                            <TableHead>Total Events</TableHead>
                            <TableHead>Event Types</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {suspiciousActivity.suspiciousIPs.map((ip, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">{ip.ipAddress}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    ip.threatLevel === 'HIGH'
                                      ? 'destructive'
                                      : ip.threatLevel === 'MEDIUM'
                                      ? 'default'
                                      : 'outline'
                                  }
                                >
                                  {ip.threatLevel}
                                </Badge>
                              </TableCell>
                              <TableCell>{ip.totalEvents}</TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {ip.eventTypes.map((type: string) => (
                                    <Badge key={type} variant="outline" className="text-xs">
                                      {type}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No suspicious activity detected
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Failed Attempts Tab */}
          <TabsContent value="failed" className="space-y-4">
            {failedAttempts && (
              <>
                {/* Top Offenders */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Offenders</CardTitle>
                    <CardDescription>IPs with most failed authentication attempts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {failedAttempts.topOffenders.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Failed Attempts</TableHead>
                            <TableHead>Last Attempt</TableHead>
                            <TableHead>Endpoints</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {failedAttempts.topOffenders.map((offender, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">{offender.ipAddress}</TableCell>
                              <TableCell>
                                <Badge variant="destructive">{offender.attemptCount}</Badge>
                              </TableCell>
                              <TableCell>{format(new Date(offender.lastAttempt), 'PPp')}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {offender.endpoints.join(', ')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No failed attempts recorded
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Blocked IPs Tab */}
          <TabsContent value="blocked">
            <Card>
              <CardHeader>
                <CardTitle>Blocked IP Addresses</CardTitle>
                <CardDescription>System-wide IP blocklist</CardDescription>
              </CardHeader>
              <CardContent>
                {blockedIPs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Blocked By</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blockedIPs.map((ip, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">{ip.ipAddress}</TableCell>
                          <TableCell>{ip.reason}</TableCell>
                          <TableCell>{ip.blockedBy}</TableCell>
                          <TableCell>{format(new Date(ip.blockedAt), 'PPp')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No blocked IPs
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
