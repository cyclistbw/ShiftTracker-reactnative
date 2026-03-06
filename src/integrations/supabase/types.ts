export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_logs: {
        Row: {
          category: string
          component: string | null
          created_at: string
          function_name: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          platform: string | null
          session_id: string | null
          stack_trace: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          component?: string | null
          created_at?: string
          function_name?: string | null
          id?: string
          level?: string
          message: string
          metadata?: Json | null
          platform?: string | null
          session_id?: string | null
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          component?: string | null
          created_at?: string
          function_name?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          platform?: string | null
          session_id?: string | null
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_internal_links: {
        Row: {
          added: boolean | null
          anchor_text: string
          created_at: string
          id: string
          post_id: string
          rule_id: string | null
          section_hint: string | null
          target_post_id: string | null
          target_url: string
          updated_at: string
        }
        Insert: {
          added?: boolean | null
          anchor_text: string
          created_at?: string
          id?: string
          post_id: string
          rule_id?: string | null
          section_hint?: string | null
          target_post_id?: string | null
          target_url: string
          updated_at?: string
        }
        Update: {
          added?: boolean | null
          anchor_text?: string
          created_at?: string
          id?: string
          post_id?: string
          rule_id?: string | null
          section_hint?: string | null
          target_post_id?: string | null
          target_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_internal_links_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_internal_links_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "blog_link_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_internal_links_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_link_rules: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          match_case: boolean | null
          match_whole_word: boolean | null
          max_links_per_post: number | null
          phrase: string
          priority: number | null
          scope: string[]
          target_slug: string | null
          target_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          match_case?: boolean | null
          match_whole_word?: boolean | null
          max_links_per_post?: number | null
          phrase: string
          priority?: number | null
          scope?: string[]
          target_slug?: string | null
          target_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          match_case?: boolean | null
          match_whole_word?: boolean | null
          max_links_per_post?: number | null
          phrase?: string
          priority?: number | null
          scope?: string[]
          target_slug?: string | null
          target_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          content: string
          content_brief: string | null
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          linked_content: string | null
          meta_description: string | null
          meta_title: string | null
          optimization_notes: string | null
          published: boolean
          published_at: string | null
          search_atlas_id: string | null
          seo_score: number | null
          slug: string
          tags: string[] | null
          target_keywords: string[] | null
          title: string
          tldr: string | null
          updated_at: string
        }
        Insert: {
          author?: string
          content: string
          content_brief?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          linked_content?: string | null
          meta_description?: string | null
          meta_title?: string | null
          optimization_notes?: string | null
          published?: boolean
          published_at?: string | null
          search_atlas_id?: string | null
          seo_score?: number | null
          slug: string
          tags?: string[] | null
          target_keywords?: string[] | null
          title: string
          tldr?: string | null
          updated_at?: string
        }
        Update: {
          author?: string
          content?: string
          content_brief?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          linked_content?: string | null
          meta_description?: string | null
          meta_title?: string | null
          optimization_notes?: string | null
          published?: boolean
          published_at?: string | null
          search_atlas_id?: string | null
          seo_score?: number | null
          slug?: string
          tags?: string[] | null
          target_keywords?: string[] | null
          title?: string
          tldr?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_seo_metrics: {
        Row: {
          avg_position: number | null
          clicks: number | null
          created_at: string
          ctr: number | null
          date_range_end: string | null
          date_range_start: string | null
          engagement_rate: number | null
          id: string
          impressions: number | null
          pageviews: number | null
          post_id: string | null
          sessions: number | null
          slug: string
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          avg_position?: number | null
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          date_range_end?: string | null
          date_range_start?: string | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          pageviews?: number | null
          post_id?: string | null
          sessions?: number | null
          slug: string
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          avg_position?: number | null
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          date_range_end?: string | null
          date_range_start?: string | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          pageviews?: number | null
          post_id?: string | null
          sessions?: number | null
          slug?: string
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_seo_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_logs: {
        Row: {
          ai_response: string
          created_at: string
          id: string
          mode: string
          session_duration_seconds: number | null
          session_start: string | null
          updated_at: string
          user_id: string
          user_input: string
        }
        Insert: {
          ai_response: string
          created_at?: string
          id?: string
          mode: string
          session_duration_seconds?: number | null
          session_start?: string | null
          updated_at?: string
          user_id: string
          user_input: string
        }
        Update: {
          ai_response?: string
          created_at?: string
          id?: string
          mode?: string
          session_duration_seconds?: number | null
          session_start?: string | null
          updated_at?: string
          user_id?: string
          user_input?: string
        }
        Relationships: []
      }
      dynamic_csv_uploads: {
        Row: {
          created_at: string | null
          error_message: string | null
          filename: string
          id: string
          raw_csv_content: string | null
          row_count: number | null
          status: string | null
          upload_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          filename: string
          id?: string
          raw_csv_content?: string | null
          row_count?: number | null
          status?: string | null
          upload_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          filename?: string
          id?: string
          raw_csv_content?: string | null
          row_count?: number | null
          status?: string | null
          upload_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dynamic_heatmap_summary: {
        Row: {
          average_hourly: number
          day_of_week: string
          id: string
          last_updated: string | null
          month_year: string | null
          task_count: number
          task_type: string | null
          time_block: string
          total_earnings: number
          unique_work_days: number
          user_id: string
        }
        Insert: {
          average_hourly?: number
          day_of_week: string
          id?: string
          last_updated?: string | null
          month_year?: string | null
          task_count?: number
          task_type?: string | null
          time_block: string
          total_earnings?: number
          unique_work_days?: number
          user_id: string
        }
        Update: {
          average_hourly?: number
          day_of_week?: string
          id?: string
          last_updated?: string | null
          month_year?: string | null
          task_count?: number
          task_type?: string | null
          time_block?: string
          total_earnings?: number
          unique_work_days?: number
          user_id?: string
        }
        Relationships: []
      }
      dynamic_preprocessed_filtered_tasks: {
        Row: {
          created_at: string | null
          day_of_week: string
          duration_hours: number
          earnings: number
          ended_at: string
          filter_applied: string | null
          id: string
          started_at: string
          task_type: string
          time_block: string
          user_id: string
          work_day: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: string
          duration_hours: number
          earnings: number
          ended_at: string
          filter_applied?: string | null
          id?: string
          started_at: string
          task_type: string
          time_block: string
          user_id: string
          work_day: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: string
          duration_hours?: number
          earnings?: number
          ended_at?: string
          filter_applied?: string | null
          id?: string
          started_at?: string
          task_type?: string
          time_block?: string
          user_id?: string
          work_day?: string
        }
        Relationships: []
      }
      dynamic_preprocessed_tasks: {
        Row: {
          created_at: string | null
          day_of_week: string
          duration_hours: number
          earnings: number
          ended_at: string
          id: string
          started_at: string
          task_type: string
          time_block: string
          user_id: string
          work_day: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: string
          duration_hours: number
          earnings: number
          ended_at: string
          id?: string
          started_at: string
          task_type: string
          time_block: string
          user_id: string
          work_day: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: string
          duration_hours?: number
          earnings?: number
          ended_at?: string
          id?: string
          started_at?: string
          task_type?: string
          time_block?: string
          user_id?: string
          work_day?: string
        }
        Relationships: []
      }
      dynamic_raw_task_data: {
        Row: {
          created_at: string | null
          earnings: number
          ended_at: string
          id: string
          started_at: string
          task_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          earnings: number
          ended_at: string
          id?: string
          started_at: string
          task_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          earnings?: number
          ended_at?: string
          id?: string
          started_at?: string
          task_type?: string
          user_id?: string
        }
        Relationships: []
      }
      email_access_rate_limit: {
        Row: {
          access_count: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          user_email: string | null
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          access_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          access_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      email_subscribers: {
        Row: {
          created_at: string
          email: string
          expectations: string | null
          experience_length: string | null
          first_name: string
          gig_companies: string
          id: string
          last_name: string
          previous_apps: string | null
          previous_experience_feedback: string | null
          status: string
          top_features: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expectations?: string | null
          experience_length?: string | null
          first_name: string
          gig_companies: string
          id?: string
          last_name: string
          previous_apps?: string | null
          previous_experience_feedback?: string | null
          status?: string
          top_features: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expectations?: string | null
          experience_length?: string | null
          first_name?: string
          gig_companies?: string
          id?: string
          last_name?: string
          previous_apps?: string | null
          previous_experience_feedback?: string | null
          status?: string
          top_features?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_subscribers_audit: {
        Row: {
          access_granted: boolean | null
          access_timestamp: string | null
          accessed_by_email: string | null
          accessed_by_role: string | null
          accessed_by_user_id: string | null
          action_type: string
          additional_context: Json | null
          id: string
          ip_address: unknown
          target_subscriber_id: string | null
          user_agent: string | null
        }
        Insert: {
          access_granted?: boolean | null
          access_timestamp?: string | null
          accessed_by_email?: string | null
          accessed_by_role?: string | null
          accessed_by_user_id?: string | null
          action_type: string
          additional_context?: Json | null
          id?: string
          ip_address?: unknown
          target_subscriber_id?: string | null
          user_agent?: string | null
        }
        Update: {
          access_granted?: boolean | null
          access_timestamp?: string | null
          accessed_by_email?: string | null
          accessed_by_role?: string | null
          accessed_by_user_id?: string | null
          action_type?: string
          additional_context?: Json | null
          id?: string
          ip_address?: unknown
          target_subscriber_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          content: string
          created_at: string
          email: string | null
          id: number
          page_path: string | null
          plan_tier: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          email?: string | null
          id?: never
          page_path?: string | null
          plan_tier?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          email?: string | null
          id?: never
          page_path?: string | null
          plan_tier?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gsc_oauth_tokens: {
        Row: {
          access_token: string | null
          created_at: string
          expires_in: number | null
          id: string
          refresh_token: string
          scope: string | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_in?: number | null
          id?: string
          refresh_token: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_in?: number | null
          id?: string
          refresh_token?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pending_email_subscriptions: {
        Row: {
          created_at: string | null
          email: string
          expectations: string | null
          experience_length: string | null
          expires_at: string | null
          first_name: string
          gig_companies: string
          id: string
          ip_address: unknown
          last_name: string
          previous_apps: string | null
          previous_experience_feedback: string | null
          top_features: string
          user_agent: string | null
          verification_token: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expectations?: string | null
          experience_length?: string | null
          expires_at?: string | null
          first_name: string
          gig_companies: string
          id?: string
          ip_address?: unknown
          last_name: string
          previous_apps?: string | null
          previous_experience_feedback?: string | null
          top_features: string
          user_agent?: string | null
          verification_token: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expectations?: string | null
          experience_length?: string | null
          expires_at?: string | null
          first_name?: string
          gig_companies?: string
          id?: string
          ip_address?: unknown
          last_name?: string
          previous_apps?: string | null
          previous_experience_feedback?: string | null
          top_features?: string
          user_agent?: string | null
          verification_token?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          allowed: boolean | null
          feature_key: string
          id: number
          plan_name: string
          usage_limit: number | null
          value: string | null
        }
        Insert: {
          allowed?: boolean | null
          feature_key: string
          id?: number
          plan_name: string
          usage_limit?: number | null
          value?: string | null
        }
        Update: {
          allowed?: boolean | null
          feature_key?: string
          id?: number
          plan_name?: string
          usage_limit?: number | null
          value?: string | null
        }
        Relationships: []
      }
      seo_pages: {
        Row: {
          created_at: string
          id: string
          last_audited_at: string | null
          notes: string | null
          page_type: string | null
          route: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_audited_at?: string | null
          notes?: string | null
          page_type?: string | null
          route?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          last_audited_at?: string | null
          notes?: string | null
          page_type?: string | null
          route?: string | null
          url?: string
        }
        Relationships: []
      }
      seo_schema_registry: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          recommended_types: string[] | null
          schema_jsonld: string
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          recommended_types?: string[] | null
          schema_jsonld: string
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          recommended_types?: string[] | null
          schema_jsonld?: string
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      shift_expenses: {
        Row: {
          amount: number
          business_purpose: string
          created_at: string
          description: string
          expense_date: string
          id: string
          location: string
          receipt_image_path: string | null
          shift_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          business_purpose: string
          created_at?: string
          description: string
          expense_date: string
          id?: string
          location: string
          receipt_image_path?: string | null
          shift_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          business_purpose?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          location?: string
          receipt_image_path?: string | null
          shift_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shift_summaries: {
        Row: {
          created_at: string
          earnings: number | null
          end_time: string | null
          energy_level: number | null
          hours_worked: number | null
          id: string
          inserted_at: string | null
          is_mileage_only: boolean
          legacy_id: number
          miles_driven: number | null
          mood_score: number | null
          platform: string | null
          start_time: string | null
          stress_level: number | null
          summary_data: Json | null
          summary_mood: number | null
          tasks_completed: number | null
          total_expenses: number | null
          user_id: string
          wellness_checked_in_at: string | null
          wellness_notes: string | null
        }
        Insert: {
          created_at?: string
          earnings?: number | null
          end_time?: string | null
          energy_level?: number | null
          hours_worked?: number | null
          id: string
          inserted_at?: string | null
          is_mileage_only?: boolean
          legacy_id?: number
          miles_driven?: number | null
          mood_score?: number | null
          platform?: string | null
          start_time?: string | null
          stress_level?: number | null
          summary_data?: Json | null
          summary_mood?: number | null
          tasks_completed?: number | null
          total_expenses?: number | null
          user_id: string
          wellness_checked_in_at?: string | null
          wellness_notes?: string | null
        }
        Update: {
          created_at?: string
          earnings?: number | null
          end_time?: string | null
          energy_level?: number | null
          hours_worked?: number | null
          id?: string
          inserted_at?: string | null
          is_mileage_only?: boolean
          legacy_id?: number
          miles_driven?: number | null
          mood_score?: number | null
          platform?: string | null
          start_time?: string | null
          stress_level?: number | null
          summary_data?: Json | null
          summary_mood?: number | null
          tasks_completed?: number | null
          total_expenses?: number | null
          user_id?: string
          wellness_checked_in_at?: string | null
          wellness_notes?: string | null
        }
        Relationships: []
      }
      shift_summaries_import: {
        Row: {
          created_at: string
          earnings: number | null
          end_time: string | null
          energy_level: number | null
          hours_worked: number | null
          id: string
          import_date: string | null
          import_source: string | null
          inserted_at: string | null
          is_mileage_only: boolean
          legacy_id: number
          miles_driven: number | null
          mood_score: number | null
          platform: string | null
          start_time: string | null
          stress_level: number | null
          summary_data: Json | null
          summary_mood: number | null
          tasks_completed: number | null
          user_id: string
          wellness_checked_in_at: string | null
          wellness_notes: string | null
        }
        Insert: {
          created_at?: string
          earnings?: number | null
          end_time?: string | null
          energy_level?: number | null
          hours_worked?: number | null
          id: string
          import_date?: string | null
          import_source?: string | null
          inserted_at?: string | null
          is_mileage_only?: boolean
          legacy_id?: number
          miles_driven?: number | null
          mood_score?: number | null
          platform?: string | null
          start_time?: string | null
          stress_level?: number | null
          summary_data?: Json | null
          summary_mood?: number | null
          tasks_completed?: number | null
          user_id: string
          wellness_checked_in_at?: string | null
          wellness_notes?: string | null
        }
        Update: {
          created_at?: string
          earnings?: number | null
          end_time?: string | null
          energy_level?: number | null
          hours_worked?: number | null
          id?: string
          import_date?: string | null
          import_source?: string | null
          inserted_at?: string | null
          is_mileage_only?: boolean
          legacy_id?: number
          miles_driven?: number | null
          mood_score?: number | null
          platform?: string | null
          start_time?: string | null
          stress_level?: number | null
          summary_data?: Json | null
          summary_mood?: number | null
          tasks_completed?: number | null
          user_id?: string
          wellness_checked_in_at?: string | null
          wellness_notes?: string | null
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          content_type: string
          created_at: string
          has_auto_linking: boolean | null
          id: string
          is_pillar: boolean
          keywords: string[] | null
          last_linked_at: string | null
          linking_notes: string | null
          parent_pillar_id: string | null
          path: string
          title: string
          updated_at: string
        }
        Insert: {
          content_type: string
          created_at?: string
          has_auto_linking?: boolean | null
          id?: string
          is_pillar?: boolean
          keywords?: string[] | null
          last_linked_at?: string | null
          linking_notes?: string | null
          parent_pillar_id?: string | null
          path: string
          title: string
          updated_at?: string
        }
        Update: {
          content_type?: string
          created_at?: string
          has_auto_linking?: boolean | null
          id?: string
          is_pillar?: boolean
          keywords?: string[] | null
          last_linked_at?: string | null
          linking_notes?: string | null
          parent_pillar_id?: string | null
          path?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_pages_parent_pillar_id_fkey"
            columns: ["parent_pillar_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      sitemap_monitoring: {
        Row: {
          action_type: string
          blog_post_count: number | null
          created_at: string | null
          id: string
          response_data: Json | null
          status: string | null
          url_count: number | null
        }
        Insert: {
          action_type: string
          blog_post_count?: number | null
          created_at?: string | null
          id?: string
          response_data?: Json | null
          status?: string | null
          url_count?: number | null
        }
        Update: {
          action_type?: string
          blog_post_count?: number | null
          created_at?: string | null
          id?: string
          response_data?: Json | null
          status?: string | null
          url_count?: number | null
        }
        Relationships: []
      }
      subscriber_access_logs: {
        Row: {
          access_type: string
          accessed_by_email: string | null
          accessed_by_user_id: string | null
          created_at: string
          error_message: string | null
          function_called: string | null
          id: string
          ip_address: unknown
          subscriber_count: number | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_by_email?: string | null
          accessed_by_user_id?: string | null
          created_at?: string
          error_message?: string | null
          function_called?: string | null
          id?: string
          ip_address?: unknown
          subscriber_count?: number | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_by_email?: string | null
          accessed_by_user_id?: string | null
          created_at?: string
          error_message?: string | null
          function_called?: string | null
          id?: string
          ip_address?: unknown
          subscriber_count?: number | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      subscriber_access_rate_limit: {
        Row: {
          access_count: number | null
          blocked_until: string | null
          created_at: string
          email: string | null
          id: string
          ip_address: unknown
          user_id: string | null
          window_start: string
        }
        Insert: {
          access_count?: number | null
          blocked_until?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: unknown
          user_id?: string | null
          window_start?: string
        }
        Update: {
          access_count?: number | null
          blocked_until?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: unknown
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string
          trial_expires_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          created_at: string
          event_target: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_target?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_target?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_analytics_preferences: {
        Row: {
          component_name: string
          created_at: string
          filter_state: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          component_name: string
          created_at?: string
          filter_state: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          component_name?: string
          created_at?: string
          filter_state?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_business_settings: {
        Row: {
          business_name: string
          business_type: string
          clock_format: string | null
          created_at: string
          current_tax_year: string
          custom_weekly_goal: number | null
          dark_mode_preference: string | null
          default_mileage_rate: number
          enable_wellness_checkin: boolean
          expense_categories: string[] | null
          gig_platforms: string[] | null
          id: string
          last_activity_at: string | null
          mileage_calculation_method: string
          remember_me_preference: boolean | null
          skip_odometer_reading: boolean
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string
          business_type?: string
          clock_format?: string | null
          created_at?: string
          current_tax_year?: string
          custom_weekly_goal?: number | null
          dark_mode_preference?: string | null
          default_mileage_rate?: number
          enable_wellness_checkin?: boolean
          expense_categories?: string[] | null
          gig_platforms?: string[] | null
          id?: string
          last_activity_at?: string | null
          mileage_calculation_method?: string
          remember_me_preference?: boolean | null
          skip_odometer_reading?: boolean
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          business_type?: string
          clock_format?: string | null
          created_at?: string
          current_tax_year?: string
          custom_weekly_goal?: number | null
          dark_mode_preference?: string | null
          default_mileage_rate?: number
          enable_wellness_checkin?: boolean
          expense_categories?: string[] | null
          gig_platforms?: string[] | null
          id?: string
          last_activity_at?: string | null
          mileage_calculation_method?: string
          remember_me_preference?: boolean | null
          skip_odometer_reading?: boolean
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feature_usage: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          period_start: string
          period_type: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          period_start?: string
          period_type: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          period_start?: string
          period_type?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          content_mode_enabled: boolean
          created_at: string
          id: string
          location_permission_granted: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_mode_enabled?: boolean
          created_at?: string
          id?: string
          location_permission_granted?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_mode_enabled?: boolean
          created_at?: string
          id?: string
          location_permission_granted?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profile: {
        Row: {
          apps_used: string | null
          created_at: string
          help_goal: string | null
          id: string
          income_level: string | null
          main_reason: string | null
          onboarding_completed: boolean
          primary_goal: string | null
          tracks_mileage: string | null
          updated_at: string
          user_id: string
          wants_more_money: string | null
          work_frequency: string | null
          work_type: string | null
        }
        Insert: {
          apps_used?: string | null
          created_at?: string
          help_goal?: string | null
          id?: string
          income_level?: string | null
          main_reason?: string | null
          onboarding_completed?: boolean
          primary_goal?: string | null
          tracks_mileage?: string | null
          updated_at?: string
          user_id: string
          wants_more_money?: string | null
          work_frequency?: string | null
          work_type?: string | null
        }
        Update: {
          apps_used?: string | null
          created_at?: string
          help_goal?: string | null
          id?: string
          income_level?: string | null
          main_reason?: string | null
          onboarding_completed?: boolean
          primary_goal?: string | null
          tracks_mileage?: string | null
          updated_at?: string
          user_id?: string
          wants_more_money?: string | null
          work_frequency?: string | null
          work_type?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          target_user_email: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          target_user_email?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          target_user_email?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_accessed_at: string
          remember_me: boolean
          session_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          last_accessed_at?: string
          remember_me?: boolean
          session_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string
          remember_me?: boolean
          session_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_vehicles: {
        Row: {
          created_at: string
          end_year_mileage: number | null
          id: string
          is_default: boolean
          make: string
          mileage_rate: number
          model: string
          name: string
          start_year_mileage: number | null
          updated_at: string
          user_id: string
          year: string
        }
        Insert: {
          created_at?: string
          end_year_mileage?: number | null
          id?: string
          is_default?: boolean
          make: string
          mileage_rate?: number
          model: string
          name: string
          start_year_mileage?: number | null
          updated_at?: string
          user_id: string
          year: string
        }
        Update: {
          created_at?: string
          end_year_mileage?: number | null
          id?: string
          is_default?: boolean
          make?: string
          mileage_rate?: number
          model?: string
          name?: string
          start_year_mileage?: number | null
          updated_at?: string
          user_id?: string
          year?: string
        }
        Relationships: []
      }
    }
    Views: {
      email_subscribers_masked: {
        Row: {
          created_at: string | null
          email_masked: string | null
          first_name_masked: string | null
          gig_companies_masked: string | null
          id: string | null
          last_name_masked: string | null
          status: string | null
          top_features_masked: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_masked?: never
          first_name_masked?: never
          gig_companies_masked?: never
          id?: string | null
          last_name_masked?: never
          status?: string | null
          top_features_masked?: never
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_masked?: never
          first_name_masked?: never
          gig_companies_masked?: never
          id?: string | null
          last_name_masked?: never
          status?: string | null
          top_features_masked?: never
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_get_logs: {
        Args: {
          p_category?: string
          p_level?: string
          p_limit?: number
          p_user_id?: string
        }
        Returns: {
          category: string
          component: string
          created_at: string
          function_name: string
          id: string
          level: string
          message: string
          metadata: Json
          platform: string
          user_id: string
        }[]
      }
      admin_get_safe_logs: {
        Args: {
          p_category?: string
          p_component?: string
          p_level?: string
          p_limit?: number
          p_offset?: number
          p_user_id?: string
        }
        Returns: {
          category: string
          component: string
          created_at: string
          function_name: string
          id: string
          level: string
          message: string
          metadata: Json
          platform: string
          session_id: string
          url: string
          user_agent: string
          user_id: string
        }[]
      }
      analyze_subscriber_access_patterns: { Args: never; Returns: Json }
      apply_date_filter_to_tasks: {
        Args: {
          p_end_date?: string
          p_filter_type?: string
          p_month?: number
          p_quarter?: number
          p_start_date?: string
          p_user_id: string
          p_year?: number
        }
        Returns: boolean
      }
      check_subscriber_access_rate_limit: {
        Args: { p_ip_address?: unknown }
        Returns: boolean
      }
      check_subscription_rate_limit: {
        Args: { p_email?: string; p_ip_address?: unknown }
        Returns: boolean
      }
      check_usage_limit: {
        Args: {
          p_feature_key: string
          p_period_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      cleanup_expired_sessions: { Args: never; Returns: number }
      cleanup_expired_sessions_secure: { Args: never; Returns: number }
      cleanup_old_logs: { Args: never; Returns: undefined }
      create_pending_subscription: {
        Args: {
          p_email: string
          p_expectations?: string
          p_experience_length?: string
          p_first_name: string
          p_gig_companies: string
          p_ip_address?: unknown
          p_last_name: string
          p_previous_apps?: string
          p_previous_experience_feedback?: string
          p_top_features: string
          p_user_agent?: string
        }
        Returns: Json
      }
      create_user_session: {
        Args: { p_remember_me?: boolean; p_user_id: string }
        Returns: string
      }
      decrypt_pii: { Args: { encrypted_data: string }; Returns: string }
      decrypt_subscriber_pii: {
        Args: { encrypted_data: string }
        Returns: string
      }
      delete_subscriber_data_secure: {
        Args: { subscriber_email: string }
        Returns: Json
      }
      email_security_final_report: { Args: never; Returns: Json }
      encrypt_pii: { Args: { data_to_encrypt: string }; Returns: string }
      encrypt_subscriber_pii: { Args: { raw_data: string }; Returns: string }
      enhanced_email_admin_access_check: { Args: never; Returns: boolean }
      enhanced_subscriber_rate_limit: { Args: never; Returns: boolean }
      export_subscriber_data_secure: {
        Args: { subscriber_email: string }
        Returns: Json
      }
      final_view_security_validation: { Args: never; Returns: Json }
      generate_secure_session_token: { Args: never; Returns: string }
      get_current_usage: {
        Args: {
          p_feature_key: string
          p_period_type?: string
          p_user_id: string
        }
        Returns: number
      }
      get_day_abbrev: { Args: { input_date: string }; Returns: string }
      get_days_since_last_sitemap_ping: { Args: never; Returns: number }
      get_email_subscriber_admin_view: {
        Args: { subscriber_id: string }
        Returns: {
          created_at: string
          email: string
          first_name: string
          gig_companies: string
          id: string
          last_name: string
          status: string
          top_features: string
          updated_at: string
        }[]
      }
      get_email_subscribers_for_sync_secure: {
        Args: never
        Returns: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          status: string
        }[]
      }
      get_protected_subscriber_data: {
        Args: never
        Returns: {
          created_at: string
          email_display: string
          expectations: string
          experience_length: string
          feedback_display: string
          first_name: string
          gig_companies: string
          id: string
          last_name: string
          previous_apps: string
          status: string
          top_features: string
          updated_at: string
        }[]
      }
      get_public_blog_post: { Args: { post_slug: string }; Returns: Json }
      get_public_blog_posts: { Args: never; Returns: Json }
      get_public_subscriber_count: { Args: never; Returns: number }
      get_published_blog_posts_for_sitemap: {
        Args: never
        Returns: {
          published_at: string
          slug: string
          updated_at: string
        }[]
      }
      get_safe_logs: {
        Args: {
          p_category?: string
          p_component?: string
          p_level?: string
          p_limit?: number
          p_offset?: number
          p_user_id?: string
        }
        Returns: {
          category: string
          component: string
          created_at: string
          function_name: string
          id: string
          level: string
          message: string
          metadata: Json
          platform: string
          session_id: string
          url: string
          user_agent: string
          user_id: string
        }[]
      }
      get_safe_subscriber_count: { Args: never; Returns: number }
      get_safe_subscriber_stats: { Args: never; Returns: Json }
      get_secure_subscriber_metrics: { Args: never; Returns: Json }
      get_single_subscriber_for_sync: {
        Args: { subscriber_id: string }
        Returns: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          status: string
        }[]
      }
      get_sitemap_health: { Args: never; Returns: Json }
      get_subscriber_count_public: { Args: never; Returns: number }
      get_subscriber_data_secure: {
        Args: { p_access_type?: string; p_limit?: number }
        Returns: {
          created_at: string
          email: string
          first_name: string
          id: string
          status: string
        }[]
      }
      get_subscriber_summary_secure: {
        Args: never
        Returns: {
          active_subscribers: number
          common_features: Json
          recent_signups_7d: number
          top_gig_platforms: Json
          total_count: number
        }[]
      }
      get_time_block:
        | { Args: never; Returns: undefined }
        | { Args: { input_time: string }; Returns: string }
      get_user_data_by_email: {
        Args: { target_email: string }
        Returns: {
          business_settings: Json
          chat_logs: Json
          expenses: Json
          shifts: Json
          user_id: string
          vehicles: Json
        }[]
      }
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      get_user_logs: {
        Args: {
          p_category?: string
          p_level?: string
          p_limit?: number
          p_user_id?: string
        }
        Returns: {
          category: string
          component: string
          created_at: string
          function_name: string
          id: string
          level: string
          message: string
          metadata: Json
          platform: string
        }[]
      }
      get_user_subscription: {
        Args: { p_user_id?: string }
        Returns: {
          created_at: string
          email: string
          subscribed: boolean
          subscription_end: string
          subscription_tier: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_email?: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role_for_user: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_email?: string
          _user_id: string
        }
        Returns: boolean
      }
      hash_session_token: { Args: { token_input: string }; Returns: string }
      increment_feature_usage: {
        Args: {
          p_feature_key: string
          p_increment?: number
          p_period_type?: string
          p_user_id: string
        }
        Returns: number
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_service_role_for_subscriptions: { Args: never; Returns: boolean }
      log_email_subscriber_access: {
        Args: {
          access_type: string
          function_name?: string
          subscriber_count?: number
        }
        Returns: undefined
      }
      log_event: {
        Args: {
          p_category?: string
          p_component?: string
          p_function_name?: string
          p_level?: string
          p_message?: string
          p_metadata?: Json
          p_user_id?: string
        }
        Returns: string
      }
      log_secure_email_access: {
        Args: { p_access_type: string; p_success?: boolean }
        Returns: undefined
      }
      log_subscriber_access_enhanced: {
        Args: {
          p_access_type: string
          p_error_message?: string
          p_function_name?: string
          p_ip_address?: unknown
          p_subscriber_count?: number
          p_success?: boolean
        }
        Returns: string
      }
      mask_subscriber_pii: { Args: { raw_data: string }; Returns: string }
      monitor_email_subscriber_security: { Args: never; Returns: Json }
      refresh_dynamic_heatmap_summary: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      revoke_user_session: {
        Args: { p_session_token: string }
        Returns: boolean
      }
      sanitize_log_metadata: { Args: { input_metadata: Json }; Returns: Json }
      secure_admin_check: { Args: never; Returns: boolean }
      secure_create_subscription: {
        Args: {
          p_email: string
          p_expectations?: string
          p_experience_length?: string
          p_first_name: string
          p_gig_companies: string
          p_last_name: string
          p_previous_apps?: string
          p_previous_experience_feedback?: string
          p_top_features: string
        }
        Returns: Json
      }
      secure_email_access_check: { Args: never; Returns: boolean }
      secure_service_role_check: { Args: never; Returns: boolean }
      secure_session_operations_check: { Args: never; Returns: boolean }
      subscriber_security_report: { Args: never; Returns: Json }
      update_shift_expenses_total: {
        Args: { p_shift_id: string }
        Returns: undefined
      }
      update_user_subscription: {
        Args: {
          p_email: string
          p_stripe_customer_id?: string
          p_subscribed?: boolean
          p_subscription_end?: string
          p_subscription_tier?: string
          p_user_id: string
        }
        Returns: boolean
      }
      validate_email_security: { Args: never; Returns: Json }
      validate_email_subscribers_final_security: { Args: never; Returns: Json }
      validate_session_security: { Args: never; Returns: Json }
      validate_user_session: {
        Args: { p_session_token: string }
        Returns: {
          expires_at: string
          is_valid: boolean
          remember_me: boolean
          user_id: string
        }[]
      }
      validate_user_session_secure: {
        Args: { p_session_token: string }
        Returns: {
          expires_at: string
          is_valid: boolean
          remember_me: boolean
          user_id: string
        }[]
      }
      validate_view_security: { Args: never; Returns: Json }
      verify_active_admin_session: { Args: never; Returns: boolean }
      verify_email_subscribers_security: { Args: never; Returns: Json }
      verify_email_subscription: {
        Args: { p_verification_token: string }
        Returns: Json
      }
      verify_subscriber_security_complete: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "user" | "readonly_support" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "readonly_support", "admin"],
    },
  },
} as const
