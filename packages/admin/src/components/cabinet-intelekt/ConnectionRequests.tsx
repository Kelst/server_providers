'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cabinetIntelektApi, type ConnectionRequest, type ConnectionRequestStatus } from '@/lib/api/cabinetIntelektApi';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Phone, Clock, CheckCircle2, XCircle, Edit, Trash2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

const STATUS_LABELS: Record<ConnectionRequestStatus, string> = {
  PENDING: 'Очікує',
  CONTACTED: 'Зв\'язались',
  COMPLETED: 'Виконано',
  REJECTED: 'Відхилено',
};

const STATUS_COLORS: Record<ConnectionRequestStatus, string> = {
  PENDING: 'bg-yellow-500',
  CONTACTED: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  REJECTED: 'bg-red-500',
};

export function ConnectionRequests() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ConnectionRequestStatus | 'ALL'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ConnectionRequest | null>(null);
  const [editStatus, setEditStatus] = useState<ConnectionRequestStatus>('PENDING');
  const [editNotes, setEditNotes] = useState('');

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState<ConnectionRequest | null>(null);

  useEffect(() => {
    loadRequests();
  }, [page, statusFilter, searchFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit,
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (searchFilter.trim()) {
        params.search = searchFilter.trim();
      }

      const data = await cabinetIntelektApi.getConnectionRequests(params);
      setRequests(data.data);
      setTotal(data.total);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Помилка',
        description: error?.response?.data?.message || 'Не вдалося завантажити заявки',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (request: ConnectionRequest) => {
    setEditingRequest(request);
    setEditStatus(request.status);
    setEditNotes(request.notes || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRequest) return;

    try {
      await cabinetIntelektApi.updateConnectionRequest(editingRequest.id, {
        status: editStatus,
        notes: editNotes || undefined,
      });

      toast({
        title: 'Успішно',
        description: 'Заявку оновлено',
      });

      setEditDialogOpen(false);
      loadRequests();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Помилка',
        description: error?.response?.data?.message || 'Не вдалося оновити заявку',
      });
    }
  };

  const handleDelete = (request: ConnectionRequest) => {
    setDeletingRequest(request);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingRequest) return;

    try {
      await cabinetIntelektApi.deleteConnectionRequest(deletingRequest.id);

      toast({
        title: 'Успішно',
        description: 'Заявку видалено',
      });

      setDeleteDialogOpen(false);
      loadRequests();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Помилка',
        description: error?.response?.data?.message || 'Не вдалося видалити заявку',
      });
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Заявки на підключення</CardTitle>
              <CardDescription>
                Всього заявок: {total}
              </CardDescription>
            </div>
            <Button onClick={loadRequests} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Оновити
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Пошук за ім'ям або телефоном..."
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as ConnectionRequestStatus | 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Всі статуси</SelectItem>
                <SelectItem value="PENDING">Очікує</SelectItem>
                <SelectItem value="CONTACTED">Зв'язались</SelectItem>
                <SelectItem value="COMPLETED">Виконано</SelectItem>
                <SelectItem value="REJECTED">Відхилено</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ПІБ</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Telegram</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Завантаження...
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Заявок не знайдено
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.fullName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {request.phoneNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[request.status]}>
                          {STATUS_LABELS[request.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.telegramSent ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(request.createdAt), {
                            addSuffix: true,
                            locale: uk,
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(request)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(request)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Сторінка {page} з {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || loading}
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages || loading}
                >
                  Вперед
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редагувати заявку</DialogTitle>
            <DialogDescription>
              Оновіть статус та додайте примітки до заявки
            </DialogDescription>
          </DialogHeader>

          {editingRequest && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>ПІБ</Label>
                <p className="text-sm font-medium">{editingRequest.fullName}</p>
              </div>

              <div className="space-y-2">
                <Label>Телефон</Label>
                <p className="text-sm font-medium">{editingRequest.phoneNumber}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Статус</Label>
                <Select value={editStatus} onValueChange={(value) => setEditStatus(value as ConnectionRequestStatus)}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Очікує</SelectItem>
                    <SelectItem value="CONTACTED">Зв'язались</SelectItem>
                    <SelectItem value="COMPLETED">Виконано</SelectItem>
                    <SelectItem value="REJECTED">Відхилено</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Примітки</Label>
                <Textarea
                  id="edit-notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Додайте примітки до заявки..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleSaveEdit}>
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити заявку?</AlertDialogTitle>
            <AlertDialogDescription>
              Ця дія незворотня. Заявка від {deletingRequest?.fullName} буде видалена назавжди.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
