"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestTypeService = void 0;
const supabase_client_1 = require("./supabase-client");
class TestTypeService {
    constructor() {
    }
    async getAllTestTypes() {
        try {
            const { data, error } = await supabase_client_1.supabase
                .from('m2_test_types')
                .select('*')
                .order('category', { ascending: true })
                .order('name', { ascending: true });
            if (error) {
                console.error('Error fetching test types:', error);
                throw new Error(error.message);
            }
            return data || [];
        }
        catch (error) {
            console.error('Error in getAllTestTypes:', error);
            throw error;
        }
    }
    async getEnabledTestTypes() {
        try {
            const { data, error } = await supabase_client_1.supabase
                .from('m2_test_types')
                .select('*')
                .eq('enabled', true)
                .order('category', { ascending: true })
                .order('name', { ascending: true });
            if (error) {
                console.error('Error fetching enabled test types:', error);
                throw new Error(error.message);
            }
            return data || [];
        }
        catch (error) {
            console.error('Error in getEnabledTestTypes:', error);
            throw error;
        }
    }
    async addTestType(testType) {
        try {
            const { data, error } = await supabase_client_1.supabase
                .from('m2_test_types')
                .insert([{
                    ...testType,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single();
            if (error) {
                console.error('Error adding test type:', error);
                throw new Error(error.message);
            }
            return data;
        }
        catch (error) {
            console.error('Error in addTestType:', error);
            throw error;
        }
    }
    async updateTestType(id, updates) {
        try {
            const existingTestType = await this.getTestTypeById(id);
            if (!existingTestType) {
                throw new Error(`테스트 타입 '${id}'을 찾을 수 없습니다.`);
            }
            if (existingTestType.is_locked && updates.is_locked === false) {
                console.log(`[TestTypeService] 테스트 타입 '${id}'의 잠금 해제 허용`);
            }
            else if (existingTestType.is_locked && updates.is_locked !== false && updates.is_locked !== undefined) {
                throw new Error(`테스트 타입 '${existingTestType.name}'이(가) 잠겨있습니다. 테스트 ID: ${existingTestType.locked_by}`);
            }
            const { data, error } = await supabase_client_1.supabase
                .from('m2_test_types')
                .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
                .eq('id', id)
                .select()
                .single();
            if (error) {
                console.error('Error updating test type:', error);
                throw new Error(error.message);
            }
            return data;
        }
        catch (error) {
            console.error('Error in updateTestType:', error);
            throw error;
        }
    }
    async deleteTestType(id) {
        try {
            const existingTestType = await this.getTestTypeById(id);
            if (!existingTestType) {
                throw new Error(`테스트 타입 '${id}'을 찾을 수 없습니다.`);
            }
            if (existingTestType.is_locked) {
                throw new Error(`테스트 타입 '${existingTestType.name}'이(가) 잠겨있습니다. 테스트 ID: ${existingTestType.locked_by}`);
            }
            const { error } = await supabase_client_1.supabase
                .from('m2_test_types')
                .delete()
                .eq('id', id);
            if (error) {
                console.error('Error deleting test type:', error);
                throw new Error(error.message);
            }
        }
        catch (error) {
            console.error('Error in deleteTestType:', error);
            throw error;
        }
    }
    async toggleTestType(id, enabled) {
        return this.updateTestType(id, { enabled });
    }
    async acquireTestConfigLock(testTypeId, _testId) {
        console.log(`[TestTypeService] 테스트 타입 잠금 시스템 비활성화됨 - '${testTypeId}' 잠금 획득 허용`);
        return true;
    }
    async releaseTestConfigLock(testTypeId, _testId) {
        console.log(`[TestTypeService] 테스트 타입 잠금 시스템 비활성화됨 - '${testTypeId}' 잠금 해제 허용`);
        return true;
    }
    async getTestTypeById(id) {
        try {
            const { data, error } = await supabase_client_1.supabase
                .from('m2_test_types')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                console.error('Error fetching test type by id:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('Error in getTestTypeById:', error);
            return null;
        }
    }
    async getLockedTestTypes() {
        try {
            const { data, error } = await supabase_client_1.supabase
                .from('m2_test_types')
                .select('*')
                .eq('is_locked', true)
                .order('name', { ascending: true });
            if (error) {
                console.error('Error fetching locked test types:', error);
                throw new Error(error.message);
            }
            return data || [];
        }
        catch (error) {
            console.error('Error in getLockedTestTypes:', error);
            throw error;
        }
    }
    async forceReleaseLock(id) {
        try {
            const { error } = await supabase_client_1.supabase
                .from('m2_test_types')
                .update({
                is_locked: false,
                locked_by: null,
                lock_type: null,
                updated_at: new Date().toISOString()
            })
                .eq('id', id);
            if (error) {
                console.error('Error force releasing lock:', error);
                return false;
            }
            console.log(`[TestTypeService] 테스트 타입 '${id}' 잠금 강제 해제 완료`);
            return true;
        }
        catch (error) {
            console.error('Error in forceReleaseLock:', error);
            return false;
        }
    }
}
exports.TestTypeService = TestTypeService;
//# sourceMappingURL=test-type-service.js.map