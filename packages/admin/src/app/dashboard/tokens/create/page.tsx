'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useTokensStore } from '@/lib/stores/tokensStore';
import { ApiScope } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Copy, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SCOPES = [
  { value: ApiScope.BILLING, label: 'Billing', description: 'Access billing endpoints' },
  { value: ApiScope.USERSIDE, label: 'Userside', description: 'Access user-related endpoints' },
  { value: ApiScope.ANALYTICS, label: 'Analytics', description: 'Access analytics endpoints' },
  { value: ApiScope.SHARED, label: 'Shared', description: 'Access shared API endpoints' },
  { value: ApiScope.EQUIPMENT, label: 'Equipment', description: 'Access equipment endpoints' },
  { value: ApiScope.CABINET_INTELEKT, label: 'Cabinet Intelekt', description: 'Access cabinet intelekt (provider info) endpoints' },
];

export default function CreateTokenPage() {
  const router = useRouter();
  const { createToken, isLoading } = useTokensStore();
  const { toast } = useToast();

  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<ApiScope[]>([]);
  const [rateLimit, setRateLimit] = useState('100');
  const [expiresAt, setExpiresAt] = useState('');

  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleScope = (scope: ApiScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedScopes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select at least one scope',
      });
      return;
    }

    try {
      const token = await createToken({
        projectName,
        description: description || undefined,
        scopes: selectedScopes,
        rateLimit: parseInt(rateLimit),
        expiresAt: expiresAt || undefined,
      });

      setCreatedToken(token.token);

      toast({
        title: 'Token created',
        description: 'API token has been successfully created',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create token. Please try again.',
      });
    }
  };

  const copyToken = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied',
        description: 'Token copied to clipboard',
      });
    }
  };

  // Show success screen with token
  if (createdToken) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Token Created" description="Your new API token" />

        <div className="flex-1 p-6 overflow-y-auto">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle2 className="h-6 w-6" />
                <CardTitle>Success!</CardTitle>
              </div>
              <CardDescription>
                Your API token has been created. Make sure to copy it now as you won't be able to see it again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription className="font-mono text-sm break-all">
                  {createdToken}
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={copyToken} className="flex-1">
                  {copied ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Token
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/tokens')}
                >
                  Go to Tokens
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Create API Token" description="Generate a new API token" />

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

        <Card className="max-w-2xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  placeholder="My Awesome Project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description for this token"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label>Scopes *</Label>
                <div className="space-y-3">
                  {SCOPES.map((scope) => (
                    <div key={scope.value} className="flex items-start space-x-3">
                      <Checkbox
                        id={scope.value}
                        checked={selectedScopes.includes(scope.value)}
                        onCheckedChange={() => toggleScope(scope.value)}
                        disabled={isLoading}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={scope.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {scope.label}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {scope.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rateLimit">Rate Limit (requests per minute)</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  min="1"
                  placeholder="100"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no expiration
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Token'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/tokens')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
