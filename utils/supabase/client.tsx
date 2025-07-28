import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ihubdmrqggwusivtopsi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodWJkbXJxZ2d3dXNpdnRvcHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc2NzAzNTcsImV4cCI6MjA1MzI0NjM1N30.sb_publishable_H0d2-OOCuKe7RQF9_6fZJg_YAatqCnQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 테스트 결과를 저장하는 함수
export const saveTestResult = async (testData: {
  url: string;
  testType: string;
  status: string;
  progress: number;
  settings: any;
  logs: string[];
  startTime: string;
  endTime?: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('test_results')
      .insert([
        {
          url: testData.url,
          test_type: testData.testType,
          status: testData.status,
          progress: testData.progress,
          settings: testData.settings,
          logs: testData.logs,
          start_time: testData.startTime,
          end_time: testData.endTime,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error saving test result:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in saveTestResult:', error);
    return { success: false, error };
  }
};

// 테스트 결과를 불러오는 함수
export const getTestResults = async (limit: number = 50) => {
  try {
    const { data, error } = await supabase
      .from('test_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching test results:', error);
      return { success: false, error, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getTestResults:', error);
    return { success: false, error, data: [] };
  }
};

// 특정 테스트 결과를 삭제하는 함수
export const deleteTestResult = async (id: number) => {
  try {
    const { error } = await supabase
      .from('test_results')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting test result:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteTestResult:', error);
    return { success: false, error };
  }
};

// 테스트 설정을 저장하는 함수
export const saveTestSettings = async (settings: any) => {
  try {
    const { data, error } = await supabase
      .from('test_settings')
      .upsert([
        {
          id: 'default',
          settings: settings,
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error saving test settings:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in saveTestSettings:', error);
    return { success: false, error };
  }
};

// 테스트 설정을 불러오는 함수
export const getTestSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('test_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = row not found
      console.error('Error fetching test settings:', error);
      return { success: false, error, data: null };
    }

    return { success: true, data: data?.settings || null };
  } catch (error) {
    console.error('Error in getTestSettings:', error);
    return { success: false, error, data: null };
  }
};