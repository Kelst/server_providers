'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { ColorPicker } from '../ui/color-picker';
import { IconSelector } from '../ui/icon-selector';
import { cabinetIntelektApi, NewsCategory, CreateNewsCategoryRequest, UpdateNewsCategoryRequest } from '@/lib/api/cabinetIntelektApi';

export function NewsCategoryManagement() {
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<NewsCategory | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<CreateNewsCategoryRequest>({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: '📰',
    order: 0,
    isActive: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await cabinetIntelektApi.getNewsCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      alert('Помилка завантаження категорій');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Назва категорії обов\'язкова');
      return;
    }

    try {
      setLoading(true);

      if (editingCategory) {
        await cabinetIntelektApi.updateNewsCategory(editingCategory.id, formData as UpdateNewsCategoryRequest);
      } else {
        await cabinetIntelektApi.createNewsCategory(formData);
      }

      await loadCategories();
      resetForm();
      setShowForm(false);
    } catch (error: any) {
      console.error('Failed to save category:', error);
      const message = error?.response?.data?.message || 'Помилка збереження категорії';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: NewsCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3b82f6',
      icon: category.icon || '📰',
      order: category.order,
      isActive: category.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (category: NewsCategory) => {
    const confirmed = window.confirm(
      `Ви впевнені, що хочете видалити категорію "${category.name}"?\n\nЦя дія незворотня. Якщо до категорії прив'язані новини, видалення буде неможливим.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await cabinetIntelektApi.deleteNewsCategory(category.id);
      await loadCategories();
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      const message = error?.response?.data?.message || 'Помилка видалення категорії';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3b82f6',
      icon: '📰',
      order: 0,
      isActive: true,
    });
    setEditingCategory(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Категорії новин</h2>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            Додати категорію
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingCategory ? 'Редагувати категорію' : 'Нова категорія'}
          </h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Назва категорії *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Наприклад: Технології"
                maxLength={100}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="description">Опис</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Короткий опис категорії"
                disabled={loading}
              />
            </div>

            <ColorPicker
              label="Колір категорії"
              value={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
              disabled={loading}
            />

            <IconSelector
              label="Іконка категорії"
              value={formData.icon}
              onChange={(icon) => setFormData({ ...formData, icon })}
              disabled={loading}
            />

            <div>
              <Label htmlFor="order">Порядок сортування</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                placeholder="0"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Категорії з меншим номером відображаються першими
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                disabled={loading}
                className="w-4 h-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Активна категорія
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Збереження...' : 'Зберегти'}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={loading}>
                Скасувати
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading && !showForm ? (
        <div className="text-center py-8">Завантаження...</div>
      ) : categories.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <p>Категорій ще немає. Створіть першу категорію!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {category.icon && <span className="text-2xl">{category.icon}</span>}
                  <div>
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    {category.slug && (
                      <p className="text-xs text-gray-500">/{category.slug}</p>
                    )}
                  </div>
                </div>
                {category.color && (
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: category.color }}
                    title={category.color}
                  />
                )}
              </div>

              {category.description && (
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>Порядок: {category.order}</span>
                <span className={category.isActive ? 'text-green-600' : 'text-red-600'}>
                  {category.isActive ? '✓ Активна' : '✗ Неактивна'}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(category)}
                  disabled={loading}
                  className="flex-1"
                >
                  Редагувати
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(category)}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700"
                >
                  Видалити
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
