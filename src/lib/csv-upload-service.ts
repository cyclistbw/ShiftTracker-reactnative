
import { supabase } from "@/lib/supabase";
import { requireAuthentication } from "./security-utils";

export interface CSVUploadResult {
  success: boolean;
  uploadId?: string;
  error?: string;
  rowCount?: number;
}

export const uploadCSVFile = async (
  filename: string,
  csvContent: string
): Promise<CSVUploadResult> => {
  try {
    // Always get the current authenticated user
    const userId = await requireAuthentication();

    const rowCount = csvContent.split('\n').filter(line => line.trim()).length - 1; // Subtract header

    const { data, error } = await supabase
      .from('dynamic_csv_uploads')
      .insert({
        user_id: userId, // Use authenticated user's ID
        filename,
        raw_csv_content: csvContent,
        row_count: rowCount,
        status: 'uploaded'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error uploading CSV to database:', error);
      return { 
        success: false, 
        error: `Database error: ${error.message}` 
      };
    }

    return { 
      success: true, 
      uploadId: data.id,
      rowCount 
    };
  } catch (err) {
    console.error('Exception in uploadCSVFile:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const deleteCSVUpload = async (
  uploadId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Always get the current authenticated user
    const userId = await requireAuthentication();

    const { error } = await supabase
      .from('dynamic_csv_uploads')
      .delete()
      .eq('id', uploadId)
      .eq('user_id', userId); // Security: ensure user can only delete their own uploads

    if (error) {
      console.error('Error deleting CSV upload:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception in deleteCSVUpload:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

export const getUserCSVUploads = async () => {
  try {
    // Always get the current authenticated user
    const userId = await requireAuthentication();

    const { data, error } = await supabase
      .from('dynamic_csv_uploads')
      .select('*')
      .eq('user_id', userId) // Security: only fetch user's own uploads
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching CSV uploads:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('Exception in getUserCSVUploads:', err);
    throw err;
  }
};
