export interface TestType {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    category?: string;
    icon?: string;
    color?: string;
    config_template?: any;
    mcp_tool?: string;
    is_locked?: boolean;
    locked_by?: string;
    lock_type?: 'config' | 'execution';
    created_at?: string;
    updated_at?: string;
}
export declare class TestTypeService {
    constructor();
    getAllTestTypes(): Promise<TestType[]>;
    getEnabledTestTypes(): Promise<TestType[]>;
    addTestType(testType: Omit<TestType, 'created_at' | 'updated_at'>): Promise<TestType>;
    updateTestType(id: string, updates: Partial<TestType>): Promise<TestType>;
    deleteTestType(id: string): Promise<void>;
    toggleTestType(id: string, enabled: boolean): Promise<TestType>;
    acquireTestConfigLock(testTypeId: string, _testId: string): Promise<boolean>;
    releaseTestConfigLock(testTypeId: string, _testId: string): Promise<boolean>;
    getTestTypeById(id: string): Promise<TestType | null>;
    getLockedTestTypes(): Promise<TestType[]>;
    forceReleaseLock(id: string): Promise<boolean>;
}
//# sourceMappingURL=test-type-service.d.ts.map