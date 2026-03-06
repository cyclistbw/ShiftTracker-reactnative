
import { supabase } from "./supabase";
import { Shift } from "@/types/shift";
import { deleteExpensesForShift } from "./expense-storage";
import { requireAuthentication } from "./security-utils";

/**
 * Sync a completed shift to the Supabase database
 * @param shift The completed shift to sync
 * @returns Object with success status and optional error message
 */
export const syncShiftToSupabase = async (
  shift: Shift
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!shift.endTime) {
      return { 
        success: false, 
        error: "Cannot sync an active shift. Shift must be ended first."
      };
    }

    // Ensure user is authenticated and get their ID
    const userId = await requireAuthentication();

    // Calculate mileage
    const milesDriven = shift.mileageEnd && shift.mileageStart 
      ? shift.mileageEnd - shift.mileageStart 
      : 0;

    // Create a simplified version of the expenses array to ensure JSON compatibility
    const simplifiedExpenses = shift.expenses.map(exp => ({
      id: exp.id,
      description: exp.description,
      amount: exp.amount,
      timestamp: exp.timestamp instanceof Date ? exp.timestamp.toISOString() : exp.timestamp,
      date: exp.date instanceof Date ? exp.date.toISOString() : exp.date,
      location: exp.location,
      businessPurpose: exp.businessPurpose,
      receiptImage: exp.receiptImage
    }));

    // Create a simplified version of the locations array to ensure JSON compatibility
    const simplifiedLocations = shift.locations ? shift.locations.map(loc => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      timestamp: loc.timestamp instanceof Date ? loc.timestamp.toISOString() : loc.timestamp
    })) : [];

    // First, check if there's already a shift with the same ID in the database using a simpler query
    const { data: existingShifts, error: queryError } = await supabase
      .from('shift_summaries')
      .select('id')
      .eq('id', String(shift.id))  // Convert to string for the new schema
      .eq('user_id', userId) // Ensure we only check user's own shifts
      .limit(1);
    
    // If direct ID query fails, try JSON path search as a last resort
    if (queryError || !existingShifts || existingShifts.length === 0) {
      console.log("No direct ID match found, trying JSON path search");
      
      let jsonMatches;
      let jsonError;
      
      try {
        // Explicitly cast shift.id to string type to match the new schema
        const shiftId: string = String(shift.id);

        // Use the correct JSON path operator for the query
        const { data, error } = await supabase
          .from('shift_summaries')
          .select('id')
          .eq('user_id', userId) // Ensure we only search user's own shifts
          .filter('summary_data->shift->>id', 'eq', shiftId)
          .limit(1);
          
        jsonMatches = data;
        jsonError = error;
      } catch (err) {
        console.error("Error in JSON path search:", err);
        jsonError = err;
      }
      
      if (!jsonError && jsonMatches && jsonMatches.length > 0) {
        console.log(`Found existing shift via JSON path with ID ${jsonMatches[0].id}`);
        
        // Update existing shift
        const { error: updateError } = await supabase
          .from('shift_summaries')
          .update({
            start_time: new Date(shift.startTime).toISOString(),
            end_time: shift.endTime ? new Date(shift.endTime).toISOString() : null,
            earnings: shift.income,
            miles_driven: milesDriven,
            tasks_completed: shift.tasksCompleted || 0,
            platform: shift.platform || null, // Add platform field
            // Add wellness fields
            mood_score: shift.moodScore || null,
            energy_level: shift.energyLevel || null,
            stress_level: shift.stressLevel || null,
          wellness_notes: shift.wellnessNotes || null,
          wellness_checked_in_at: shift.wellnessCheckedInAt ? shift.wellnessCheckedInAt : null,
          is_mileage_only: shift.isMileageOnly || false,
          summary_data: JSON.stringify({
              shift: {
                ...shift,
                startTime: new Date(shift.startTime).toISOString(),
                endTime: shift.endTime ? new Date(shift.endTime).toISOString() : null,
                pauseTime: shift.pauseTime ? new Date(shift.pauseTime).toISOString() : null,
                expenses: simplifiedExpenses,
                locations: simplifiedLocations
              }
            })
          })
          .eq('id', jsonMatches[0].id)
          .eq('user_id', userId); // Ensure user can only update their own shifts
        
        if (updateError) {
          console.error("Error updating existing shift via JSON path:", updateError);
          return { 
            success: false, 
            error: `Database error when updating: ${updateError.message}`
          };
        }
        
        return { success: true };
      }
    }

    // If we found an existing shift by direct ID, update it
    if (existingShifts && existingShifts.length > 0) {
      console.log(`Shift with ID ${existingShifts[0].id} already exists, updating...`);
      
      const { error: updateError } = await supabase
        .from('shift_summaries')
        .update({
          start_time: new Date(shift.startTime).toISOString(),
          end_time: shift.endTime ? new Date(shift.endTime).toISOString() : null,
          earnings: shift.income,
          miles_driven: milesDriven,
          tasks_completed: shift.tasksCompleted || 0,
          platform: shift.platform || null, // Add platform field
          // Add wellness fields
          mood_score: shift.moodScore || null,
          energy_level: shift.energyLevel || null,
          stress_level: shift.stressLevel || null,
          wellness_notes: shift.wellnessNotes || null,
          wellness_checked_in_at: shift.wellnessCheckedInAt ? shift.wellnessCheckedInAt : null,
          is_mileage_only: shift.isMileageOnly || false,
          summary_data: JSON.stringify({
            shift: {
              ...shift,
              startTime: new Date(shift.startTime).toISOString(),
              endTime: shift.endTime ? new Date(shift.endTime).toISOString() : null,
              pauseTime: shift.pauseTime ? new Date(shift.pauseTime).toISOString() : null,
              expenses: simplifiedExpenses,
              locations: simplifiedLocations
            }
          })
        })
        .eq('id', existingShifts[0].id)
        .eq('user_id', userId); // Ensure user can only update their own shifts
      
      if (updateError) {
        console.error("Error updating existing shift:", updateError);
        return { 
          success: false, 
          error: `Database error when updating: ${updateError.message}`
        };
      }
      
      return { success: true };
    }

    // No existing record found, create a new one with the shift ID as string
    const shiftSummary = {
      id: String(shift.id), // Use the shift ID directly as a string
      user_id: userId, // Explicitly set the user_id
      created_at: new Date().toISOString(),
      start_time: new Date(shift.startTime).toISOString(),
      end_time: new Date(shift.endTime).toISOString(),
      earnings: shift.income,
      miles_driven: milesDriven,
      tasks_completed: shift.tasksCompleted || 0,
      platform: shift.platform || null, // Add platform field
      // Add wellness fields
      mood_score: shift.moodScore || null,
      energy_level: shift.energyLevel || null,
      stress_level: shift.stressLevel || null,
      wellness_notes: shift.wellnessNotes || null,
      wellness_checked_in_at: shift.wellnessCheckedInAt ? shift.wellnessCheckedInAt : null,
      is_mileage_only: shift.isMileageOnly || false,
      summary_data: JSON.stringify({
        shift: {
          ...shift,
          startTime: new Date(shift.startTime).toISOString(),
          endTime: shift.endTime ? new Date(shift.endTime).toISOString() : null,
          pauseTime: shift.pauseTime ? new Date(shift.pauseTime).toISOString() : null,
          expenses: simplifiedExpenses,
          locations: simplifiedLocations
        }
      })
    };

    // Insert to Supabase with our string ID and user_id
    console.log(`Inserting new shift with ID ${shift.id} for user ${userId}`);
    const { error } = await supabase
      .from('shift_summaries')
      .insert(shiftSummary);

    if (error) {
      console.error("Error syncing shift to Supabase:", error);
      return { 
        success: false, 
        error: `Database error: ${error.message}`
      };
    }

    return { success: true };
  } catch (err) {
    console.error("Exception syncing shift to Supabase:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error syncing shift"
    };
  }
};

/**
 * Delete a shift from Supabase database
 * @param shiftId The ID of the shift to delete
 * @returns Object with success status and optional error message
 */
export const deleteShiftFromSupabase = async (
  shiftId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`Attempting to delete shift with ID: ${shiftId}`);
    
    // Ensure user is authenticated
    const userId = await requireAuthentication();
    
    // First, delete all expenses associated with this shift
    console.log(`Deleting expenses for shift: ${shiftId}`);
    const expenseDeleteResult = await deleteExpensesForShift(shiftId);
    
    if (!expenseDeleteResult.success) {
      console.error(`Failed to delete expenses: ${expenseDeleteResult.error}`);
      // Continue with shift deletion even if expense deletion fails
    } else {
      console.log('Successfully deleted expenses for shift');
    }
    
    // Determine which table to delete from based on the shift ID prefix
    let actualId: string;
    
    if (shiftId.startsWith('supabase-')) {
      actualId = shiftId.replace('supabase-', '');
      
      console.log(`Deleting from shift_summaries, ID: ${actualId}`);
      
      const { error: deleteError, count } = await supabase
        .from('shift_summaries')
        .delete({ count: 'exact' })
        .eq('id', actualId)
        .eq('user_id', userId); // Ensure user can only delete their own shifts
      
      if (deleteError) {
        console.error(`Error deleting from shift_summaries:`, deleteError);
        return { 
          success: false, 
          error: `Database error: ${deleteError.message}`
        };
      }
      
      if (count === 0) {
        console.log("Shift not found in shift_summaries");
        return { 
          success: false, 
          error: "Shift not found in database"
        };
      }
      
      console.log(`Successfully deleted ${count} row(s) from shift_summaries`);
      return { success: true };
      
    } else if (shiftId.startsWith('import-')) {
      actualId = shiftId.replace('import-', '');
      
      console.log(`Deleting from shift_summaries_import, ID: ${actualId}`);
      
      const { error: deleteError, count } = await supabase
        .from('shift_summaries_import')
        .delete({ count: 'exact' })
        .eq('id', actualId)
        .eq('user_id', userId); // Ensure user can only delete their own shifts
      
      if (deleteError) {
        console.error(`Error deleting from shift_summaries_import:`, deleteError);
        return { 
          success: false, 
          error: `Database error: ${deleteError.message}`
        };
      }
      
      if (count === 0) {
        console.log("Shift not found in shift_summaries_import");
        return { 
          success: false, 
          error: "Shift not found in database"
        };
      }
      
      console.log(`Successfully deleted ${count} row(s) from shift_summaries_import`);
      return { success: true };
      
    } else {
      // For local shifts that might have been synced, try both tables
      actualId = shiftId;
      
      console.log(`Trying to delete from shift_summaries first, ID: ${actualId}`);
      
      // Try to delete from the primary table first
      const { error: deleteError, count } = await supabase
        .from('shift_summaries')
        .delete({ count: 'exact' })
        .eq('id', actualId)
        .eq('user_id', userId); // Ensure user can only delete their own shifts
      
      if (deleteError) {
        console.error(`Error deleting from shift_summaries:`, deleteError);
        return { 
          success: false, 
          error: `Database error: ${deleteError.message}`
        };
      }
      
      // If no rows were deleted, try the import table
      if (count === 0) {
        console.log("No rows deleted from shift_summaries, trying shift_summaries_import...");
        
        const { error: importDeleteError, count: importCount } = await supabase
          .from('shift_summaries_import')
          .delete({ count: 'exact' })
          .eq('id', actualId)
          .eq('user_id', userId); // Ensure user can only delete their own shifts
        
        if (importDeleteError) {
          console.error("Error deleting from shift_summaries_import:", importDeleteError);
          return { 
            success: false, 
            error: `Database error: ${importDeleteError.message}`
          };
        }
        
        if (importCount === 0) {
          console.log("Shift not found in either table");
          return { 
            success: false, 
            error: "Shift not found in database"
          };
        }
        
        console.log(`Successfully deleted shift from shift_summaries_import`);
      } else {
        console.log(`Successfully deleted ${count} row(s) from shift_summaries`);
      }
      
      return { success: true };
    }
  } catch (err) {
    console.error("Exception deleting shift from Supabase:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error deleting shift"
    };
  }
};
