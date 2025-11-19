'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { analyticsApi } from '@/lib/api/analyticsApi';
import type { RequestLog } from '@/lib/types';
import { format } from 'date-fns';

interface RequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: string;
  method: string;
}

interface RequestDetailModalProps {
  request: RequestLog;
  onClose: () => void;
}

function RequestDetailModal({ request, onClose }: RequestDetailModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Details</DialogTitle>
          <DialogDescription>
            {request.method} {request.endpoint}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Project</p>
              <p className="text-sm font-mono">{request.projectName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Token Name</p>
              <p className="text-sm font-mono">{request.tokenName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status Code</p>
              <Badge variant={request.statusCode < 400 ? 'default' : 'destructive'}>
                {request.statusCode}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Response Time</p>
              <p className="text-sm">{request.responseTime}ms</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">IP Address</p>
              <p className="text-sm font-mono">{request.ipAddress}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
              <p className="text-sm">{format(new Date(request.createdAt), 'PPpp')}</p>
            </div>
          </div>

          {/* User Agent */}
          {request.userAgent && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">User Agent</p>
              <p className="text-xs font-mono bg-muted p-2 rounded">{request.userAgent}</p>
            </div>
          )}

          {/* Request Payload */}
          {request.requestPayload && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Request Payload</p>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                {JSON.stringify(request.requestPayload, null, 2)}
              </pre>
            </div>
          )}

          {/* Response Payload */}
          {request.responsePayload && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Response Payload</p>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-60">
                {JSON.stringify(request.responsePayload, null, 2)}
              </pre>
            </div>
          )}

          {/* Error Message */}
          {request.errorMessage && (
            <div>
              <p className="text-sm font-medium text-destructive mb-1">Error Message</p>
              <p className="text-sm bg-destructive/10 p-3 rounded">{request.errorMessage}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RequestDetailsDialog({ open, onOpenChange, endpoint, method }: RequestDetailsDialogProps) {
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<RequestLog | null>(null);

  useEffect(() => {
    if (open) {
      loadRequests();
    } else {
      // Reset state when closing
      setRequests([]);
      setPage(1);
      setTotalPages(1);
      setSelectedRequest(null);
    }
  }, [open, endpoint, method, page]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await analyticsApi.getRequestLogs({
        endpoint,
        method,
        page,
        limit: 10,
        period: '24h',
      });
      setRequests(data.requests);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to load request details:', error);
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Recent requests for {method} {endpoint} (Last 24 hours)
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No requests found for this endpoint
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-xs">{request.projectName}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(request.statusCode)}>
                          {request.statusCode}
                        </Badge>
                      </TableCell>
                      <TableCell>{request.responseTime}ms</TableCell>
                      <TableCell className="font-mono text-xs">{request.ipAddress}</TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(request.createdAt), 'MMM d, HH:mm:ss')}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </>
  );
}
