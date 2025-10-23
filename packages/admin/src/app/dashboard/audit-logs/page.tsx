'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/Pagination';
import { analyticsApi } from '@/lib/api/analyticsApi';
import { useTokensStore } from '@/lib/stores/tokensStore';
import { Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditLogsPage() {
  const { tokens, fetchTokens } = useTokensStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  useEffect(() => {
    loadAuditLogs();
  }, [currentPage, pageSize, selectedToken, selectedAction]);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const response = await analyticsApi.getAllAuditLogs({
        page: currentPage,
        limit: pageSize,
        tokenId: selectedToken !== 'all' ? selectedToken : undefined,
        action: selectedAction !== 'all' ? selectedAction : undefined,
      });

      setLogs(response.data);
      setTotalItems(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page
  };

  const handleTokenFilterChange = (value: string) => {
    setSelectedToken(value);
    setCurrentPage(1); // Reset to first page
  };

  const handleActionFilterChange = (value: string) => {
    setSelectedAction(value);
    setCurrentPage(1); // Reset to first page
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      created: 'bg-green-100 text-green-800 border-green-200',
      updated: 'bg-blue-100 text-blue-800 border-blue-200',
      deleted: 'bg-red-100 text-red-800 border-red-200',
      activated: 'bg-purple-100 text-purple-800 border-purple-200',
      deactivated: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Audit Logs" description="View all token changes and activities" />

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Filter by Token</label>
                <Select value={selectedToken} onValueChange={handleTokenFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All tokens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tokens</SelectItem>
                    {tokens.map((token) => (
                      <SelectItem key={token.id} value={token.id}>
                        {token.projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Filter by Action</label>
                <Select value={selectedAction} onValueChange={handleActionFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="updated">Updated</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                    <SelectItem value="activated">Activated</SelectItem>
                    <SelectItem value="deactivated">Deactivated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Timeline */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No audit logs found</p>
                <p className="text-sm text-muted-foreground">
                  {totalItems === 0
                    ? 'No activity has been recorded yet'
                    : 'Try adjusting your filters'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                        <h3 className="font-medium">{log.token?.projectName || 'Unknown Token'}</h3>
                        <span className="text-sm text-muted-foreground">
                          by {log.admin ? `${log.admin.firstName} ${log.admin.lastName}` : 'Unknown'}
                        </span>
                      </div>

                      {/* Changes */}
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Changes:</p>
                          <div className="space-y-1">
                            {Object.entries(log.changes).map(([key, value]: [string, any]) => (
                              <div key={key} className="text-sm">
                                <span className="font-medium">{key}:</span>
                                {value && value.old !== undefined && value.new !== undefined ? (
                                  <span className="ml-2">
                                    <span className="text-red-600">{JSON.stringify(value.old)}</span>
                                    {' → '}
                                    <span className="text-green-600">{JSON.stringify(value.new)}</span>
                                  </span>
                                ) : (
                                  <span className="ml-2">{JSON.stringify(value)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>IP: {log.ipAddress}</span>
                        <span>•</span>
                        <span title={log.userAgent} className="truncate max-w-xs">
                          {log.userAgent}
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-sm text-muted-foreground whitespace-nowrap ml-4">
                      <p>{format(new Date(log.createdAt), 'PPP')}</p>
                      <p className="text-xs">{format(new Date(log.createdAt), 'p')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            <Card>
              <CardContent className="p-0">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
