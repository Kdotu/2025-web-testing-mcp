"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestSettingsService = void 0;
const supabase_client_1 = require("./supabase-client");
class TestSettingsService {
    constructor() {
        this.tableName = 'm2_test_settings';
    }
    async getAllSettings() {
        try {
            const { data, error } = await supabase_client_1.supabase
                .from(this.tableName)
                .select('*')
                .order('priority', { ascending: false })
                .order('createdAt', { ascending: false });
            if (error) {
                console.error('[TestSettings Service] Get all settings error:', error);
                throw new Error(`Failed to get settings: ${error.message}`);
            }
            return data || [];
        }
        catch (error) {
            console.error('[TestSettings Service] Get all settings failed:', error);
            throw error;
        }
    }
    async getSettingById(id) {
        try {
            const { data, error } = await supabase_client_1.supabase
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                console.error('[TestSettings Service] Get setting by ID error:', error);
                throw new Error(`Failed to get setting: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            console.error('[TestSettings Service] Get setting by ID failed:', error);
            throw error;
        }
    }
    async createSetting(settingData) {
        try {
            const { data, error } = await supabase_client_1.supabase
                .from(this.tableName)
                .insert([{
                    name: settingData.name,
                    category: settingData.category,
                    value: settingData.value,
                    description: settingData.description || '',
                    priority: settingData.priority || 0,
                    isActive: settingData.isActive !== false
                }])
                .select()
                .single();
            if (error) {
                console.error('[TestSettings Service] Create setting error:', error);
                throw new Error(`Failed to create setting: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            console.error('[TestSettings Service] Create setting failed:', error);
            throw error;
        }
    }
    async updateSetting(id, updateData) {
        try {
            const { data, error } = await supabase_client_1.supabase
                .from(this.tableName)
                .update({
                ...updateData,
                updatedAt: new Date().toISOString()
            })
                .eq('id', id)
                .select()
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                console.error('[TestSettings Service] Update setting error:', error);
                throw new Error(`Failed to update setting: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            console.error('[TestSettings Service] Update setting failed:', error);
            throw error;
        }
    }
    async deleteSetting(id) {
        try {
            const { error } = await supabase_client_1.supabase
                .from(this.tableName)
                .delete()
                .eq('id', id);
            if (error) {
                console.error('[TestSettings Service] Delete setting error:', error);
                throw new Error(`Failed to delete setting: ${error.message}`);
            }
            return true;
        }
        catch (error) {
            console.error('[TestSettings Service] Delete setting failed:', error);
            throw error;
        }
    }
    async getSettingsByCategory(category) {
        try {
            const { data, error } = await supabase_client_1.supabase
                .from(this.tableName)
                .select('*')
                .eq('category', category)
                .order('priority', { ascending: false })
                .order('createdAt', { ascending: false });
            if (error) {
                console.error('[TestSettings Service] Get settings by category error:', error);
                throw new Error(`Failed to get settings by category: ${error.message}`);
            }
            return data || [];
        }
        catch (error) {
            console.error('[TestSettings Service] Get settings by category failed:', error);
            throw error;
        }
    }
    async searchSettings(searchParams) {
        try {
            let query = supabase_client_1.supabase
                .from(this.tableName)
                .select('*');
            if (searchParams.query) {
                query = query.or(`name.ilike.%${searchParams.query}%,description.ilike.%${searchParams.query}%`);
            }
            if (searchParams.category) {
                query = query.eq('category', searchParams.category);
            }
            if (searchParams.isActive !== undefined) {
                query = query.eq('isActive', searchParams.isActive);
            }
            const { data, error } = await query
                .order('priority', { ascending: false })
                .order('createdAt', { ascending: false });
            if (error) {
                console.error('[TestSettings Service] Search settings error:', error);
                throw new Error(`Failed to search settings: ${error.message}`);
            }
            return data || [];
        }
        catch (error) {
            console.error('[TestSettings Service] Search settings failed:', error);
            throw error;
        }
    }
    async getCategories() {
        try {
            const { data, error } = await supabase_client_1.supabase
                .from(this.tableName)
                .select('category')
                .not('category', 'is', null);
            if (error) {
                console.error('[TestSettings Service] Get categories error:', error);
                throw new Error(`Failed to get categories: ${error.message}`);
            }
            const categories = [...new Set(data?.map(item => item.category) || [])].sort();
            return categories;
        }
        catch (error) {
            console.error('[TestSettings Service] Get categories failed:', error);
            throw error;
        }
    }
}
exports.TestSettingsService = TestSettingsService;
//# sourceMappingURL=test-settings-service.js.map