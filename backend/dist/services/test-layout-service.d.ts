export interface LayoutField {
    id: number;
    layoutId: number;
    sectionId: number;
    fieldName: string;
    fieldType: string;
    label: string;
    placeholder?: string;
    description?: string;
    isRequired: boolean;
    isVisible: boolean;
    fieldOrder: number;
    fieldWidth: string;
    defaultValue?: string;
    validationRules?: any;
    options?: any;
    conditionalLogic?: any;
    createdAt: string;
    updatedAt: string;
}
export interface LayoutSection {
    id: number;
    layoutId: number;
    sectionName: string;
    sectionTitle: string;
    sectionDescription?: string;
    sectionOrder: number;
    isCollapsible: boolean;
    isExpanded: boolean;
    createdAt: string;
    updatedAt: string;
    fields: LayoutField[];
}
export interface TestLayout {
    id: number;
    testType: string;
    name: string;
    description?: string;
    isDefault: boolean;
    isActive: boolean;
    version: number;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    sections: LayoutSection[];
}
export interface CreateLayoutData {
    testType: string;
    name: string;
    description?: string;
    isDefault?: boolean;
    isActive?: boolean;
    createdBy?: string;
}
export interface UpdateLayoutData {
    name?: string;
    description?: string;
    isActive?: boolean;
}
export interface CreateSectionData {
    layoutId: number;
    sectionName: string;
    sectionTitle: string;
    sectionDescription?: string;
    sectionOrder: number;
    isCollapsible?: boolean;
    isExpanded?: boolean;
}
export interface CreateFieldData {
    layoutId: number;
    sectionId: number;
    fieldName: string;
    fieldType: string;
    label: string;
    placeholder?: string;
    description?: string;
    isRequired?: boolean;
    isVisible?: boolean;
    fieldOrder: number;
    fieldWidth?: string;
    defaultValue?: string;
    validationRules?: any;
    options?: any;
    conditionalLogic?: any;
}
export declare class TestLayoutService {
    private tableName;
    private sectionsTableName;
    private fieldsTableName;
    getAllLayouts(): Promise<TestLayout[]>;
    getLayoutsByTestType(testType: string): Promise<TestLayout[]>;
    getLayoutById(id: number): Promise<TestLayout | null>;
    createLayout(layoutData: CreateLayoutData): Promise<TestLayout>;
    updateLayout(id: number, updateData: UpdateLayoutData): Promise<TestLayout | null>;
    deleteLayout(id: number): Promise<boolean>;
    createSection(sectionData: CreateSectionData): Promise<LayoutSection>;
    createField(fieldData: CreateFieldData): Promise<LayoutField>;
    private transformLayoutData;
}
//# sourceMappingURL=test-layout-service.d.ts.map