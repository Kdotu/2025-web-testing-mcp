-- Add raw_data column to m2_playwright_test_results table
-- This will store the detailed MCP execution logs and results

ALTER TABLE public.m2_playwright_test_results 
ADD COLUMN raw_data text;

-- Add comment for documentation
COMMENT ON COLUMN public.m2_playwright_test_results.raw_data IS 'Raw execution data from MCP server including detailed logs and results';
