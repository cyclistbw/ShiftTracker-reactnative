import { supabase } from "@/integrations/supabase/client";
import { Expense } from "@/types/shift";

export interface DatabaseExpense {
  id: string;
  shift_id: string;
  user_id: string;
  description: string;
  amount: number;
  business_purpose: string;
  location: string;
  expense_date: string;
  receipt_image_path: string | null;
  created_at: string;
  updated_at: string;
}

export const saveExpenseToDatabase = async (
  expense: Omit<Expense, "id" | "timestamp">,
  shiftId: string
): Promise<{ success: boolean; error?: string; expenseId?: string }> => {
  try {
    console.log('💾 EXPENSE STORAGE DEBUG: saveExpenseToDatabase called with:', {
      shiftId,
      hasReceiptImage: !!expense.receiptImage,
      receiptImageLength: expense.receiptImage?.length || 0,
      receiptImageType: expense.receiptImage?.startsWith('data:') ? 'data URL' : 'base64'
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    let receiptPath = null;

    // Upload receipt image if provided
    if (expense.receiptImage) {
      console.log('💾 EXPENSE STORAGE DEBUG: Uploading receipt image...');
      console.log('💾 EXPENSE STORAGE DEBUG: Image data preview:', expense.receiptImage.substring(0, 100));
      console.log('💾 EXPENSE STORAGE DEBUG: User ID:', user.id);
      
      const receiptResult = await uploadReceiptImage(expense.receiptImage, user.id);
      console.log('💾 EXPENSE STORAGE DEBUG: Upload result:', receiptResult);
      
      if (!receiptResult.success) {
        console.error('💾 EXPENSE STORAGE DEBUG: Upload failed with error:', receiptResult.error);
        return { success: false, error: receiptResult.error };
      }
      
      receiptPath = receiptResult.path;
      console.log('💾 EXPENSE STORAGE DEBUG: Receipt path set to:', receiptPath);
      console.log('💾 EXPENSE STORAGE DEBUG: receiptPath is:', typeof receiptPath, receiptPath);
    } else {
      console.log('💾 EXPENSE STORAGE DEBUG: No receipt image provided');
    }

    // Save expense to database
    console.log('💾 EXPENSE STORAGE DEBUG: Saving expense to database with receipt_path:', receiptPath);
    
    const insertData = {
      shift_id: shiftId,
      user_id: user.id,
      description: expense.description,
      amount: expense.amount,
      business_purpose: expense.businessPurpose,
      location: expense.location,
      expense_date: expense.date.toISOString().split('T')[0],
      receipt_image_path: receiptPath,
    };
    
    console.log('💾 EXPENSE STORAGE DEBUG: Insert data:', insertData);
    console.log('💾 EXPENSE STORAGE DEBUG: Receipt path value:', receiptPath, typeof receiptPath);
    
    const { data, error } = await supabase
      .from('shift_expenses')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("💾 EXPENSE STORAGE DEBUG: Database insert error:", error);
      return { success: false, error: error.message };
    }

    console.log('💾 EXPENSE STORAGE DEBUG: Database insert successful:', data);

    // Only update shift totals if the shift exists in the database (i.e., it's completed)
    // For active shifts, we don't update the shift_summaries table since it doesn't exist yet
    const { data: shiftExists } = await supabase
      .from('shift_summaries')
      .select('id')
      .eq('id', shiftId)
      .single();

    if (shiftExists) {
      // Update the shift's total expenses only if shift exists in database
      const { error: updateError } = await supabase.rpc('update_shift_expenses_total', {
        p_shift_id: shiftId
      });
      console.log('DEBUG: RPC update completed for shift:', shiftId);

      if (updateError) {
        console.warn('Warning: Expense saved but failed to update shift total:', updateError);
        // Don't fail the operation since the expense was saved successfully
      }
    } else {
      console.log('Shift not in database yet (active shift), skipping total update');
    }

    return { success: true, expenseId: data.id };
  } catch (err) {
    console.error("Unexpected error saving expense:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
};

export const updateExpenseInDatabase = async (
  expenseId: string,
  updates: {
    description?: string;
    amount?: number;
    business_purpose?: string;
    location?: string;
    receiptImage?: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // First get the current expense data for shift_id and current receipt
    const { data: expense, error: fetchError } = await supabase
      .from('shift_expenses')
      .select('shift_id, receipt_image_path')
      .eq('id', expenseId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error("Error fetching expense:", fetchError);
      return { success: false, error: fetchError.message };
    }

    let receiptPath = expense.receipt_image_path;

    // Handle receipt image update if provided
    if (updates.receiptImage !== undefined) {
      if (updates.receiptImage) {
        // Upload new receipt image
        const receiptResult = await uploadReceiptImage(updates.receiptImage, user.id);
        if (!receiptResult.success) {
          return { success: false, error: receiptResult.error };
        }
        
        // Delete old receipt image if it exists
        if (expense.receipt_image_path) {
          await supabase.storage
            .from('receipts')
            .remove([expense.receipt_image_path]);
        }
        
        receiptPath = receiptResult.path;
      } else {
        // Remove receipt image (set to null)
        if (expense.receipt_image_path) {
          await supabase.storage
            .from('receipts')
            .remove([expense.receipt_image_path]);
        }
        receiptPath = null;
      }
    }

    // Prepare update object (exclude receiptImage as it's handled separately)
    const dbUpdates = { ...updates };
    delete dbUpdates.receiptImage;
    
    // Add receipt path to updates
    if (updates.receiptImage !== undefined) {
      (dbUpdates as any).receipt_image_path = receiptPath;
    }

    // Update the expense
    const { error } = await supabase
      .from('shift_expenses')
      .update(dbUpdates)
      .eq('id', expenseId)
      .eq('user_id', user.id);

    if (error) {
      console.error("Error updating expense:", error);
      return { success: false, error: error.message };
    }

    // Update the shift's total expenses
    const { error: updateError } = await supabase.rpc('update_shift_expenses_total', {
      p_shift_id: expense.shift_id
    });

    if (updateError) {
      console.warn('Warning: Expense updated but failed to update shift total:', updateError);
      // Don't fail the operation since the expense was updated successfully
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error updating expense:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
};

export const deleteExpenseFromDatabase = async (
  expenseId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // First get the expense to check for receipt image and shift_id
    const { data: expense, error: fetchError } = await supabase
      .from('shift_expenses')
      .select('receipt_image_path, shift_id')
      .eq('id', expenseId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error("Error fetching expense:", fetchError);
      return { success: false, error: fetchError.message };
    }

    // Delete receipt image if it exists
    if (expense?.receipt_image_path) {
      const { error: storageError } = await supabase.storage
        .from('receipts')
        .remove([expense.receipt_image_path]);
      
      if (storageError) {
        console.error("Error deleting receipt image:", storageError);
        // Continue with expense deletion even if image deletion fails
      }
    }

    // Delete the expense
    const { error } = await supabase
      .from('shift_expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', user.id);

    if (error) {
      console.error("Error deleting expense:", error);
      return { success: false, error: error.message };
    }

    // Update the shift's total expenses
    const { error: updateError } = await supabase.rpc('update_shift_expenses_total', {
      p_shift_id: expense.shift_id
    });

    if (updateError) {
      console.warn('Warning: Expense deleted but failed to update shift total:', updateError);
      // Don't fail the operation since the expense was deleted successfully
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error deleting expense:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
};

export const deleteExpensesForShift = async (
  shiftId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // First get all expenses for this shift to delete receipt images
    const { data: expenses, error: fetchError } = await supabase
      .from('shift_expenses')
      .select('id, receipt_image_path')
      .eq('shift_id', shiftId)
      .eq('user_id', user.id);

    if (fetchError) {
      console.error("Error fetching expenses for shift:", fetchError);
      return { success: false, error: fetchError.message };
    }

    // Delete receipt images
    if (expenses && expenses.length > 0) {
      const imagePaths = expenses
        .filter(exp => exp.receipt_image_path)
        .map(exp => exp.receipt_image_path!);
      
      if (imagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('receipts')
          .remove(imagePaths);
        
        if (storageError) {
          console.error("Error deleting receipt images:", storageError);
          // Continue with expense deletion even if image deletion fails
        }
      }
    }

    // Delete all expenses for this shift
    const { error } = await supabase
      .from('shift_expenses')
      .delete()
      .eq('shift_id', shiftId)
      .eq('user_id', user.id);

    if (error) {
      console.error("Error deleting expenses for shift:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error deleting expenses for shift:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
};

export const uploadReceiptImage = async (
  imageData: string,
  userId: string
): Promise<{ success: boolean; path?: string; error?: string }> => {
  try {
    console.log('📸 IMAGE UPLOAD DEBUG: Starting upload with data length:', imageData?.length);
    console.log('📸 IMAGE UPLOAD DEBUG: Data type:', imageData?.startsWith('data:') ? 'data URL' : 'base64');
    
    // Generate unique filename
    const timestamp = new Date().getTime();
    const filename = `receipt_${timestamp}.jpeg`;
    const filePath = `${userId}/${filename}`;
    console.log('📸 IMAGE UPLOAD DEBUG: Generated file path:', filePath);

    let uploadData: string | Uint8Array;

    if (imageData.startsWith('data:')) {
      // Base64 data URL - extract base64 part
      const base64Data = imageData.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      uploadData = bytes;
    } else {
      // Assume it's already base64 encoded
      const binaryString = atob(imageData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      uploadData = bytes;
    }

    console.log('📸 IMAGE UPLOAD DEBUG: Prepared upload data, size:', uploadData.length);

    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, uploadData, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      console.error("📸 IMAGE UPLOAD DEBUG: Storage upload error:", error);
      return { success: false, error: error.message };
    }

    console.log('📸 IMAGE UPLOAD DEBUG: Upload successful:', data);
    return { success: true, path: data.path };
  } catch (err) {
    console.error("📸 IMAGE UPLOAD DEBUG: Unexpected error:", err);
    return { success: false, error: "Failed to upload receipt image" };
  }
};

export const getExpensesForShift = async (
  shiftId: string
): Promise<{ success: boolean; expenses?: DatabaseExpense[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('shift_expenses')
      .select('*')
      .eq('shift_id', shiftId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching expenses:", error);
      return { success: false, error: error.message };
    }

    return { success: true, expenses: data || [] };
  } catch (err) {
    console.error("Unexpected error fetching expenses:", err);
    return { success: false, error: "Failed to fetch expenses" };
  }
};

export const getReceiptImageUrl = async (
  imagePath: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    console.log('🖼️ Getting receipt URL for path:', imagePath);
    
    // First check if the file exists
    const { data: fileData, error: fileError } = await supabase.storage
      .from('receipts')
      .list('', {
        search: imagePath.split('/').pop() // Get filename from path
      });
    
    if (fileError) {
      console.error('🖼️ Error checking file existence:', fileError);
      return { success: false, error: `File check failed: ${fileError.message}` };
    }
    
    console.log('🖼️ File search result:', fileData);
    
    // Generate the public URL
    const { data } = supabase.storage
      .from('receipts')
      .getPublicUrl(imagePath);

    console.log('🖼️ Generated public URL:', data.publicUrl);
    
    // Test if the URL is actually accessible
    try {
      const response = await fetch(data.publicUrl, { method: 'HEAD' });
      console.log('🖼️ URL accessibility test:', response.status, response.statusText);
      
      if (!response.ok) {
        return { 
          success: false, 
          error: `Image not accessible: ${response.status} ${response.statusText}` 
        };
      }
    } catch (fetchError) {
      console.error('🖼️ URL accessibility test failed:', fetchError);
      return { 
        success: false, 
        error: `URL not accessible: ${fetchError}` 
      };
    }

    return { success: true, url: data.publicUrl };
  } catch (err) {
    console.error("🖼️ Error getting receipt URL:", err);
    return { success: false, error: "Failed to get receipt URL" };
  }
};

// New function to get all expenses for multiple shifts
export const getExpensesForShifts = async (
  shiftIds: string[]
): Promise<{ success: boolean; expensesByShift?: Record<string, DatabaseExpense[]>; error?: string }> => {
  try {
    if (shiftIds.length === 0) {
      return { success: true, expensesByShift: {} };
    }

    const { data, error } = await supabase
      .from('shift_expenses')
      .select('*')
      .in('shift_id', shiftIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching expenses:", error);
      return { success: false, error: error.message };
    }

    // Group expenses by shift_id
    const expensesByShift: Record<string, DatabaseExpense[]> = {};
    (data || []).forEach(expense => {
      if (!expensesByShift[expense.shift_id]) {
        expensesByShift[expense.shift_id] = [];
      }
      expensesByShift[expense.shift_id].push(expense);
    });

    return { success: true, expensesByShift };
  } catch (err) {
    console.error("Unexpected error fetching expenses:", err);
    return { success: false, error: "Failed to fetch expenses" };
  }
};
