export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          ip: unknown
          request_id: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: number
          ip?: unknown
          request_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: number
          ip?: unknown
          request_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          dropoff_label: string
          dropoff_point: unknown
          id: string
          notes: string | null
          passenger_count: number
          pickup_label: string
          pickup_point: unknown
          rider_id: string
          scheduled_pickup_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          type: Database["public"]["Enums"]["booking_kind"]
          updated_at: string
          vehicle_type_requested: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          created_at?: string
          dropoff_label: string
          dropoff_point: unknown
          id?: string
          notes?: string | null
          passenger_count?: number
          pickup_label: string
          pickup_point: unknown
          rider_id: string
          scheduled_pickup_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          type: Database["public"]["Enums"]["booking_kind"]
          updated_at?: string
          vehicle_type_requested?: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          created_at?: string
          dropoff_label?: string
          dropoff_point?: unknown
          id?: string
          notes?: string | null
          passenger_count?: number
          pickup_label?: string
          pickup_point?: unknown
          rider_id?: string
          scheduled_pickup_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          type?: Database["public"]["Enums"]["booking_kind"]
          updated_at?: string
          vehicle_type_requested?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rules: {
        Row: {
          applies_to: string
          country: string
          created_at: string
          doc_type: string
          id: string
          is_required: boolean
          notes: string | null
          state: string | null
          updated_at: string
          validity_window_days: number | null
        }
        Insert: {
          applies_to: string
          country?: string
          created_at?: string
          doc_type: string
          id?: string
          is_required?: boolean
          notes?: string | null
          state?: string | null
          updated_at?: string
          validity_window_days?: number | null
        }
        Update: {
          applies_to?: string
          country?: string
          created_at?: string
          doc_type?: string
          id?: string
          is_required?: boolean
          notes?: string | null
          state?: string | null
          updated_at?: string
          validity_window_days?: number | null
        }
        Relationships: []
      }
      driver_documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["driver_doc_type"]
          driver_id: string
          expires_on: string | null
          id: string
          issued_on: string | null
          review_notes: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["driver_doc_type"]
          driver_id: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          review_notes?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["driver_doc_type"]
          driver_id?: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          review_notes?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "driver_documents_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_location_history: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading_deg: number | null
          id: number
          point: unknown
          recorded_at: string
          speed_mps: number | null
          trip_id: string | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading_deg?: number | null
          id?: number
          point: unknown
          recorded_at?: string
          speed_mps?: number | null
          trip_id?: string | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading_deg?: number | null
          id?: number
          point?: unknown
          recorded_at?: string
          speed_mps?: number | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_location_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "driver_location_history_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_location_latest: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading_deg: number | null
          point: unknown
          recorded_at: string
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading_deg?: number | null
          point: unknown
          recorded_at?: string
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading_deg?: number | null
          point?: unknown
          recorded_at?: string
          speed_mps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_location_latest_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_profiles: {
        Row: {
          authority_expiry: string | null
          authority_number: string | null
          created_at: string
          fatigue_locked_until: string | null
          last_known_vehicle_id: string | null
          licence_class: string | null
          licence_expiry: string | null
          licence_number: string | null
          notes: string | null
          status: Database["public"]["Enums"]["driver_approval_status"]
          stripe_account_id: string | null
          stripe_account_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          authority_expiry?: string | null
          authority_number?: string | null
          created_at?: string
          fatigue_locked_until?: string | null
          last_known_vehicle_id?: string | null
          licence_class?: string | null
          licence_expiry?: string | null
          licence_number?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["driver_approval_status"]
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          authority_expiry?: string | null
          authority_number?: string | null
          created_at?: string
          fatigue_locked_until?: string | null
          last_known_vehicle_id?: string | null
          licence_class?: string | null
          licence_expiry?: string | null
          licence_number?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["driver_approval_status"]
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_last_known_vehicle_id_fkey"
            columns: ["last_known_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_status: {
        Row: {
          driver_id: string
          ended_at: string | null
          id: string
          last_heartbeat_at: string
          started_at: string
          status: Database["public"]["Enums"]["driver_status_kind"]
          vehicle_id: string | null
        }
        Insert: {
          driver_id: string
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string
          started_at?: string
          status: Database["public"]["Enums"]["driver_status_kind"]
          vehicle_id?: string | null
        }
        Update: {
          driver_id?: string
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string
          started_at?: string
          status?: Database["public"]["Enums"]["driver_status_kind"]
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_status_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "driver_status_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fare_estimates: {
        Row: {
          booking_id: string | null
          created_at: string
          distance_m: number
          dropoff_point: unknown
          duration_s: number
          expires_at: string
          fare_rule_id: string | null
          id: string
          pickup_point: unknown
          rider_id: string
          subtotal_cents: number
          surcharges_cents: number
          total_cents: number
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          distance_m: number
          dropoff_point: unknown
          duration_s: number
          expires_at: string
          fare_rule_id?: string | null
          id?: string
          pickup_point: unknown
          rider_id: string
          subtotal_cents: number
          surcharges_cents?: number
          total_cents: number
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          distance_m?: number
          dropoff_point?: unknown
          duration_s?: number
          expires_at?: string
          fare_rule_id?: string | null
          id?: string
          pickup_point?: unknown
          rider_id?: string
          subtotal_cents?: number
          surcharges_cents?: number
          total_cents?: number
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "fare_estimates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fare_estimates_fare_rule_id_fkey"
            columns: ["fare_rule_id"]
            isOneToOne: false
            referencedRelation: "fare_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fare_estimates_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fare_rules: {
        Row: {
          active_from: string
          active_to: string | null
          airport_surcharge_cents: number
          base_cents: number
          booking_fee_cents: number
          cancellation_fee_cents: number
          created_at: string
          id: string
          is_active: boolean
          minimum_cents: number
          name: string
          night_surcharge_pct: number
          per_km_cents: number
          per_min_cents: number
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          active_from?: string
          active_to?: string | null
          airport_surcharge_cents?: number
          base_cents?: number
          booking_fee_cents?: number
          cancellation_fee_cents?: number
          created_at?: string
          id?: string
          is_active?: boolean
          minimum_cents?: number
          name: string
          night_surcharge_pct?: number
          per_km_cents?: number
          per_min_cents?: number
          updated_at?: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          active_from?: string
          active_to?: string | null
          airport_surcharge_cents?: number
          base_cents?: number
          booking_fee_cents?: number
          cancellation_fee_cents?: number
          created_at?: string
          id?: string
          is_active?: boolean
          minimum_cents?: number
          name?: string
          night_surcharge_pct?: number
          per_km_cents?: number
          per_min_cents?: number
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: []
      }
      fatigue_sessions: {
        Row: {
          created_at: string
          drive_time_s: number
          driver_id: string
          ended_at: string | null
          enforced_lockout: boolean
          id: string
          lockout_until: string | null
          notes: string | null
          online_time_s: number
          started_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          drive_time_s?: number
          driver_id: string
          ended_at?: string | null
          enforced_lockout?: boolean
          id?: string
          lockout_until?: string | null
          notes?: string | null
          online_time_s?: number
          started_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          drive_time_s?: number
          driver_id?: string
          ended_at?: string | null
          enforced_lockout?: boolean
          id?: string
          lockout_until?: string | null
          notes?: string | null
          online_time_s?: number
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fatigue_sessions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          attachments: Json
          category: Database["public"]["Enums"]["incident_category"]
          created_at: string
          description: string
          driver_id: string | null
          id: string
          location_point: unknown
          occurred_at: string
          reported_by: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          rider_id: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          status: Database["public"]["Enums"]["incident_status"]
          trip_id: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          attachments?: Json
          category: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          description: string
          driver_id?: string | null
          id?: string
          location_point?: unknown
          occurred_at?: string
          reported_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rider_id?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          attachments?: Json
          category?: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          description?: string
          driver_id?: string | null
          id?: string
          location_point?: unknown
          occurred_at?: string
          reported_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rider_id?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "incident_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_overrides: {
        Row: {
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          override_kind: string
          reason: string
          target_id: string
          target_table: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          override_kind: string
          reason: string
          target_id: string
          target_table: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          override_kind?: string
          reason?: string
          target_id?: string
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_overrides_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          marketing_enabled: boolean
          push_enabled: boolean
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          marketing_enabled?: boolean
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          marketing_enabled?: boolean
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          abn: string | null
          branding_logo_url: string | null
          branding_primary_color: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string
          created_at: string
          currency: string
          id: string
          legal_name: string | null
          name: string
          state: string | null
          support_phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          abn?: string | null
          branding_logo_url?: string | null
          branding_primary_color?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          currency?: string
          id?: string
          legal_name?: string | null
          name: string
          state?: string | null
          support_phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          abn?: string | null
          branding_logo_url?: string | null
          branding_primary_color?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          currency?: string
          id?: string
          legal_name?: string | null
          name?: string
          state?: string | null
          support_phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          application_fee_cents: number | null
          captured_at: string | null
          created_at: string
          currency: string
          driver_id: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          raw_payload: Json | null
          refunded_at: string | null
          rider_id: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_charge_id: string | null
          stripe_destination_account: string | null
          stripe_payment_intent_id: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          application_fee_cents?: number | null
          captured_at?: string | null
          created_at?: string
          currency?: string
          driver_id?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          raw_payload?: Json | null
          refunded_at?: string | null
          rider_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_charge_id?: string | null
          stripe_destination_account?: string | null
          stripe_payment_intent_id?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          application_fee_cents?: number | null
          captured_at?: string | null
          created_at?: string
          currency?: string
          driver_id?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          raw_payload?: Json | null
          refunded_at?: string | null
          rider_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_charge_id?: string | null
          stripe_destination_account?: string | null
          stripe_payment_intent_id?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payments_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_cents: number
          arrival_date: string | null
          created_at: string
          currency: string
          driver_id: string | null
          id: string
          raw_payload: Json | null
          status: string | null
          stripe_payout_id: string
        }
        Insert: {
          amount_cents: number
          arrival_date?: string | null
          created_at?: string
          currency?: string
          driver_id?: string | null
          id?: string
          raw_payload?: Json | null
          status?: string | null
          stripe_payout_id: string
        }
        Update: {
          amount_cents?: number
          arrival_date?: string | null
          created_at?: string
          currency?: string
          driver_id?: string | null
          id?: string
          raw_payload?: Json | null
          status?: string | null
          stripe_payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rider_profiles: {
        Row: {
          created_at: string
          default_payment_method_id: string | null
          home_label: string | null
          home_point: unknown
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
          work_label: string | null
          work_point: unknown
        }
        Insert: {
          created_at?: string
          default_payment_method_id?: string | null
          home_label?: string | null
          home_point?: unknown
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
          work_label?: string | null
          work_point?: unknown
        }
        Update: {
          created_at?: string
          default_payment_method_id?: string | null
          home_label?: string | null
          home_point?: unknown
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
          work_label?: string | null
          work_point?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "rider_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      support_case_messages: {
        Row: {
          attachments: Json
          author_id: string
          body: string
          case_id: string
          created_at: string
          id: string
          internal: boolean
        }
        Insert: {
          attachments?: Json
          author_id: string
          body: string
          case_id: string
          created_at?: string
          id?: string
          internal?: boolean
        }
        Update: {
          attachments?: Json
          author_id?: string
          body?: string
          case_id?: string
          created_at?: string
          id?: string
          internal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "support_case_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_case_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "support_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      support_cases: {
        Row: {
          assignee_id: string | null
          created_at: string
          id: string
          last_message_at: string
          linked_incident_id: string | null
          linked_trip_id: string | null
          opened_by: string
          priority: Database["public"]["Enums"]["support_case_priority"]
          status: Database["public"]["Enums"]["support_case_status"]
          subject: string
          subject_user_id: string | null
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          linked_incident_id?: string | null
          linked_trip_id?: string | null
          opened_by: string
          priority?: Database["public"]["Enums"]["support_case_priority"]
          status?: Database["public"]["Enums"]["support_case_status"]
          subject: string
          subject_user_id?: string | null
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          linked_incident_id?: string | null
          linked_trip_id?: string | null
          opened_by?: string
          priority?: Database["public"]["Enums"]["support_case_priority"]
          status?: Database["public"]["Enums"]["support_case_status"]
          subject?: string
          subject_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_cases_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_linked_incident_id_fkey"
            columns: ["linked_incident_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_linked_trip_id_fkey"
            columns: ["linked_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_locations: {
        Row: {
          accuracy_m: number | null
          heading_deg: number | null
          id: number
          point: unknown
          recorded_at: string
          speed_mps: number | null
          trip_id: string
        }
        Insert: {
          accuracy_m?: number | null
          heading_deg?: number | null
          id?: number
          point: unknown
          recorded_at?: string
          speed_mps?: number | null
          trip_id: string
        }
        Update: {
          accuracy_m?: number | null
          heading_deg?: number | null
          id?: number
          point?: unknown
          recorded_at?: string
          speed_mps?: number | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_locations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_offers: {
        Row: {
          created_at: string
          distance_to_pickup_m: number | null
          driver_id: string
          id: string
          pickup_eta_s: number | null
          responded_at: string | null
          responds_by: string
          sent_at: string
          status: Database["public"]["Enums"]["offer_status"]
          trip_id: string
        }
        Insert: {
          created_at?: string
          distance_to_pickup_m?: number | null
          driver_id: string
          id?: string
          pickup_eta_s?: number | null
          responded_at?: string | null
          responds_by: string
          sent_at?: string
          status?: Database["public"]["Enums"]["offer_status"]
          trip_id: string
        }
        Update: {
          created_at?: string
          distance_to_pickup_m?: number | null
          driver_id?: string
          id?: string
          pickup_eta_s?: number | null
          responded_at?: string | null
          responds_by?: string
          sent_at?: string
          status?: Database["public"]["Enums"]["offer_status"]
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trip_offers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          arrived_at: string | null
          assigned_at: string | null
          booking_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["trip_cancelled_by"] | null
          completed_at: string | null
          created_at: string
          distance_m: number | null
          driver_id: string | null
          dropoff_address: string
          dropoff_point: unknown
          duration_s: number | null
          estimated_fare_cents: number | null
          final_fare_cents: number | null
          id: string
          payment_status: Database["public"]["Enums"]["trip_payment_status"]
          pickup_address: string
          pickup_point: unknown
          requested_at: string
          rider_id: string
          route_polyline: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["trip_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          arrived_at?: string | null
          assigned_at?: string | null
          booking_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: Database["public"]["Enums"]["trip_cancelled_by"] | null
          completed_at?: string | null
          created_at?: string
          distance_m?: number | null
          driver_id?: string | null
          dropoff_address: string
          dropoff_point: unknown
          duration_s?: number | null
          estimated_fare_cents?: number | null
          final_fare_cents?: number | null
          id?: string
          payment_status?: Database["public"]["Enums"]["trip_payment_status"]
          pickup_address: string
          pickup_point: unknown
          requested_at?: string
          rider_id: string
          route_polyline?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          arrived_at?: string | null
          assigned_at?: string | null
          booking_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: Database["public"]["Enums"]["trip_cancelled_by"] | null
          completed_at?: string | null
          created_at?: string
          distance_m?: number | null
          driver_id?: string | null
          dropoff_address?: string
          dropoff_point?: unknown
          duration_s?: number | null
          estimated_fare_cents?: number | null
          final_fare_cents?: number | null
          id?: string
          payment_status?: Database["public"]["Enums"]["trip_payment_status"]
          pickup_address?: string
          pickup_point?: unknown
          requested_at?: string
          rider_id?: string
          route_polyline?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trips_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          onboarding_completed_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          onboarding_completed_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          onboarding_completed_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["vehicle_doc_type"]
          expires_on: string | null
          id: string
          issued_on: string | null
          review_notes: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["vehicle_doc_type"]
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          review_notes?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["vehicle_doc_type"]
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          review_notes?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inspections: {
        Row: {
          created_at: string
          id: string
          inspection_type: Database["public"]["Enums"]["inspection_type"]
          next_due_on: string | null
          notes: string | null
          performed_by: string | null
          performed_on: string
          report_storage_path: string | null
          result: Database["public"]["Enums"]["inspection_result"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inspection_type?: Database["public"]["Enums"]["inspection_type"]
          next_due_on?: string | null
          notes?: string | null
          performed_by?: string | null
          performed_on: string
          report_storage_path?: string | null
          result: Database["public"]["Enums"]["inspection_result"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inspection_type?: Database["public"]["Enums"]["inspection_type"]
          next_due_on?: string | null
          notes?: string | null
          performed_by?: string | null
          performed_on?: string
          report_storage_path?: string | null
          result?: Database["public"]["Enums"]["inspection_result"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          default_driver_id: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id: string
          is_ev: boolean | null
          make: string
          model: string
          notes: string | null
          rego: string
          seat_capacity: number
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          year: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          default_driver_id?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          is_ev?: boolean | null
          make: string
          model: string
          notes?: string | null
          rego: string
          seat_capacity: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          year: number
        }
        Update: {
          color?: string | null
          created_at?: string
          default_driver_id?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          is_ev?: boolean | null
          make?: string
          model?: string
          notes?: string | null
          rego?: string
          seat_capacity?: number
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_default_driver_fk"
            columns: ["default_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      driver_status_current: {
        Row: {
          driver_id: string | null
          ended_at: string | null
          id: string | null
          last_heartbeat_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["driver_status_kind"] | null
          vehicle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_status_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "driver_status_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      write_audit_log: {
        Args: {
          p_action: string
          p_after: Json
          p_before: Json
          p_target_id: string
          p_target_table: string
        }
        Returns: undefined
      }
    }
    Enums: {
      booking_kind: "now" | "scheduled"
      booking_status: "pending" | "active" | "completed" | "cancelled"
      document_status: "pending" | "approved" | "rejected" | "expired"
      driver_approval_status:
        | "pending_documents"
        | "pending_review"
        | "approved"
        | "suspended"
        | "offboarded"
      driver_doc_type:
        | "licence_front"
        | "licence_back"
        | "authority"
        | "photo"
        | "medical_cert"
        | "other"
      driver_status_kind: "offline" | "online" | "on_trip" | "break"
      fuel_type: "petrol" | "diesel" | "hybrid" | "bev" | "phev"
      incident_category:
        | "safety"
        | "vehicle_damage"
        | "abuse"
        | "payment_dispute"
        | "medical"
        | "other"
      incident_severity: "info" | "low" | "medium" | "high" | "critical"
      incident_status:
        | "open"
        | "triaged"
        | "under_review"
        | "resolved"
        | "closed"
      inspection_result: "pass" | "fail" | "conditional"
      inspection_type: "coi" | "internal" | "other"
      offer_status:
        | "pending"
        | "accepted"
        | "declined"
        | "timed_out"
        | "cancelled"
      payment_status:
        | "requires_action"
        | "authorised"
        | "captured"
        | "failed"
        | "refunded"
        | "partially_refunded"
      support_case_priority: "low" | "normal" | "high" | "urgent"
      support_case_status: "open" | "pending_customer" | "resolved" | "closed"
      trip_cancelled_by: "rider" | "driver" | "dispatcher" | "system"
      trip_payment_status:
        | "pending"
        | "authorised"
        | "paid"
        | "failed"
        | "refunded"
        | "waived"
      trip_status:
        | "scheduled"
        | "requested"
        | "assigned"
        | "driver_en_route"
        | "arrived_at_pickup"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
        | "requires_manual_dispatch"
      user_role:
        | "rider"
        | "driver"
        | "dispatcher"
        | "admin"
        | "operator_owner"
        | "support"
      vehicle_doc_type: "ctp" | "insurance" | "authority" | "coi" | "other"
      vehicle_status: "pending" | "active" | "out_of_service" | "retired"
      vehicle_type: "sedan" | "suv" | "van" | "wagon" | "wheelchair_accessible"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_kind: ["now", "scheduled"],
      booking_status: ["pending", "active", "completed", "cancelled"],
      document_status: ["pending", "approved", "rejected", "expired"],
      driver_approval_status: [
        "pending_documents",
        "pending_review",
        "approved",
        "suspended",
        "offboarded",
      ],
      driver_doc_type: [
        "licence_front",
        "licence_back",
        "authority",
        "photo",
        "medical_cert",
        "other",
      ],
      driver_status_kind: ["offline", "online", "on_trip", "break"],
      fuel_type: ["petrol", "diesel", "hybrid", "bev", "phev"],
      incident_category: [
        "safety",
        "vehicle_damage",
        "abuse",
        "payment_dispute",
        "medical",
        "other",
      ],
      incident_severity: ["info", "low", "medium", "high", "critical"],
      incident_status: [
        "open",
        "triaged",
        "under_review",
        "resolved",
        "closed",
      ],
      inspection_result: ["pass", "fail", "conditional"],
      inspection_type: ["coi", "internal", "other"],
      offer_status: [
        "pending",
        "accepted",
        "declined",
        "timed_out",
        "cancelled",
      ],
      payment_status: [
        "requires_action",
        "authorised",
        "captured",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      support_case_priority: ["low", "normal", "high", "urgent"],
      support_case_status: ["open", "pending_customer", "resolved", "closed"],
      trip_cancelled_by: ["rider", "driver", "dispatcher", "system"],
      trip_payment_status: [
        "pending",
        "authorised",
        "paid",
        "failed",
        "refunded",
        "waived",
      ],
      trip_status: [
        "scheduled",
        "requested",
        "assigned",
        "driver_en_route",
        "arrived_at_pickup",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
        "requires_manual_dispatch",
      ],
      user_role: [
        "rider",
        "driver",
        "dispatcher",
        "admin",
        "operator_owner",
        "support",
      ],
      vehicle_doc_type: ["ctp", "insurance", "authority", "coi", "other"],
      vehicle_status: ["pending", "active", "out_of_service", "retired"],
      vehicle_type: ["sedan", "suv", "van", "wagon", "wheelchair_accessible"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

