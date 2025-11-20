'use client';

import { useState, useEffect } from 'react';
import { cabinetIntelektApi, News, NewsCategory, NewsStatus, CreateNewsRequest } from '@/lib/api/cabinetIntelektApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Eye, Calendar, Tag, Star, Pin } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { useToast } from '@/hooks/use-toast';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

export function NewsManagement() {
  const [news, setNews] = useState<News[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<NewsStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<CreateNewsRequest>({
    title: '',
    excerpt: '',
    content: '',
    categoryId: '',
    tags: [],
    isFeatured: false,
    isPinned: false,
    status: 'DRAFT',
  });
  const [tagInput, setTagInput] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    loadNews();
    loadCategories();
  }, [statusFilter, categoryFilter]);

  const loadNews = async () => {
    try {
      setLoading(true);
      const response = await cabinetIntelektApi.getNewsList({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        categoryId: categoryFilter === 'ALL' ? undefined : categoryFilter,
      });
      setNews(response.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load news',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await cabinetIntelektApi.getNewsCategories();
      setCategories(data);
    } catch (error: any) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleCreate = () => {
    setEditingNews(null);
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      categoryId: '',
      tags: [],
      isFeatured: false,
      isPinned: false,
      status: 'DRAFT',
    });
    setTagInput('');
    setCoverFile(null);
    setDialogOpen(true);
  };

  const handleEdit = (newsItem: News) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      excerpt: newsItem.excerpt || '',
      content: newsItem.content,
      categoryId: newsItem.categoryId || '',
      tags: newsItem.tags,
      isFeatured: newsItem.isFeatured,
      isPinned: newsItem.isPinned,
      status: newsItem.status,
      scheduledFor: newsItem.scheduledFor,
    });
    setTagInput('');
    setCoverFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (editingNews) {
        const updated = await cabinetIntelektApi.updateNews(editingNews.id, formData);
        if (coverFile) {
          await cabinetIntelektApi.uploadNewsCover(updated.id, coverFile);
        }
        toast({ title: 'Success', description: 'News updated successfully' });
      } else {
        const created = await cabinetIntelektApi.createNews(formData);
        if (coverFile) {
          await cabinetIntelektApi.uploadNewsCover(created.id, coverFile);
        }
        toast({ title: 'Success', description: 'News created successfully' });
      }

      setDialogOpen(false);
      loadNews();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save news',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news?')) return;

    try {
      await cabinetIntelektApi.deleteNews(id);
      toast({ title: 'Success', description: 'News deleted successfully' });
      loadNews();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete news',
        variant: 'destructive',
      });
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  const filteredNews = news.filter((item) =>
    searchQuery
      ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const getStatusBadgeVariant = (status: NewsStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return 'default';
      case 'DRAFT':
        return 'secondary';
      case 'SCHEDULED':
        return 'outline';
      case 'ARCHIVED':
        return 'destructive';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">News Management</h2>
          <p className="text-muted-foreground">Manage your news articles</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create News
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={(value: string) => setCategoryFilter(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.filter(cat => cat.isActive).map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon && `${cat.icon} `}{cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* News List */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading...
            </CardContent>
          </Card>
        ) : filteredNews.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No news found
            </CardContent>
          </Card>
        ) : (
          filteredNews.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {item.isPinned && <Pin className="h-4 w-4 text-primary" />}
                      {item.isFeatured && <Star className="h-4 w-4 text-yellow-500" />}
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </div>
                    <CardDescription className="mt-1">
                      {item.excerpt || 'No excerpt'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
                  <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                  {item.category && (
                    <Badge variant="outline" style={{ backgroundColor: item.category.color + '20', borderColor: item.category.color }}>
                      {item.category.icon && `${item.category.icon} `}{item.category.name}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{item.viewsCount} views</span>
                  </div>
                  {item.publishedAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {item.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {item.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNews ? 'Edit News' : 'Create News'}</DialogTitle>
            <DialogDescription>
              {editingNews ? 'Update news article details' : 'Create a new news article'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter news title"
              />
            </div>

            {/* Excerpt */}
            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Short summary..."
                rows={2}
              />
            </div>

            {/* Content */}
            <div>
              <Label>Content *</Label>
              <RichTextEditor
                content={formData.content}
                onChange={(html) => setFormData({ ...formData, content: html })}
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.categoryId || undefined}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag and press Enter"
                />
                <Button type="button" onClick={addTag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <Label htmlFor="cover">Cover Image</Label>
              <Input
                id="cover"
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              />
              {editingNews?.coverImageUrl && !coverFile && (
                <div className="mt-2">
                  <img
                    src={`${BACKEND_BASE_URL}${editingNews.coverImageUrl}`}
                    alt="Cover"
                    className="w-32 h-32 object-cover rounded"
                  />
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: NewsStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flags */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Featured</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Pinned</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !formData.title || !formData.content}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
