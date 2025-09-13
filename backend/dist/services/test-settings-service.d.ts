export interface TestSetting {
    id: number;
    name: string;
    category: string;
    value: any;
    description: string;
    priority: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface CreateSettingData {
    name: string;
    category: string;
    value: any;
    description?: string;
    priority?: number;
    isActive?: boolean;
}
export interface UpdateSettingData {
    name?: string;
    category?: string;
    value?: any;
    description?: string;
    priority?: number;
    isActive?: boolean;
}
export interface SearchParams {
    query?: string;
    category?: string;
    isActive?: boolean;
}
export declare class TestSettingsService {
    private tableName;
    getAllSettings(): Promise<TestSetting[]>;
    getSettingById(id: number): Promise<TestSetting | null>;
    createSetting(settingData: CreateSettingData): Promise<TestSetting>;
    updateSetting(id: number, updateData: UpdateSettingData): Promise<TestSetting | null>;
    deleteSetting(id: number): Promise<boolean>;
    getSettingsByCategory(category: string): Promise<TestSetting[]>;
    searchSettings(searchParams: SearchParams): Promise<TestSetting[]>;
    getCategories(): Promise<string[]>;
}
//# sourceMappingURL=test-settings-service.d.ts.map