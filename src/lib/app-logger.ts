// 🚩 FLAG: Web version uses navigator.userAgent, window.location.href, window.appLogger.
// RN replacements: Platform.OS/Platform.Version for device info, URL removed, global export removed.

import { Platform } from "react-native";
import { supabase } from "@/integrations/supabase/client";

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type LogCategory =
  | 'photo_upload'
  | 'expense_save'
  | 'shift_create'
  | 'shift_edit'
  | 'auth'
  | 'navigation'
  | 'dialog_state'
  | 'form_submission'
  | 'camera_capture'
  | 'storage_upload'
  | 'database_operation'
  | 'general';

interface LogData {
  level?: LogLevel;
  category: LogCategory;
  message: string;
  component?: string;
  functionName?: string;
  metadata?: Record<string, any>;
  error?: Error;
}

class AppLogger {
  private sessionId: string;

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async log(data: LogData): Promise<void> {
    try {
      const consoleMessage = `[${data.level?.toUpperCase()}] ${data.category}/${data.component || 'unknown'}${data.functionName ? `::${data.functionName}` : ''}: ${data.message}`;

      switch (data.level) {
        case 'error':
        case 'critical':
          console.error(consoleMessage, data.metadata || {});
          if (data.error) console.error(data.error);
          break;
        case 'warn':
          console.warn(consoleMessage, data.metadata || {});
          break;
        case 'debug':
          console.debug(consoleMessage, data.metadata || {});
          break;
        default:
          console.log(consoleMessage, data.metadata || {});
      }

      const metadata = {
        ...data.metadata,
        // 🚩 FLAG: navigator.userAgent → Platform.OS + Platform.Version
        userAgent: `${Platform.OS}/${Platform.Version}`,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId
      };

      // Log to Supabase (don't await to avoid blocking the UI)
      supabase
        .from('app_logs')
        .insert({
          session_id: this.sessionId,
          level: data.level || 'info',
          category: data.category,
          message: data.message,
          component: data.component,
          function_name: data.functionName,
          // 🚩 FLAG: 'web' → Platform.OS (e.g. 'ios', 'android')
          platform: Platform.OS,
          // 🚩 FLAG: navigator.userAgent → Platform string
          user_agent: `${Platform.OS}/${Platform.Version}`,
          // 🚩 FLAG: window.location.href removed — no URL concept in RN
          url: null,
          metadata,
          stack_trace: data.error?.stack
        })
        .then(({ error }) => {
          if (error) {
            console.warn('Failed to log to Supabase:', error);
          }
        });

    } catch (err) {
      console.error('AppLogger error:', err);
    }
  }

  debug(category: LogCategory, message: string, component?: string, functionName?: string, metadata?: Record<string, any>) {
    return this.log({ level: 'debug', category, message, component, functionName, metadata });
  }

  info(category: LogCategory, message: string, component?: string, functionName?: string, metadata?: Record<string, any>) {
    return this.log({ level: 'info', category, message, component, functionName, metadata });
  }

  warn(category: LogCategory, message: string, component?: string, functionName?: string, metadata?: Record<string, any>) {
    return this.log({ level: 'warn', category, message, component, functionName, metadata });
  }

  error(category: LogCategory, message: string, component?: string, functionName?: string, error?: Error, metadata?: Record<string, any>) {
    return this.log({ level: 'error', category, message, component, functionName, error, metadata });
  }

  critical(category: LogCategory, message: string, component?: string, functionName?: string, error?: Error, metadata?: Record<string, any>) {
    return this.log({ level: 'critical', category, message, component, functionName, error, metadata });
  }

  photoUpload(message: string, component: string, functionName?: string, metadata?: Record<string, any>) {
    return this.info('photo_upload', message, component, functionName, metadata);
  }

  expenseSave(message: string, component: string, functionName?: string, metadata?: Record<string, any>) {
    return this.info('expense_save', message, component, functionName, metadata);
  }

  dialogState(message: string, component: string, functionName?: string, metadata?: Record<string, any>) {
    return this.debug('dialog_state', message, component, functionName, metadata);
  }

  cameraCapture(message: string, component: string, functionName?: string, metadata?: Record<string, any>) {
    return this.info('camera_capture', message, component, functionName, metadata);
  }

  async getRecentLogs(category?: LogCategory, limit: number = 50) {
    try {
      let query = supabase
        .from('app_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch logs:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching logs:', err);
      return [];
    }
  }
}

// Create a singleton instance
export const appLogger = new AppLogger();

// 🚩 FLAG: window.appLogger assignment removed — no window object in React Native.
// Import appLogger directly from this module where needed.
