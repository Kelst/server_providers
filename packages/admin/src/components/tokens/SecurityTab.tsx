'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { tokensApi } from '@/lib/api/tokensApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, RefreshCw, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface SecurityTabProps {
  tokenId: string;
}

export function SecurityTab({ tokenId }: SecurityTabProps) {
  const { toast } = useToast();
  const [ipRules, setIpRules] = useState<any[]>([]);
  const [rotationHistory, setRotationHistory] = useState<any[]>([]);
  const [securityLog, setSecurityLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // IP Rule Dialog State
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleType, setNewRuleType] = useState<'WHITELIST' | 'BLACKLIST'>('WHITELIST');
  const [newRuleIP, setNewRuleIP] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');

  // Token Regeneration Dialog State
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [regenerateReason, setRegenerateReason] = useState('');
  const [newToken, setNewToken] = useState('');

  useEffect(() => {
    loadSecurityData();
  }, [tokenId]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const [rules, history, log] = await Promise.all([
        tokensApi.getIpRules(tokenId),
        tokensApi.getRotationHistory(tokenId),
        tokensApi.getSecurityLog(tokenId),
      ]);
      setIpRules(rules);
      setRotationHistory(history);
      setSecurityLog(log);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIpRule = async () => {
    if (!newRuleIP) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter an IP address',
      });
      return;
    }

    try {
      await tokensApi.createIpRule(tokenId, {
        type: newRuleType,
        ipAddress: newRuleIP,
        description: newRuleDescription || undefined,
      });

      toast({
        title: 'IP Rule Added',
        description: `${newRuleType} rule for ${newRuleIP} has been created`,
      });

      setShowAddRule(false);
      setNewRuleIP('');
      setNewRuleDescription('');
      loadSecurityData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add IP rule',
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await tokensApi.deleteIpRule(tokenId, ruleId);
      toast({
        title: 'IP Rule Deleted',
        description: 'The IP rule has been removed',
      });
      loadSecurityData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete IP rule',
      });
    }
  };

  const handleRegenerateToken = async () => {
    try {
      const response = await tokensApi.regenerate(tokenId, regenerateReason || undefined);
      setNewToken(response.token);
      toast({
        title: 'Token Regenerated',
        description: 'New token generated successfully. Copy it now!',
      });
      loadSecurityData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to regenerate token',
      });
    }
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(newToken);
      toast({
        title: 'Copied!',
        description: 'New token copied to clipboard',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy token',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Token Regeneration Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Token Regeneration
              </CardTitle>
              <CardDescription>Rotate token for security purposes</CardDescription>
            </div>
            <Dialog open={showRegenerate} onOpenChange={setShowRegenerate}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate Token
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Regenerate API Token</DialogTitle>
                  <DialogDescription>
                    This will generate a new token value. The old token will stop working immediately.
                  </DialogDescription>
                </DialogHeader>
                {newToken ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">New token generated! Copy it now:</p>
                        <div className="flex gap-2">
                          <Input value={newToken} readOnly className="font-mono text-xs" />
                          <Button onClick={handleCopyToken}>Copy</Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This token will not be shown again.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="space-y-4">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          The current token will stop working immediately after regeneration.
                        </AlertDescription>
                      </Alert>
                      <div className="space-y-2">
                        <Label>Reason (Optional)</Label>
                        <Textarea
                          value={regenerateReason}
                          onChange={(e) => setRegenerateReason(e.target.value)}
                          placeholder="e.g., Token compromised, security rotation"
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowRegenerate(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleRegenerateToken} variant="destructive">
                        Regenerate Token
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {rotationHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Rotated By</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rotationHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(new Date(item.rotatedAt), 'PPp')}</TableCell>
                    <TableCell>{item.rotator.email}</TableCell>
                    <TableCell className="text-muted-foreground">{item.reason || 'No reason provided'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No rotation history</p>
          )}
        </CardContent>
      </Card>

      {/* IP Rules Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                IP Access Rules
              </CardTitle>
              <CardDescription>Manage whitelist and blacklist IP addresses</CardDescription>
            </div>
            <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add IP Rule</DialogTitle>
                  <DialogDescription>
                    Add an IP address to whitelist or blacklist
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Rule Type</Label>
                    <Select value={newRuleType} onValueChange={(value: any) => setNewRuleType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WHITELIST">Whitelist (Allow only this IP)</SelectItem>
                        <SelectItem value="BLACKLIST">Blacklist (Block this IP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>IP Address</Label>
                    <Input
                      value={newRuleIP}
                      onChange={(e) => setNewRuleIP(e.target.value)}
                      placeholder="192.168.1.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Input
                      value={newRuleDescription}
                      onChange={(e) => setNewRuleDescription(e.target.value)}
                      placeholder="e.g., Office IP"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddRule(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddIpRule}>Add Rule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {ipRules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ipRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Badge variant={rule.type === 'WHITELIST' ? 'default' : 'destructive'}>
                        {rule.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{rule.ipAddress}</TableCell>
                    <TableCell className="text-muted-foreground">{rule.description || '-'}</TableCell>
                    <TableCell>{format(new Date(rule.createdAt), 'PP')}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No IP rules configured</p>
          )}
        </CardContent>
      </Card>

      {/* Security Events Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Security Events
          </CardTitle>
          <CardDescription>Recent blocked requests and security alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {securityLog.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {securityLog.slice(0, 10).map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Badge variant="outline">{event.eventType}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{event.ipAddress}</TableCell>
                    <TableCell className="text-sm">{event.endpoint || '-'}</TableCell>
                    <TableCell>{format(new Date(event.createdAt), 'PPp')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No security events</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
