import { create } from 'zustand';
import {
  alertRulesApi,
  AlertRule,
  AlertRuleTemplate,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
} from '../api/alertRulesApi';

interface AlertRulesState {
  rules: AlertRule[];
  templates: AlertRuleTemplate[];
  selectedRule: AlertRule | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchRules: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  fetchRule: (id: string) => Promise<void>;
  createRule: (dto: CreateAlertRuleDto) => Promise<AlertRule>;
  updateRule: (id: string, dto: UpdateAlertRuleDto) => Promise<AlertRule>;
  deleteRule: (id: string) => Promise<void>;
  toggleRule: (id: string) => Promise<void>;
  testRule: (id: string) => Promise<void>;
  setSelectedRule: (rule: AlertRule | null) => void;
}

export const useAlertRulesStore = create<AlertRulesState>((set) => ({
  rules: [],
  templates: [],
  selectedRule: null,
  isLoading: false,
  error: null,

  fetchRules: async () => {
    set({ isLoading: true, error: null });
    try {
      const rules = await alertRulesApi.getRules();
      set({ rules, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch alert rules',
        isLoading: false,
      });
    }
  },

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const templates = await alertRulesApi.getTemplates();
      set({ templates, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch templates',
        isLoading: false,
      });
    }
  },

  fetchRule: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const rule = await alertRulesApi.getRule(id);
      set({ selectedRule: rule, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch alert rule',
        isLoading: false,
      });
    }
  },

  createRule: async (dto: CreateAlertRuleDto) => {
    set({ isLoading: true, error: null });
    try {
      const rule = await alertRulesApi.createRule(dto);
      set((state) => ({
        rules: [rule, ...state.rules],
        isLoading: false,
      }));
      return rule;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create alert rule',
        isLoading: false,
      });
      throw error;
    }
  },

  updateRule: async (id: string, dto: UpdateAlertRuleDto) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await alertRulesApi.updateRule(id, dto);
      set((state) => ({
        rules: state.rules.map((r) => (r.id === id ? updated : r)),
        selectedRule: state.selectedRule?.id === id ? updated : state.selectedRule,
        isLoading: false,
      }));
      return updated;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update alert rule',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteRule: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await alertRulesApi.deleteRule(id);
      set((state) => ({
        rules: state.rules.filter((r) => r.id !== id),
        selectedRule: state.selectedRule?.id === id ? null : state.selectedRule,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete alert rule',
        isLoading: false,
      });
      throw error;
    }
  },

  toggleRule: async (id: string) => {
    try {
      const updated = await alertRulesApi.toggleRule(id);
      set((state) => ({
        rules: state.rules.map((r) => (r.id === id ? updated : r)),
        selectedRule: state.selectedRule?.id === id ? updated : state.selectedRule,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to toggle alert rule',
      });
      throw error;
    }
  },

  testRule: async (id: string) => {
    try {
      await alertRulesApi.testRule(id);
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to test alert rule',
      });
      throw error;
    }
  },

  setSelectedRule: (rule: AlertRule | null) => {
    set({ selectedRule: rule });
  },
}));
