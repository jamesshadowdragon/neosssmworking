export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action: string;
          actor_id: string;
          created_at: string;
          details: Json;
          entity_id: string | null;
          entity_type: string;
          id: string;
        };
        Insert: {
          action: string;
          actor_id: string;
          created_at?: string;
          details?: Json;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string;
          created_at?: string;
          details?: Json;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
        };
        Relationships: [];
      };
      catalog_sync_runs: {
        Row: {
          actor_id: string | null;
          created_at: string;
          id: string;
          kind: string;
          provider_id: string | null;
          report: Json;
          rows_accepted: number;
          rows_failed: number;
          rows_received: number;
          services_archived: number;
          services_created: number;
          services_updated: number;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          provider_id?: string | null;
          report?: Json;
          rows_accepted?: number;
          rows_failed?: number;
          rows_received?: number;
          services_archived?: number;
          services_created?: number;
          services_updated?: number;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          provider_id?: string | null;
          report?: Json;
          rows_accepted?: number;
          rows_failed?: number;
          rows_received?: number;
          services_archived?: number;
          services_created?: number;
          services_updated?: number;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          subject: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          subject?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          subject?: string | null;
        };
        Relationships: [];
      };
      deposit_requests: {
        Row: {
          admin_notes: string | null;
          amount: number;
          created_at: string;
          customer_notes: string | null;
          id: string;
          payment_method_id: string;
          payment_reference: string;
          proof_path: string | null;
          request_number: number;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          transaction_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          admin_notes?: string | null;
          amount: number;
          created_at?: string;
          customer_notes?: string | null;
          id?: string;
          payment_method_id: string;
          payment_reference: string;
          proof_path?: string | null;
          request_number?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          transaction_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_notes?: string | null;
          amount?: number;
          created_at?: string;
          customer_notes?: string | null;
          id?: string;
          payment_method_id?: string;
          payment_reference?: string;
          proof_path?: string | null;
          request_number?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          transaction_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          category_name_snapshot: string | null;
          client_request_id: string | null;
          created_at: string;
          id: string;
          notes: string | null;
          order_number: number;
          quantity: number;
          rate_basis_snapshot: number;
          service_code_snapshot: number | null;
          service_id: string;
          service_name_snapshot: string | null;
          service_price_basis_snapshot: number | null;
          status: string;
          target_link: string;
          total_amount: number;
          unit_price: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_name_snapshot?: string | null;
          client_request_id?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          order_number?: number;
          quantity: number;
          rate_basis_snapshot?: number;
          service_code_snapshot?: number | null;
          service_id: string;
          service_name_snapshot?: string | null;
          service_price_basis_snapshot?: number | null;
          status?: string;
          target_link: string;
          total_amount: number;
          unit_price: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category_name_snapshot?: string | null;
          client_request_id?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          order_number?: number;
          quantity?: number;
          rate_basis_snapshot?: number;
          service_code_snapshot?: number | null;
          service_id?: string;
          service_name_snapshot?: string | null;
          service_price_basis_snapshot?: number | null;
          status?: string;
          target_link?: string;
          total_amount?: number;
          unit_price?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: {
          code: string;
          created_at: string;
          destination: string | null;
          id: string;
          instructions: string | null;
          is_enabled: boolean;
          kind: string;
          max_amount: number;
          min_amount: number;
          name: string;
          network: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          destination?: string | null;
          id?: string;
          instructions?: string | null;
          is_enabled?: boolean;
          kind: string;
          max_amount?: number;
          min_amount?: number;
          name: string;
          network?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          destination?: string | null;
          id?: string;
          instructions?: string | null;
          is_enabled?: boolean;
          kind?: string;
          max_amount?: number;
          min_amount?: number;
          name?: string;
          network?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          balance: number;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          balance?: number;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          balance?: number;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_services: {
        Row: {
          category_name: string | null;
          created_at: string;
          dripfeed: boolean | null;
          id: string;
          is_active: boolean;
          max: number | null;
          min: number | null;
          name: string;
          provider_id: string;
          rate: number;
          refill: boolean | null;
          service_id: string;
          type: string | null;
          updated_at: string;
        };
        Insert: {
          category_name?: string | null;
          created_at?: string;
          dripfeed?: boolean | null;
          id?: string;
          is_active?: boolean;
          max?: number | null;
          min?: number | null;
          name: string;
          provider_id: string;
          rate: number;
          refill?: boolean | null;
          service_id: string;
          type?: string | null;
          updated_at?: string;
        };
        Update: {
          category_name?: string | null;
          created_at?: string;
          dripfeed?: boolean | null;
          id?: string;
          is_active?: boolean;
          max?: number | null;
          min?: number | null;
          name?: string;
          provider_id?: string;
          rate?: number;
          refill?: boolean | null;
          service_id?: string;
          type?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      providers: {
        Row: {
          api_key_secret_name: string | null;
          api_url: string | null;
          created_at: string;
          id: string;
          last_synced_at: string | null;
          name: string;
          slug: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          api_key_secret_name?: string | null;
          api_url?: string | null;
          created_at?: string;
          id?: string;
          last_synced_at?: string | null;
          name: string;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          api_key_secret_name?: string | null;
          api_url?: string | null;
          created_at?: string;
          id?: string;
          last_synced_at?: string | null;
          name?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_categories: {
        Row: {
          accent: string;
          created_at: string;
          description: string | null;
          icon: string;
          id: string;
          is_active: boolean;
          kind: string;
          name: string;
          slug: string;
          sort_order: number;
          tagline: string | null;
        };
        Insert: {
          accent?: string;
          created_at?: string;
          description?: string | null;
          icon?: string;
          id?: string;
          is_active?: boolean;
          kind?: string;
          name: string;
          slug: string;
          sort_order?: number;
          tagline?: string | null;
        };
        Update: {
          accent?: string;
          created_at?: string;
          description?: string | null;
          icon?: string;
          id?: string;
          is_active?: boolean;
          kind?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          tagline?: string | null;
        };
        Relationships: [];
      };
      services: {
        Row: {
          catalog_source: string;
          category_id: string;
          created_at: string;
          delivery_time: string;
          description: string | null;
          features: Json;
          id: string;
          is_active: boolean;
          is_archived: boolean;
          is_featured: boolean;
          max_quantity: number;
          min_quantity: number;
          name: string;
          price_per_unit: number;
          rate_basis: number;
          service_code: number | null;
          short_description: string | null;
          slug: string;
          sort_order: number;
          source_service_id: string | null;
          source_sync_at: string | null;
          subcategory: string | null;
          unit: string;
          updated_at: string;
        };
        Insert: {
          catalog_source?: string;
          category_id: string;
          created_at?: string;
          delivery_time?: string;
          description?: string | null;
          features?: Json;
          id?: string;
          is_active?: boolean;
          is_archived?: boolean;
          is_featured?: boolean;
          max_quantity?: number;
          min_quantity?: number;
          name: string;
          price_per_unit?: number;
          rate_basis?: number;
          service_code?: number | null;
          short_description?: string | null;
          slug: string;
          sort_order?: number;
          source_service_id?: string | null;
          source_sync_at?: string | null;
          subcategory?: string | null;
          unit?: string;
          updated_at?: string;
        };
        Update: {
          catalog_source?: string;
          category_id?: string;
          created_at?: string;
          delivery_time?: string;
          description?: string | null;
          features?: Json;
          id?: string;
          is_active?: boolean;
          is_archived?: boolean;
          is_featured?: boolean;
          max_quantity?: number;
          min_quantity?: number;
          name?: string;
          price_per_unit?: number;
          rate_basis?: number;
          service_code?: number | null;
          short_description?: string | null;
          slug?: string;
          sort_order?: number;
          source_service_id?: string | null;
          source_sync_at?: string | null;
          subcategory?: string | null;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      support_tickets: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          status: string;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          id?: string;
          status?: string;
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          status?: string;
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ticket_messages: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          is_staff: boolean;
          ticket_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          is_staff?: boolean;
          ticket_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          is_staff?: boolean;
          ticket_id?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          balance_after: number;
          created_at: string;
          description: string | null;
          id: string;
          reference: string | null;
          status: string;
          type: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          balance_after: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          reference?: string | null;
          status?: string;
          type: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          reference?: string | null;
          status?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      website_settings: {
        Row: {
          contact_email: string | null;
          created_at: string;
          currency_code: string;
          hero_subtitle: string | null;
          hero_title: string | null;
          id: string;
          is_registration_open: boolean;
          site_name: string;
          support_telegram: string | null;
          support_whatsapp: string | null;
          updated_at: string;
        };
        Insert: {
          contact_email?: string | null;
          created_at?: string;
          currency_code?: string;
          hero_subtitle?: string | null;
          hero_title?: string | null;
          id?: string;
          is_registration_open?: boolean;
          site_name?: string;
          support_telegram?: string | null;
          support_whatsapp?: string | null;
          updated_at?: string;
        };
        Update: {
          contact_email?: string | null;
          created_at?: string;
          currency_code?: string;
          hero_subtitle?: string | null;
          hero_title?: string | null;
          id?: string;
          is_registration_open?: boolean;
          site_name?: string;
          support_telegram?: string | null;
          support_whatsapp?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
  };
};
