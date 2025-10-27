'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAlertRulesStore } from '@/lib/stores/alertRulesStore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Power, PowerOff, Trash2, TestTube, Edit } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertRule, AlertType, Severity, CreateAlertRuleDto } from '@/lib/api/alertRulesApi';

const severityColors = {
  INFO: 'bg-blue-500',
  WARNING: 'bg-yellow-500',
  CRITICAL: 'bg-orange-500',
  EMERGENCY: 'bg-red-500',
};

const METRIC_OPTIONS = [
  { value: 'errorRate', label: 'Error Rate (%)' },
  { value: 'avgResponseTime', label: 'Avg Response Time (ms)' },
  { value: 'requestsPerSecond', label: 'Requests/Second' },
  { value: 'cpuUsage', label: 'CPU Usage (%)' },
  { value: 'memoryUsage', label: 'Memory Usage (%)' },
  { value: 'diskUsage', label: 'Disk Usage (%)' },
  { value: 'postgresLatency', label: 'PostgreSQL Latency (ms)' },
  { value: 'redisLatency', label: 'Redis Latency (ms)' },
  { value: 'databaseConnectionsPercentage', label: 'DB Connections (%)' },
  { value: 'eventLoopLag', label: 'Event Loop Lag (ms)' },
  { value: 'activeConnections', label: 'Active Connections' },
];

export default function AlertRulesPage() {
  const {
    rules,
    templates,
    isLoading,
    fetchRules,
    fetchTemplates,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    testRule,
  } = useAlertRulesStore();

  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateAlertRuleDto>>({
    name: '',
    description: '',
    type: AlertType.CUSTOM,
    metric: 'errorRate',
    threshold: 5,
    comparisonOp: '>',
    windowMinutes: 5,
    severity: Severity.WARNING,
    cooldownMinutes: 10,
    notifyTelegram: true,
    notifyEmail: false,
    notifyWebhook: false,
    webhookUrl: '',
    notifyOnRecovery: true,
    isActive: true,
  });

  useEffect(() => {
    fetchRules();
    fetchTemplates();
  }, [fetchRules, fetchTemplates]);

  const handleCreateRule = async () => {
    try {
      await createRule(formData as CreateAlertRuleDto);
      toast({
        title: 'Rule created',
        description: 'Alert rule created successfully',
      });
      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create alert rule',
      });
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;
    try {
      await updateRule(editingRule.id, formData);
      toast({
        title: 'Rule updated',
        description: 'Alert rule updated successfully',
      });
      setEditingRule(null);
      resetForm();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update alert rule',
      });
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleRule(id);
      toast({
        title: 'Rule toggled',
        description: 'Alert rule status changed',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to toggle rule',
      });
    }
  };

  const handleTest = async (id: string) => {
    try {
      await testRule(id);
      toast({
        title: 'Test alert sent',
        description: 'Check your notification channels',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send test alert',
      });
    }
  };

  const handleDelete = async () => {
    if (!ruleToDelete) return;
    try {
      await deleteRule(ruleToDelete);
      toast({
        title: 'Rule deleted',
        description: 'Alert rule deleted successfully',
      });
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete rule',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: AlertType.CUSTOM,
      metric: 'errorRate',
      threshold: 5,
      comparisonOp: '>',
      windowMinutes: 5,
      severity: Severity.WARNING,
      cooldownMinutes: 10,
      notifyTelegram: true,
      notifyEmail: false,
      notifyWebhook: false,
      webhookUrl: '',
      notifyOnRecovery: true,
      isActive: true,
    });
  };

  const openEditDialog = (rule: AlertRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      type: rule.type,
      metric: rule.metric,
      threshold: rule.threshold,
      comparisonOp: rule.comparisonOp,
      windowMinutes: rule.windowMinutes,
      severity: rule.severity,
      cooldownMinutes: rule.cooldownMinutes,
      notifyTelegram: rule.notifyTelegram,
      notifyEmail: rule.notifyEmail,
      notifyWebhook: rule.notifyWebhook,
      webhookUrl: rule.webhookUrl || '',
      notifyOnRecovery: rule.notifyOnRecovery,
      isActive: rule.isActive,
    });
  };

  const loadTemplate = (templateIndex: number) => {
    const template = templates[templateIndex];
    setFormData({
      ...formData,
      name: template.name,
      description: template.description,
      type: template.type,
      metric: template.metric,
      threshold: template.threshold,
      comparisonOp: template.comparisonOp,
      windowMinutes: template.windowMinutes,
      severity: template.severity,
      cooldownMinutes: template.cooldownMinutes,
    });
  };

  if (isLoading && rules.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Alert Rules"
        description="Configure and manage alert rules"
        action={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Rule
          </Button>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle>Active Alert Rules</CardTitle>
            <CardDescription>
              Monitor system metrics and get notified when thresholds are exceeded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No alert rules configured yet
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>{rule.metric}</TableCell>
                      <TableCell>
                        {rule.comparisonOp} {rule.threshold}
                      </TableCell>
                      <TableCell>
                        <Badge className={severityColors[rule.severity]}>{rule.severity}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggle(rule.id)}
                          >
                            {rule.isActive ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTest(rule.id)}
                          >
                            <TestTube className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRuleToDelete(rule.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialogOpen || !!editingRule}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingRule(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingRule && templates.length > 0 && (
              <div className="space-y-2">
                <Label>Use Template</Label>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => loadTemplate(index)}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="metric">Metric</Label>
                <Select
                  value={formData.metric}
                  onValueChange={(value) => setFormData({ ...formData, metric: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={formData.threshold}
                  onChange={(e) =>
                    setFormData({ ...formData, threshold: parseFloat(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="comparisonOp">Operator</Label>
                <Select
                  value={formData.comparisonOp}
                  onValueChange={(value) => setFormData({ ...formData, comparisonOp: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">Greater than (&gt;)</SelectItem>
                    <SelectItem value="<">Less than (&lt;)</SelectItem>
                    <SelectItem value=">=">Greater or equal (&gt;=)</SelectItem>
                    <SelectItem value="<=">Less or equal (&lt;=)</SelectItem>
                    <SelectItem value="==">Equal (==)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="windowMinutes">Window (min)</Label>
                <Input
                  id="windowMinutes"
                  type="number"
                  value={formData.windowMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, windowMinutes: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cooldownMinutes">Cooldown (min)</Label>
                <Input
                  id="cooldownMinutes"
                  type="number"
                  value={formData.cooldownMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, cooldownMinutes: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value as Severity })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Severity.INFO}>Info</SelectItem>
                  <SelectItem value={Severity.WARNING}>Warning</SelectItem>
                  <SelectItem value={Severity.CRITICAL}>Critical</SelectItem>
                  <SelectItem value={Severity.EMERGENCY}>Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Notifications</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifyTelegram"
                  checked={formData.notifyTelegram}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, notifyTelegram: checked as boolean })
                  }
                />
                <label htmlFor="notifyTelegram" className="text-sm">
                  Telegram
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifyOnRecovery"
                  checked={formData.notifyOnRecovery}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, notifyOnRecovery: checked as boolean })
                  }
                />
                <label htmlFor="notifyOnRecovery" className="text-sm">
                  Send recovery notification
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked as boolean })
                  }
                />
                <label htmlFor="isActive" className="text-sm">
                  Activate immediately
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={editingRule ? handleUpdateRule : handleCreateRule}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingRule ? (
                  'Update Rule'
                ) : (
                  'Create Rule'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setEditingRule(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this alert rule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
