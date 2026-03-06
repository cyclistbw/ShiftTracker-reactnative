
import { supabase } from "@/lib/supabase";

export interface TaskData {
  task_type: string;
  started_at: string;
  ended_at: string;
  earnings: number;
}

export const processAndStoreTaskData = async (
  userId: string,
  tasks: TaskData[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!userId) {
      return { 
        success: false, 
        error: "User authentication required for data processing" 
      };
    }

    if (!tasks || tasks.length === 0) {
      return { 
        success: false, 
        error: "No task data provided" 
      };
    }

    // Process raw task data first
    const rawTaskData = tasks.map(task => ({
      user_id: userId, // Security: explicitly set user_id
      task_type: task.task_type,
      started_at: task.started_at,
      ended_at: task.ended_at,
      earnings: task.earnings
    }));

    const { error: rawError } = await supabase
      .from('dynamic_raw_task_data')
      .insert(rawTaskData);

    if (rawError) {
      console.error('Error inserting raw task data:', rawError);
      return { 
        success: false, 
        error: `Raw data error: ${rawError.message}` 
      };
    }

    // Process and store preprocessed task data
    const preprocessedTasks = tasks.map(task => {
      const startDate = new Date(task.started_at);
      const endDate = new Date(task.ended_at);
      const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      
      return {
        user_id: userId, // Security: explicitly set user_id
        task_type: task.task_type,
        started_at: task.started_at,
        ended_at: task.ended_at,
        earnings: task.earnings,
        work_day: startDate.toISOString().split('T')[0],
        day_of_week: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][startDate.getDay()],
        time_block: getTimeBlock(startDate),
        duration_hours: durationHours
      };
    });

    const { error: preprocessedError } = await supabase
      .from('dynamic_preprocessed_tasks')
      .insert(preprocessedTasks);

    if (preprocessedError) {
      console.error('Error inserting preprocessed task data:', preprocessedError);
      return { 
        success: false, 
        error: `Preprocessed data error: ${preprocessedError.message}` 
      };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception in processAndStoreTaskData:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};

const getTimeBlock = (date: Date): string => {
  const hour = date.getHours();
  if (hour < 2) return '00:00-02:00';
  if (hour < 4) return '02:00-04:00';
  if (hour < 6) return '04:00-06:00';
  if (hour < 8) return '06:00-08:00';
  if (hour < 10) return '08:00-10:00';
  if (hour < 12) return '10:00-12:00';
  if (hour < 14) return '12:00-14:00';
  if (hour < 16) return '14:00-16:00';
  if (hour < 18) return '16:00-18:00';
  if (hour < 20) return '18:00-20:00';
  if (hour < 22) return '20:00-22:00';
  return '22:00-23:59';
};

export const getUserTaskData = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error("User authentication required");
    }

    const { data, error } = await supabase
      .from('dynamic_preprocessed_tasks')
      .select('*')
      .eq('user_id', userId) // Security: only fetch user's own data
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching user task data:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('Exception in getUserTaskData:', err);
    throw err;
  }
};
