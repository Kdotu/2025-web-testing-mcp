"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSupabaseConnection = exports.createServiceClient = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env['SUPABASE_URL'];
const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'];
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: false
    }
});
const createServiceClient = () => {
    const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!serviceRoleKey) {
        throw new Error('Missing Supabase service role key. Please check your .env file.');
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: false
        }
    });
};
exports.createServiceClient = createServiceClient;
const testSupabaseConnection = async () => {
    try {
        const { error } = await exports.supabase
            .from('m2_test_results')
            .select('count')
            .limit(1);
        if (error) {
            console.error('Supabase connection test failed:', error);
            return false;
        }
        console.log('✅ Supabase connection successful');
        return true;
    }
    catch (error) {
        console.error('Supabase connection test failed:', error);
        return false;
    }
};
exports.testSupabaseConnection = testSupabaseConnection;
//# sourceMappingURL=supabase-client.js.map