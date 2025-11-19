'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { analyticsApi } from '@/lib/api/analyticsApi';
import type { RequestLog } from '@/lib/types';
import { format } from 'date-fns';
import { RequestDetailsDialog } from './RequestDetailsDialog';

export function RequestSearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<RequestLog | null>(null);

  const handleSearch = async () => {
    setIsLoading(true);
    setPage(1); // Reset to first page
    try {
      const data = await analyticsApi.getRequestLogs({
        searchTerm: searchTerm || undefined,
        ipAddress: ipAddress || undefined,
        page: 1,
        limit: 50,
        period: '7d',
      });
      setRequests(data.requests);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to search request logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPage = async (newPage: number) => {
    setIsLoading(true);
    try {
      const data = await analyticsApi.getRequestLogs({
        searchTerm: searchTerm || undefined,
        ipAddress: ipAddress || undefined,
        page: newPage,
        limit: 50,
        period: '7d',
      });
      setRequests(data.requests);
      setPage(newPage);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to load page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (code: number) => {
    if (code < 300) return 'default';
    if (code < 400) return 'secondary';
    if (code < 500) return 'outline';
    return 'destructive';
  };

  const highlightText = (text: string, search: string) => {
    if (!search) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Search Request Logs</CardTitle>
          <CardDescription>
            Search through all API requests by login, UID, IP address, endpoint, or any JSON field
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Form */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Input
                placeholder="Search by login, UID, endpoint, JSON data... (e.g., vlad_b_1, 140278)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <Input
                placeholder="Filter by IP address"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>

          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>

          {/* Results Count */}
          {!isLoading && requests.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Found {total.toLocaleString()} results
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              {searchTerm || ipAddress
                ? 'No requests found matching your search criteria'
                : 'Enter a search term to find requests'}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="text-xs">
                        {format(new Date(request.createdAt), 'MMM d, HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-medium">{request.projectName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.method}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[300px] truncate">
                        {searchTerm ? highlightText(request.endpoint, searchTerm) : request.endpoint}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(request.statusCode)}>
                          {request.statusCode}
                        </Badge>
                      </TableCell>
                      <TableCell>{request.responseTime}ms</TableCell>
                      <TableCell className="font-mono text-xs">
                        {ipAddress ? highlightText(request.ipAddress, ipAddress) : request.ipAddress}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total.toLocaleString()} total results)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPage(page - 1)}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPage(page + 1)}
                  disabled={page === totalPages || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Dialog */}
      {selectedRequest && (
        <RequestDetailsDialog
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
          endpoint={selectedRequest.endpoint}
          method={selectedRequest.method}
        />
      )}
    </div>
  );
}
