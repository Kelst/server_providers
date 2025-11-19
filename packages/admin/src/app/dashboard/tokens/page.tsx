'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTokensStore } from '@/lib/stores/tokensStore';
import { Plus, MoreVertical, Eye, Pencil, Trash2, Loader2, Search, X, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ApiScope } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
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

const SCOPE_COLORS: Record<ApiScope, string> = {
  [ApiScope.BILLING]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ApiScope.USERSIDE]: 'bg-green-100 text-green-800 border-green-200',
  [ApiScope.ANALYTICS]: 'bg-purple-100 text-purple-800 border-purple-200',
  [ApiScope.SHARED]: 'bg-orange-100 text-orange-800 border-orange-200',
  [ApiScope.EQUIPMENT]: 'bg-teal-100 text-teal-800 border-teal-200',
  [ApiScope.CABINET_INTELEKT]: 'bg-pink-100 text-pink-800 border-pink-200',
};

const ALL_SCOPES: ApiScope[] = [ApiScope.BILLING, ApiScope.USERSIDE, ApiScope.ANALYTICS, ApiScope.SHARED, ApiScope.EQUIPMENT, ApiScope.CABINET_INTELEKT];

export default function TokensPage() {
  const router = useRouter();
  const { tokens, fetchTokens, deleteToken, isLoading } = useTokensStore();
  const { toast } = useToast();

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedScopes, setSelectedScopes] = useState<ApiScope[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Filter tokens based on search and filters
  const filteredTokens = useMemo(() => {
    return tokens.filter((token) => {
      // Search filter
      const matchesSearch = token.projectName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                           token.description?.toLowerCase().includes(debouncedSearch.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' ||
                           (statusFilter === 'active' && token.isActive) ||
                           (statusFilter === 'inactive' && !token.isActive);

      // Scopes filter
      const matchesScopes = selectedScopes.length === 0 ||
                           selectedScopes.some(scope => token.scopes.includes(scope));

      return matchesSearch && matchesStatus && matchesScopes;
    });
  }, [tokens, debouncedSearch, statusFilter, selectedScopes]);

  const handleDelete = async () => {
    if (!tokenToDelete) return;

    try {
      await deleteToken(tokenToDelete);
      toast({
        title: 'Token deleted',
        description: 'The API token has been successfully deleted.',
      });
      setDeleteDialogOpen(false);
      setTokenToDelete(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete token. Please try again.',
      });
    }
  };

  const openDeleteDialog = (tokenId: string) => {
    setTokenToDelete(tokenId);
    setDeleteDialogOpen(true);
  };

  const toggleScope = (scope: ApiScope) => {
    setSelectedScopes(prev =>
      prev.includes(scope)
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedScopes([]);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || selectedScopes.length > 0;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="API Tokens"
        description="Manage API tokens for external access"
      />

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Search and Filters */}
        <div className="mb-4 space-y-4">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tokens by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button onClick={() => router.push('/dashboard/tokens/create')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Token
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="inactive">Inactive Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Scopes Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Scopes</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_SCOPES.map((scope) => (
                        <div key={scope} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filter-${scope}`}
                            checked={selectedScopes.includes(scope)}
                            onCheckedChange={() => toggleScope(scope)}
                          />
                          <label
                            htmlFor={`filter-${scope}`}
                            className="text-sm cursor-pointer capitalize"
                          >
                            {scope}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results Counter */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {filteredTokens.length === tokens.length ? (
                <>{tokens.length} {tokens.length === 1 ? 'token' : 'tokens'}</>
              ) : (
                <>Showing {filteredTokens.length} of {tokens.length} tokens</>
              )}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                {tokens.length === 0 ? (
                  <>
                    <p className="text-lg font-medium mb-2">No tokens yet</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first API token to get started
                    </p>
                    <Button onClick={() => router.push('/dashboard/tokens/create')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Token
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">No matching tokens</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Try adjusting your search or filters
                    </p>
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Rate Limit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium">{token.projectName}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {token.scopes.map((scope) => (
                            <Badge
                              key={scope}
                              variant="outline"
                              className={SCOPE_COLORS[scope]}
                            >
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{token.rateLimit}/min</TableCell>
                      <TableCell>
                        {token.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(token.createdAt), 'PPP')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/tokens/${token.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/tokens/${token.id}`)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(token.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the API token
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
