export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          cart_items: Json;
          cart_quantity: number;
          cart_total: number;
          created_at: string | null;
          email: string;
          email_clicked: boolean | null;
          email_opened: boolean | null;
          emails_sent: number | null;
          expires_at: string | null;
          id: string;
          ip_address: string | null;
          last_email_sent_at: string | null;
          recovered: boolean | null;
          recovered_at: string | null;
          recovered_order_id: string | null;
          recovery_token: string;
          recovery_url: string | null;
          session_id: string;
          updated_at: string | null;
          user_agent: string | null;
          user_id: string | null;
          utm_campaign: string | null;
          utm_medium: string | null;
          utm_source: string | null;
        };
        Insert: {
          cart_items: Json;
          cart_quantity: number;
          cart_total: number;
          created_at?: string | null;
          email: string;
          email_clicked?: boolean | null;
          email_opened?: boolean | null;
          emails_sent?: number | null;
          expires_at?: string | null;
          id?: string;
          ip_address?: string | null;
          last_email_sent_at?: string | null;
          recovered?: boolean | null;
          recovered_at?: string | null;
          recovered_order_id?: string | null;
          recovery_token: string;
          recovery_url?: string | null;
          session_id: string;
          updated_at?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Update: {
          cart_items?: Json;
          cart_quantity?: number;
          cart_total?: number;
          created_at?: string | null;
          email?: string;
          email_clicked?: boolean | null;
          email_opened?: boolean | null;
          emails_sent?: number | null;
          expires_at?: string | null;
          id?: string;
          ip_address?: string | null;
          last_email_sent_at?: string | null;
          recovered?: boolean | null;
          recovered_at?: string | null;
          recovered_order_id?: string | null;
          recovery_token?: string;
          recovery_url?: string | null;
          session_id?: string;
          updated_at?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Relationships: [];
      };
      admin_activity_logs: {
        Row: {
          action_type: string;
          admin_email: string;
          admin_nome: string | null;
          changes: Json | null;
          created_at: string | null;
          description: string | null;
          entity_id: string | null;
          entity_name: string | null;
          entity_type: string;
          id: string;
          ip_address: string | null;
          request_method: string | null;
          request_url: string | null;
          severity: string | null;
          user_agent: string | null;
        };
        Insert: {
          action_type: string;
          admin_email: string;
          admin_nome?: string | null;
          changes?: Json | null;
          created_at?: string | null;
          description?: string | null;
          entity_id?: string | null;
          entity_name?: string | null;
          entity_type: string;
          id?: string;
          ip_address?: string | null;
          request_method?: string | null;
          request_url?: string | null;
          severity?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action_type?: string;
          admin_email?: string;
          admin_nome?: string | null;
          changes?: Json | null;
          created_at?: string | null;
          description?: string | null;
          entity_id?: string | null;
          entity_name?: string | null;
          entity_type?: string;
          id?: string;
          ip_address?: string | null;
          request_method?: string | null;
          request_url?: string | null;
          severity?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      admin_automation_logs: {
        Row: {
          action_result: Json | null;
          automation_id: string;
          completed_at: string | null;
          error_message: string | null;
          executed_at: string | null;
          id: string;
          status: string;
          trigger_data: Json | null;
        };
        Insert: {
          action_result?: Json | null;
          automation_id: string;
          completed_at?: string | null;
          error_message?: string | null;
          executed_at?: string | null;
          id?: string;
          status: string;
          trigger_data?: Json | null;
        };
        Update: {
          action_result?: Json | null;
          automation_id?: string;
          completed_at?: string | null;
          error_message?: string | null;
          executed_at?: string | null;
          id?: string;
          status?: string;
          trigger_data?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_automation_logs_automation_id_fkey";
            columns: ["automation_id"];
            isOneToOne: false;
            referencedRelation: "admin_automations";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_automations: {
        Row: {
          action_config: Json;
          action_type: string;
          created_at: string | null;
          created_by: string;
          delay_minutes: number;
          description: string | null;
          enabled: boolean;
          failed_runs: number;
          id: string;
          last_error: string | null;
          last_run_at: string | null;
          name: string;
          successful_runs: number;
          total_runs: number;
          trigger_conditions: Json | null;
          trigger_type: string;
          updated_at: string | null;
        };
        Insert: {
          action_config: Json;
          action_type: string;
          created_at?: string | null;
          created_by: string;
          delay_minutes?: number;
          description?: string | null;
          enabled?: boolean;
          failed_runs?: number;
          id?: string;
          last_error?: string | null;
          last_run_at?: string | null;
          name: string;
          successful_runs?: number;
          total_runs?: number;
          trigger_conditions?: Json | null;
          trigger_type: string;
          updated_at?: string | null;
        };
        Update: {
          action_config?: Json;
          action_type?: string;
          created_at?: string | null;
          created_by?: string;
          delay_minutes?: number;
          description?: string | null;
          enabled?: boolean;
          failed_runs?: number;
          id?: string;
          last_error?: string | null;
          last_run_at?: string | null;
          name?: string;
          successful_runs?: number;
          total_runs?: number;
          trigger_conditions?: Json | null;
          trigger_type?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      admin_chat_messages: {
        Row: {
          attachment_name: string | null;
          attachment_url: string | null;
          created_at: string | null;
          edited: boolean | null;
          edited_at: string | null;
          has_attachment: boolean | null;
          id: string;
          mentions: string[] | null;
          message: string;
          sender_email: string;
          thread_id: string | null;
        };
        Insert: {
          attachment_name?: string | null;
          attachment_url?: string | null;
          created_at?: string | null;
          edited?: boolean | null;
          edited_at?: string | null;
          has_attachment?: boolean | null;
          id?: string;
          mentions?: string[] | null;
          message: string;
          sender_email: string;
          thread_id?: string | null;
        };
        Update: {
          attachment_name?: string | null;
          attachment_url?: string | null;
          created_at?: string | null;
          edited?: boolean | null;
          edited_at?: string | null;
          has_attachment?: boolean | null;
          id?: string;
          mentions?: string[] | null;
          message?: string;
          sender_email?: string;
          thread_id?: string | null;
        };
        Relationships: [];
      };
      admin_chat_read_receipts: {
        Row: {
          id: string;
          message_id: string | null;
          read_at: string | null;
          user_email: string;
        };
        Insert: {
          id?: string;
          message_id?: string | null;
          read_at?: string | null;
          user_email: string;
        };
        Update: {
          id?: string;
          message_id?: string | null;
          read_at?: string | null;
          user_email?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_chat_read_receipts_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "admin_chat_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_tasks: {
        Row: {
          admin_email: string;
          completed_at: string | null;
          created_at: string | null;
          description: string | null;
          due_date: string;
          id: string;
          notes: string | null;
          priority: string;
          related_contact_id: string | null;
          related_email: string | null;
          related_message_id: string | null;
          status: string;
          task_type: string;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          admin_email: string;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date: string;
          id?: string;
          notes?: string | null;
          priority?: string;
          related_contact_id?: string | null;
          related_email?: string | null;
          related_message_id?: string | null;
          status?: string;
          task_type?: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          admin_email?: string;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string;
          id?: string;
          notes?: string | null;
          priority?: string;
          related_contact_id?: string | null;
          related_email?: string | null;
          related_message_id?: string | null;
          status?: string;
          task_type?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      admin_users: {
        Row: {
          ativo: boolean | null;
          created_at: string | null;
          email: string;
          id: string;
          last_login: string | null;
          nome: string | null;
          role: string | null;
        };
        Insert: {
          ativo?: boolean | null;
          created_at?: string | null;
          email: string;
          id?: string;
          last_login?: string | null;
          nome?: string | null;
          role?: string | null;
        };
        Update: {
          ativo?: boolean | null;
          created_at?: string | null;
          email?: string;
          id?: string;
          last_login?: string | null;
          nome?: string | null;
          role?: string | null;
        };
        Relationships: [];
      };
      automation_logs: {
        Row: {
          automation_id: string | null;
          created_at: string | null;
          error_message: string | null;
          executed_at: string | null;
          id: string;
          success: boolean | null;
          trigger_data: Json | null;
        };
        Insert: {
          automation_id?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          executed_at?: string | null;
          id?: string;
          success?: boolean | null;
          trigger_data?: Json | null;
        };
        Update: {
          automation_id?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          executed_at?: string | null;
          id?: string;
          success?: boolean | null;
          trigger_data?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey";
            columns: ["automation_id"];
            isOneToOne: false;
            referencedRelation: "automations";
            referencedColumns: ["id"];
          },
        ];
      };
      automations: {
        Row: {
          action_config: Json;
          action_type: string;
          created_at: string | null;
          delay_minutes: number | null;
          description: string | null;
          enabled: boolean | null;
          failed_runs: number | null;
          id: string;
          last_run: string | null;
          name: string;
          run_count: number | null;
          successful_runs: number | null;
          total_runs: number | null;
          trigger_conditions: Json | null;
          trigger_type: string;
          updated_at: string | null;
        };
        Insert: {
          action_config: Json;
          action_type: string;
          created_at?: string | null;
          delay_minutes?: number | null;
          description?: string | null;
          enabled?: boolean | null;
          failed_runs?: number | null;
          id?: string;
          last_run?: string | null;
          name: string;
          run_count?: number | null;
          successful_runs?: number | null;
          total_runs?: number | null;
          trigger_conditions?: Json | null;
          trigger_type: string;
          updated_at?: string | null;
        };
        Update: {
          action_config?: Json;
          action_type?: string;
          created_at?: string | null;
          delay_minutes?: number | null;
          description?: string | null;
          enabled?: boolean | null;
          failed_runs?: number | null;
          id?: string;
          last_run?: string | null;
          name?: string;
          run_count?: number | null;
          successful_runs?: number | null;
          total_runs?: number | null;
          trigger_conditions?: Json | null;
          trigger_type?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      cart_recovery_emails: {
        Row: {
          abandoned_cart_id: string | null;
          bounce_reason: string | null;
          bounced: boolean | null;
          clicked_at: string | null;
          created_at: string | null;
          email_type: string;
          id: string;
          opened_at: string | null;
          recipient_email: string;
          resend_email_id: string | null;
          sent_at: string | null;
          subject: string;
          variant: string | null;
        };
        Insert: {
          abandoned_cart_id?: string | null;
          bounce_reason?: string | null;
          bounced?: boolean | null;
          clicked_at?: string | null;
          created_at?: string | null;
          email_type: string;
          id?: string;
          opened_at?: string | null;
          recipient_email: string;
          resend_email_id?: string | null;
          sent_at?: string | null;
          subject: string;
          variant?: string | null;
        };
        Update: {
          abandoned_cart_id?: string | null;
          bounce_reason?: string | null;
          bounced?: boolean | null;
          clicked_at?: string | null;
          created_at?: string | null;
          email_type?: string;
          id?: string;
          opened_at?: string | null;
          recipient_email?: string;
          resend_email_id?: string | null;
          sent_at?: string | null;
          subject?: string;
          variant?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cart_recovery_emails_abandoned_cart_id_fkey";
            columns: ["abandoned_cart_id"];
            isOneToOne: false;
            referencedRelation: "abandoned_carts";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_recovery_stats: {
        Row: {
          avg_time_to_recovery: string | null;
          calculated_at: string | null;
          carts_recovered: number | null;
          emails_clicked: number | null;
          emails_opened: number | null;
          emails_sent: number | null;
          id: string;
          period_end: string;
          period_start: string;
          period_type: string;
          recovery_rate: number | null;
          recovery_value: number | null;
          total_abandoned: number | null;
          total_abandoned_value: number | null;
        };
        Insert: {
          avg_time_to_recovery?: string | null;
          calculated_at?: string | null;
          carts_recovered?: number | null;
          emails_clicked?: number | null;
          emails_opened?: number | null;
          emails_sent?: number | null;
          id?: string;
          period_end: string;
          period_start: string;
          period_type: string;
          recovery_rate?: number | null;
          recovery_value?: number | null;
          total_abandoned?: number | null;
          total_abandoned_value?: number | null;
        };
        Update: {
          avg_time_to_recovery?: string | null;
          calculated_at?: string | null;
          carts_recovered?: number | null;
          emails_clicked?: number | null;
          emails_opened?: number | null;
          emails_sent?: number | null;
          id?: string;
          period_end?: string;
          period_start?: string;
          period_type?: string;
          recovery_rate?: number | null;
          recovery_value?: number | null;
          total_abandoned?: number | null;
          total_abandoned_value?: number | null;
        };
        Relationships: [];
      };
      cavalos_venda: {
        Row: {
          aceita_troca: boolean | null;
          altura: number | null;
          anos_treino: number | null;
          aviso_expiracao_at: string | null;
          aviso_expiracao_dias: number | null;
          aviso_expiracao_prazo: string | null;
          caracteristicas: string[] | null;
          comportamento: Json | null;
          condicoes_venda: Json | null;
          cor: string | null;
          coudelaria_id: string | null;
          coudelaria_origem: string | null;
          created_at: string | null;
          data_nascimento: string | null;
          descricao: string | null;
          destaque: boolean | null;
          disciplinas: string[] | null;
          documentos_em_dia: boolean | null;
          featured_until: string | null;
          foto_principal: string | null;
          fotos: string[] | null;
          id: string;
          idade: number | null;
          linhagem: string | null;
          listing_expires_at: string | null;
          listing_tier: string;
          localizacao: string | null;
          mae: string | null;
          maneio: Json | null;
          microchip: string | null;
          moeda: string | null;
          morfologia: Json | null;
          nivel_apsl: string | null;
          nivel_cavaleiro: string | null;
          nivel_treino: string | null;
          nome: string;
          nome_registo: string | null;
          pai: string | null;
          pais_nascimento: string | null;
          passaporte_equino: string | null;
          peso_kg: number | null;
          preco: number | null;
          preco_negociavel: boolean | null;
          preco_sob_consulta: boolean | null;
          premios: string[] | null;
          prova_aptidao_apsl: boolean | null;
          raca: string | null;
          rating_media: number | null;
          regiao: string | null;
          registro_apsl: string | null;
          removido_at: string | null;
          saude: Json | null;
          sexo: string;
          slug: string;
          status: string | null;
          temperamento: string | null;
          total_vendas: number | null;
          transporte_incluido: boolean | null;
          treino: Json | null;
          updated_at: string | null;
          user_id: string | null;
          uso_atual: string[] | null;
          vendedor_email: string | null;
          vendedor_nome: string | null;
          vendedor_pais: string | null;
          vendedor_telefone: string | null;
          vendedor_tipo: string | null;
          vendedor_website: string | null;
          vendedor_whatsapp: string | null;
          vendido_at: string | null;
          verificado: boolean | null;
          verificado_at: string | null;
          verificado_por: string | null;
          video_url: string | null;
          video_url_2: string | null;
          views_count: number | null;
        };
        Insert: {
          aceita_troca?: boolean | null;
          altura?: number | null;
          anos_treino?: number | null;
          aviso_expiracao_at?: string | null;
          aviso_expiracao_dias?: number | null;
          aviso_expiracao_prazo?: string | null;
          caracteristicas?: string[] | null;
          comportamento?: Json | null;
          condicoes_venda?: Json | null;
          cor?: string | null;
          coudelaria_id?: string | null;
          coudelaria_origem?: string | null;
          created_at?: string | null;
          data_nascimento?: string | null;
          descricao?: string | null;
          destaque?: boolean | null;
          disciplinas?: string[] | null;
          documentos_em_dia?: boolean | null;
          featured_until?: string | null;
          foto_principal?: string | null;
          fotos?: string[] | null;
          id?: string;
          idade?: number | null;
          linhagem?: string | null;
          listing_expires_at?: string | null;
          listing_tier?: string;
          localizacao?: string | null;
          mae?: string | null;
          maneio?: Json | null;
          microchip?: string | null;
          moeda?: string | null;
          morfologia?: Json | null;
          nivel_apsl?: string | null;
          nivel_cavaleiro?: string | null;
          nivel_treino?: string | null;
          nome: string;
          nome_registo?: string | null;
          pai?: string | null;
          pais_nascimento?: string | null;
          passaporte_equino?: string | null;
          peso_kg?: number | null;
          preco?: number | null;
          preco_negociavel?: boolean | null;
          preco_sob_consulta?: boolean | null;
          premios?: string[] | null;
          prova_aptidao_apsl?: boolean | null;
          raca?: string | null;
          rating_media?: number | null;
          regiao?: string | null;
          registro_apsl?: string | null;
          removido_at?: string | null;
          saude?: Json | null;
          sexo: string;
          slug: string;
          status?: string | null;
          temperamento?: string | null;
          total_vendas?: number | null;
          transporte_incluido?: boolean | null;
          treino?: Json | null;
          updated_at?: string | null;
          user_id?: string | null;
          uso_atual?: string[] | null;
          vendedor_email?: string | null;
          vendedor_nome?: string | null;
          vendedor_pais?: string | null;
          vendedor_telefone?: string | null;
          vendedor_tipo?: string | null;
          vendedor_website?: string | null;
          vendedor_whatsapp?: string | null;
          vendido_at?: string | null;
          verificado?: boolean | null;
          verificado_at?: string | null;
          verificado_por?: string | null;
          video_url?: string | null;
          video_url_2?: string | null;
          views_count?: number | null;
        };
        Update: {
          aceita_troca?: boolean | null;
          altura?: number | null;
          anos_treino?: number | null;
          aviso_expiracao_at?: string | null;
          aviso_expiracao_dias?: number | null;
          aviso_expiracao_prazo?: string | null;
          caracteristicas?: string[] | null;
          comportamento?: Json | null;
          condicoes_venda?: Json | null;
          cor?: string | null;
          coudelaria_id?: string | null;
          coudelaria_origem?: string | null;
          created_at?: string | null;
          data_nascimento?: string | null;
          descricao?: string | null;
          destaque?: boolean | null;
          disciplinas?: string[] | null;
          documentos_em_dia?: boolean | null;
          featured_until?: string | null;
          foto_principal?: string | null;
          fotos?: string[] | null;
          id?: string;
          idade?: number | null;
          linhagem?: string | null;
          listing_expires_at?: string | null;
          listing_tier?: string;
          localizacao?: string | null;
          mae?: string | null;
          maneio?: Json | null;
          microchip?: string | null;
          moeda?: string | null;
          morfologia?: Json | null;
          nivel_apsl?: string | null;
          nivel_cavaleiro?: string | null;
          nivel_treino?: string | null;
          nome?: string;
          nome_registo?: string | null;
          pai?: string | null;
          pais_nascimento?: string | null;
          passaporte_equino?: string | null;
          peso_kg?: number | null;
          preco?: number | null;
          preco_negociavel?: boolean | null;
          preco_sob_consulta?: boolean | null;
          premios?: string[] | null;
          prova_aptidao_apsl?: boolean | null;
          raca?: string | null;
          rating_media?: number | null;
          regiao?: string | null;
          registro_apsl?: string | null;
          removido_at?: string | null;
          saude?: Json | null;
          sexo?: string;
          slug?: string;
          status?: string | null;
          temperamento?: string | null;
          total_vendas?: number | null;
          transporte_incluido?: boolean | null;
          treino?: Json | null;
          updated_at?: string | null;
          user_id?: string | null;
          uso_atual?: string[] | null;
          vendedor_email?: string | null;
          vendedor_nome?: string | null;
          vendedor_pais?: string | null;
          vendedor_telefone?: string | null;
          vendedor_tipo?: string | null;
          vendedor_website?: string | null;
          vendedor_whatsapp?: string | null;
          vendido_at?: string | null;
          verificado?: boolean | null;
          verificado_at?: string | null;
          verificado_por?: string | null;
          video_url?: string | null;
          video_url_2?: string | null;
          views_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "cavalos_venda_coudelaria_id_fkey";
            columns: ["coudelaria_id"];
            isOneToOne: false;
            referencedRelation: "coudelarias";
            referencedColumns: ["id"];
          },
        ];
      };
      cavalos_venda_ascendentes: {
        Row: {
          caminho: string;
          cavalo_id: string;
          created_at: string;
          geracao: number;
          id: string;
          nome: string | null;
          registo: string | null;
        };
        Insert: {
          caminho: string;
          cavalo_id: string;
          created_at?: string;
          geracao: number;
          id?: string;
          nome?: string | null;
          registo?: string | null;
        };
        Update: {
          caminho?: string;
          cavalo_id?: string;
          created_at?: string;
          geracao?: number;
          id?: string;
          nome?: string | null;
          registo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cavalos_venda_ascendentes_cavalo_id_fkey";
            columns: ["cavalo_id"];
            isOneToOne: false;
            referencedRelation: "cavalos_venda";
            referencedColumns: ["id"];
          },
        ];
      };
      cavalos_venda_denuncias: {
        Row: {
          cavalo_id: string;
          created_at: string;
          denunciante_id: string | null;
          detalhe: string | null;
          id: string;
          motivo: string;
          nota_interna: string | null;
          resolvida_at: string | null;
          resolvida_por: string | null;
          status: string;
        };
        Insert: {
          cavalo_id: string;
          created_at?: string;
          denunciante_id?: string | null;
          detalhe?: string | null;
          id?: string;
          motivo: string;
          nota_interna?: string | null;
          resolvida_at?: string | null;
          resolvida_por?: string | null;
          status?: string;
        };
        Update: {
          cavalo_id?: string;
          created_at?: string;
          denunciante_id?: string | null;
          detalhe?: string | null;
          id?: string;
          motivo?: string;
          nota_interna?: string | null;
          resolvida_at?: string | null;
          resolvida_por?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cavalos_venda_denuncias_cavalo_id_fkey";
            columns: ["cavalo_id"];
            isOneToOne: false;
            referencedRelation: "cavalos_venda";
            referencedColumns: ["id"];
          },
        ];
      };
      cavalos_venda_visualizacoes: {
        Row: {
          cavalo_id: string;
          created_at: string;
          dia: string;
          visitante_hash: string;
        };
        Insert: {
          cavalo_id: string;
          created_at?: string;
          dia?: string;
          visitante_hash: string;
        };
        Update: {
          cavalo_id?: string;
          created_at?: string;
          dia?: string;
          visitante_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cavalos_venda_visualizacoes_cavalo_id_fkey";
            columns: ["cavalo_id"];
            isOneToOne: false;
            referencedRelation: "cavalos_venda";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_submissions: {
        Row: {
          admin_notes: string | null;
          admin_response: string | null;
          archived_at: string | null;
          assigned_to: string | null;
          cavalo_id: string | null;
          company: string | null;
          created_at: string | null;
          email: string;
          form_data: Json;
          form_type: string;
          id: string;
          ip_address: string | null;
          name: string;
          payment_id: string | null;
          priority: string | null;
          read_at: string | null;
          responded_at: string | null;
          responded_by: string | null;
          status: string | null;
          tags: string[] | null;
          telefone: string | null;
          updated_at: string | null;
          user_agent: string | null;
          utm_campaign: string | null;
          utm_medium: string | null;
          utm_source: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          admin_response?: string | null;
          archived_at?: string | null;
          assigned_to?: string | null;
          cavalo_id?: string | null;
          company?: string | null;
          created_at?: string | null;
          email: string;
          form_data?: Json;
          form_type: string;
          id?: string;
          ip_address?: string | null;
          name: string;
          payment_id?: string | null;
          priority?: string | null;
          read_at?: string | null;
          responded_at?: string | null;
          responded_by?: string | null;
          status?: string | null;
          tags?: string[] | null;
          telefone?: string | null;
          updated_at?: string | null;
          user_agent?: string | null;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          admin_response?: string | null;
          archived_at?: string | null;
          assigned_to?: string | null;
          cavalo_id?: string | null;
          company?: string | null;
          created_at?: string | null;
          email?: string;
          form_data?: Json;
          form_type?: string;
          id?: string;
          ip_address?: string | null;
          name?: string;
          payment_id?: string | null;
          priority?: string | null;
          read_at?: string | null;
          responded_at?: string | null;
          responded_by?: string | null;
          status?: string | null;
          tags?: string[] | null;
          telefone?: string | null;
          updated_at?: string | null;
          user_agent?: string | null;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Relationships: [];
      };
      coudelarias: {
        Row: {
          ano_fundacao: number | null;
          approved_at: string | null;
          approved_by: string | null;
          area_hectares: number | null;
          banner_url: string | null;
          cavalos_destaque: Json | null;
          clicks_count: number | null;
          clicks_email: number | null;
          clicks_telefone: number | null;
          clicks_website: number | null;
          codigo_postal: string | null;
          coordenadas_lat: number | null;
          coordenadas_lng: number | null;
          created_at: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          descricao: string;
          destaque: boolean | null;
          distrito: string | null;
          email: string | null;
          especialidades: string[] | null;
          expires_at: string | null;
          facebook: string | null;
          foto_capa: string | null;
          fotos: string[] | null;
          galeria: string[] | null;
          has_instagram_promo: boolean | null;
          historia: string | null;
          horario: string | null;
          id: string;
          instagram: string | null;
          is_pro: boolean | null;
          latitude: number | null;
          linhagens: string[] | null;
          localizacao: string;
          logo: string | null;
          logo_url: string | null;
          longitude: number | null;
          media_avaliacoes: number | null;
          nome: string;
          num_cavalos: number | null;
          numero_cavalos: number | null;
          ordem_destaque: number | null;
          pais: string | null;
          plan: string | null;
          premios: string[] | null;
          proprietario_email: string | null;
          proprietario_nome: string | null;
          proprietario_telefone: string | null;
          regiao: string;
          servicos: string[] | null;
          slug: string;
          status: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          tags: string[] | null;
          telefone: string | null;
          testemunhos: Json | null;
          total_avaliacoes: number | null;
          updated_at: string | null;
          video_url: string | null;
          views_count: number | null;
          website: string | null;
          youtube: string | null;
        };
        Insert: {
          ano_fundacao?: number | null;
          approved_at?: string | null;
          approved_by?: string | null;
          area_hectares?: number | null;
          banner_url?: string | null;
          cavalos_destaque?: Json | null;
          clicks_count?: number | null;
          clicks_email?: number | null;
          clicks_telefone?: number | null;
          clicks_website?: number | null;
          codigo_postal?: string | null;
          coordenadas_lat?: number | null;
          coordenadas_lng?: number | null;
          created_at?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao: string;
          destaque?: boolean | null;
          distrito?: string | null;
          email?: string | null;
          especialidades?: string[] | null;
          expires_at?: string | null;
          facebook?: string | null;
          foto_capa?: string | null;
          fotos?: string[] | null;
          galeria?: string[] | null;
          has_instagram_promo?: boolean | null;
          historia?: string | null;
          horario?: string | null;
          id?: string;
          instagram?: string | null;
          is_pro?: boolean | null;
          latitude?: number | null;
          linhagens?: string[] | null;
          localizacao: string;
          logo?: string | null;
          logo_url?: string | null;
          longitude?: number | null;
          media_avaliacoes?: number | null;
          nome: string;
          num_cavalos?: number | null;
          numero_cavalos?: number | null;
          ordem_destaque?: number | null;
          pais?: string | null;
          plan?: string | null;
          premios?: string[] | null;
          proprietario_email?: string | null;
          proprietario_nome?: string | null;
          proprietario_telefone?: string | null;
          regiao: string;
          servicos?: string[] | null;
          slug: string;
          status?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          tags?: string[] | null;
          telefone?: string | null;
          testemunhos?: Json | null;
          total_avaliacoes?: number | null;
          updated_at?: string | null;
          video_url?: string | null;
          views_count?: number | null;
          website?: string | null;
          youtube?: string | null;
        };
        Update: {
          ano_fundacao?: number | null;
          approved_at?: string | null;
          approved_by?: string | null;
          area_hectares?: number | null;
          banner_url?: string | null;
          cavalos_destaque?: Json | null;
          clicks_count?: number | null;
          clicks_email?: number | null;
          clicks_telefone?: number | null;
          clicks_website?: number | null;
          codigo_postal?: string | null;
          coordenadas_lat?: number | null;
          coordenadas_lng?: number | null;
          created_at?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao?: string;
          destaque?: boolean | null;
          distrito?: string | null;
          email?: string | null;
          especialidades?: string[] | null;
          expires_at?: string | null;
          facebook?: string | null;
          foto_capa?: string | null;
          fotos?: string[] | null;
          galeria?: string[] | null;
          has_instagram_promo?: boolean | null;
          historia?: string | null;
          horario?: string | null;
          id?: string;
          instagram?: string | null;
          is_pro?: boolean | null;
          latitude?: number | null;
          linhagens?: string[] | null;
          localizacao?: string;
          logo?: string | null;
          logo_url?: string | null;
          longitude?: number | null;
          media_avaliacoes?: number | null;
          nome?: string;
          num_cavalos?: number | null;
          numero_cavalos?: number | null;
          ordem_destaque?: number | null;
          pais?: string | null;
          plan?: string | null;
          premios?: string[] | null;
          proprietario_email?: string | null;
          proprietario_nome?: string | null;
          proprietario_telefone?: string | null;
          regiao?: string;
          servicos?: string[] | null;
          slug?: string;
          status?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          tags?: string[] | null;
          telefone?: string | null;
          testemunhos?: Json | null;
          total_avaliacoes?: number | null;
          updated_at?: string | null;
          video_url?: string | null;
          views_count?: number | null;
          website?: string | null;
          youtube?: string | null;
        };
        Relationships: [];
      };
      crm_leads: {
        Row: {
          actual_value: number | null;
          budget_max: number | null;
          budget_min: number | null;
          closed_at: string | null;
          company: string | null;
          contact_count: number | null;
          created_at: string | null;
          email: string;
          estimated_value: number | null;
          id: string;
          interests: string | null;
          last_contact: string | null;
          name: string;
          next_follow_up: string | null;
          notes: string | null;
          outcome_reason: string | null;
          owner_email: string;
          probability: number | null;
          related_contact_id: string | null;
          related_payment_id: string | null;
          source: string | null;
          source_type: string | null;
          stage: string;
          telefone: string | null;
          updated_at: string | null;
        };
        Insert: {
          actual_value?: number | null;
          budget_max?: number | null;
          budget_min?: number | null;
          closed_at?: string | null;
          company?: string | null;
          contact_count?: number | null;
          created_at?: string | null;
          email: string;
          estimated_value?: number | null;
          id?: string;
          interests?: string | null;
          last_contact?: string | null;
          name: string;
          next_follow_up?: string | null;
          notes?: string | null;
          outcome_reason?: string | null;
          owner_email: string;
          probability?: number | null;
          related_contact_id?: string | null;
          related_payment_id?: string | null;
          source?: string | null;
          source_type?: string | null;
          stage?: string;
          telefone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          actual_value?: number | null;
          budget_max?: number | null;
          budget_min?: number | null;
          closed_at?: string | null;
          company?: string | null;
          contact_count?: number | null;
          created_at?: string | null;
          email?: string;
          estimated_value?: number | null;
          id?: string;
          interests?: string | null;
          last_contact?: string | null;
          name?: string;
          next_follow_up?: string | null;
          notes?: string | null;
          outcome_reason?: string | null;
          owner_email?: string;
          probability?: number | null;
          related_contact_id?: string | null;
          related_payment_id?: string | null;
          source?: string | null;
          source_type?: string | null;
          stage?: string;
          telefone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      cupoes: {
        Row: {
          aplica_a: string[] | null;
          ativo: boolean | null;
          codigo: string;
          created_at: string | null;
          created_by: string | null;
          data_fim: string | null;
          data_inicio: string | null;
          descricao: string | null;
          id: string;
          tipo_desconto: string;
          updated_at: string | null;
          uso_atual: number | null;
          uso_maximo: number | null;
          uso_por_cliente: number | null;
          valor_desconto: number;
          valor_minimo: number | null;
        };
        Insert: {
          aplica_a?: string[] | null;
          ativo?: boolean | null;
          codigo: string;
          created_at?: string | null;
          created_by?: string | null;
          data_fim?: string | null;
          data_inicio?: string | null;
          descricao?: string | null;
          id?: string;
          tipo_desconto: string;
          updated_at?: string | null;
          uso_atual?: number | null;
          uso_maximo?: number | null;
          uso_por_cliente?: number | null;
          valor_desconto: number;
          valor_minimo?: number | null;
        };
        Update: {
          aplica_a?: string[] | null;
          ativo?: boolean | null;
          codigo?: string;
          created_at?: string | null;
          created_by?: string | null;
          data_fim?: string | null;
          data_inicio?: string | null;
          descricao?: string | null;
          id?: string;
          tipo_desconto?: string;
          updated_at?: string | null;
          uso_atual?: number | null;
          uso_maximo?: number | null;
          uso_por_cliente?: number | null;
          valor_desconto?: number;
          valor_minimo?: number | null;
        };
        Relationships: [];
      };
      cupoes_uso_historico: {
        Row: {
          cliente_email: string;
          cliente_nome: string | null;
          cupao_id: string | null;
          id: string;
          ip_address: string | null;
          payment_id: string | null;
          produto_tipo: string | null;
          usado_em: string | null;
          valor_desconto: number;
          valor_final: number;
          valor_original: number;
        };
        Insert: {
          cliente_email: string;
          cliente_nome?: string | null;
          cupao_id?: string | null;
          id?: string;
          ip_address?: string | null;
          payment_id?: string | null;
          produto_tipo?: string | null;
          usado_em?: string | null;
          valor_desconto: number;
          valor_final: number;
          valor_original: number;
        };
        Update: {
          cliente_email?: string;
          cliente_nome?: string | null;
          cupao_id?: string | null;
          id?: string;
          ip_address?: string | null;
          payment_id?: string | null;
          produto_tipo?: string | null;
          usado_em?: string | null;
          valor_desconto?: number;
          valor_final?: number;
          valor_original?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cupoes_uso_historico_cupao_id_fkey";
            columns: ["cupao_id"];
            isOneToOne: false;
            referencedRelation: "cupoes";
            referencedColumns: ["id"];
          },
        ];
      };
      email_campaigns: {
        Row: {
          clicked_count: number | null;
          created_at: string | null;
          created_by: string | null;
          failed_count: number | null;
          html_content: string;
          id: string;
          name: string;
          opened_count: number | null;
          recipient_type: string;
          recipients_count: number | null;
          scheduled_at: string | null;
          sent_at: string | null;
          sent_count: number | null;
          status: string | null;
          subject: string;
          updated_at: string | null;
        };
        Insert: {
          clicked_count?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          failed_count?: number | null;
          html_content: string;
          id?: string;
          name: string;
          opened_count?: number | null;
          recipient_type: string;
          recipients_count?: number | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          sent_count?: number | null;
          status?: string | null;
          subject: string;
          updated_at?: string | null;
        };
        Update: {
          clicked_count?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          failed_count?: number | null;
          html_content?: string;
          id?: string;
          name?: string;
          opened_count?: number | null;
          recipient_type?: string;
          recipients_count?: number | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          sent_count?: number | null;
          status?: string | null;
          subject?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      eventos: {
        Row: {
          confirmado: string | null;
          coordenadas_lat: number | null;
          coordenadas_lng: number | null;
          created_at: string | null;
          data_fim: string | null;
          data_inicio: string;
          descricao: string | null;
          descricao_completa: string | null;
          destaque: boolean | null;
          email: string | null;
          hora_fim: string | null;
          hora_inicio: string | null;
          id: string;
          imagem_capa: string | null;
          imagens: string[] | null;
          localizacao: string;
          morada: string | null;
          organizador: string | null;
          preco_entrada: string | null;
          regiao: string | null;
          slug: string;
          status: string | null;
          tags: string[] | null;
          telefone: string | null;
          tipo: string;
          titulo: string;
          updated_at: string | null;
          views_count: number | null;
          website: string | null;
        };
        Insert: {
          confirmado?: string | null;
          coordenadas_lat?: number | null;
          coordenadas_lng?: number | null;
          created_at?: string | null;
          data_fim?: string | null;
          data_inicio: string;
          descricao?: string | null;
          descricao_completa?: string | null;
          destaque?: boolean | null;
          email?: string | null;
          hora_fim?: string | null;
          hora_inicio?: string | null;
          id?: string;
          imagem_capa?: string | null;
          imagens?: string[] | null;
          localizacao: string;
          morada?: string | null;
          organizador?: string | null;
          preco_entrada?: string | null;
          regiao?: string | null;
          slug: string;
          status?: string | null;
          tags?: string[] | null;
          telefone?: string | null;
          tipo: string;
          titulo: string;
          updated_at?: string | null;
          views_count?: number | null;
          website?: string | null;
        };
        Update: {
          confirmado?: string | null;
          coordenadas_lat?: number | null;
          coordenadas_lng?: number | null;
          created_at?: string | null;
          data_fim?: string | null;
          data_inicio?: string;
          descricao?: string | null;
          descricao_completa?: string | null;
          destaque?: boolean | null;
          email?: string | null;
          hora_fim?: string | null;
          hora_inicio?: string | null;
          id?: string;
          imagem_capa?: string | null;
          imagens?: string[] | null;
          localizacao?: string;
          morada?: string | null;
          organizador?: string | null;
          preco_entrada?: string | null;
          regiao?: string | null;
          slug?: string;
          status?: string | null;
          tags?: string[] | null;
          telefone?: string | null;
          tipo?: string;
          titulo?: string;
          updated_at?: string | null;
          views_count?: number | null;
          website?: string | null;
        };
        Relationships: [];
      };
      favoritos: {
        Row: {
          created_at: string | null;
          id: string;
          item_id: string;
          item_type: string;
          user_email: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          item_id: string;
          item_type: string;
          user_email: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          item_id?: string;
          item_type?: string;
          user_email?: string;
        };
        Relationships: [];
      };
      instagram_uploads: {
        Row: {
          caption: string | null;
          created_at: string | null;
          customer_email: string | null;
          files_urls: string[] | null;
          hashtags: string | null;
          id: string;
          link: string | null;
          observacoes: string | null;
          session_id: string;
          status: string | null;
        };
        Insert: {
          caption?: string | null;
          created_at?: string | null;
          customer_email?: string | null;
          files_urls?: string[] | null;
          hashtags?: string | null;
          id?: string;
          link?: string | null;
          observacoes?: string | null;
          session_id: string;
          status?: string | null;
        };
        Update: {
          caption?: string | null;
          created_at?: string | null;
          customer_email?: string | null;
          files_urls?: string[] | null;
          hashtags?: string | null;
          id?: string;
          link?: string | null;
          observacoes?: string | null;
          session_id?: string;
          status?: string | null;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          nome: string | null;
          utm_campaign: string | null;
          utm_medium: string | null;
          utm_source: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          nome?: string | null;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          nome?: string | null;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Relationships: [];
      };
      linhagens: {
        Row: {
          ano_fundacao: number | null;
          aptidoes: string[] | null;
          caracteristicas: string[] | null;
          cavalos_famosos: Json | null;
          cores_comuns: string[] | null;
          coudelarias_principais: string[] | null;
          created_at: string | null;
          descricao: string | null;
          fundador: string | null;
          historia: string | null;
          id: string;
          imagem_capa: string | null;
          imagens: string[] | null;
          nome: string;
          origem: string | null;
          slug: string;
          temperamento: string | null;
          updated_at: string | null;
        };
        Insert: {
          ano_fundacao?: number | null;
          aptidoes?: string[] | null;
          caracteristicas?: string[] | null;
          cavalos_famosos?: Json | null;
          cores_comuns?: string[] | null;
          coudelarias_principais?: string[] | null;
          created_at?: string | null;
          descricao?: string | null;
          fundador?: string | null;
          historia?: string | null;
          id?: string;
          imagem_capa?: string | null;
          imagens?: string[] | null;
          nome: string;
          origem?: string | null;
          slug: string;
          temperamento?: string | null;
          updated_at?: string | null;
        };
        Update: {
          ano_fundacao?: number | null;
          aptidoes?: string[] | null;
          caracteristicas?: string[] | null;
          cavalos_famosos?: Json | null;
          cores_comuns?: string[] | null;
          coudelarias_principais?: string[] | null;
          created_at?: string | null;
          descricao?: string | null;
          fundador?: string | null;
          historia?: string | null;
          id?: string;
          imagem_capa?: string | null;
          imagens?: string[] | null;
          nome?: string;
          origem?: string | null;
          slug?: string;
          temperamento?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      marketplace_alertas: {
        Row: {
          ativo: boolean;
          created_at: string;
          desde: string;
          disciplina: string | null;
          frequencia: string;
          id: string;
          idade_max: number | null;
          idade_min: number | null;
          nivel: string | null;
          nome: string | null;
          preco_max: number | null;
          preco_min: number | null;
          regiao: string | null;
          sexo: string | null;
          termo: string | null;
          ultimo_envio_at: string | null;
          user_id: string;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          desde?: string;
          disciplina?: string | null;
          frequencia?: string;
          id?: string;
          idade_max?: number | null;
          idade_min?: number | null;
          nivel?: string | null;
          nome?: string | null;
          preco_max?: number | null;
          preco_min?: number | null;
          regiao?: string | null;
          sexo?: string | null;
          termo?: string | null;
          ultimo_envio_at?: string | null;
          user_id: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          desde?: string;
          disciplina?: string | null;
          frequencia?: string;
          id?: string;
          idade_max?: number | null;
          idade_min?: number | null;
          nivel?: string | null;
          nome?: string | null;
          preco_max?: number | null;
          preco_min?: number | null;
          regiao?: string | null;
          sexo?: string | null;
          termo?: string | null;
          ultimo_envio_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      marketplace_conversas: {
        Row: {
          arquivada_comprador: boolean;
          arquivada_vendedor: boolean;
          cavalo_id: string;
          comprador_id: string;
          comprador_nome: string | null;
          created_at: string;
          id: string;
          ultima_mensagem_at: string;
          vendedor_id: string;
        };
        Insert: {
          arquivada_comprador?: boolean;
          arquivada_vendedor?: boolean;
          cavalo_id: string;
          comprador_id: string;
          comprador_nome?: string | null;
          created_at?: string;
          id?: string;
          ultima_mensagem_at?: string;
          vendedor_id: string;
        };
        Update: {
          arquivada_comprador?: boolean;
          arquivada_vendedor?: boolean;
          cavalo_id?: string;
          comprador_id?: string;
          comprador_nome?: string | null;
          created_at?: string;
          id?: string;
          ultima_mensagem_at?: string;
          vendedor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_conversas_cavalo_id_fkey";
            columns: ["cavalo_id"];
            isOneToOne: false;
            referencedRelation: "cavalos_venda";
            referencedColumns: ["id"];
          },
        ];
      };
      marketplace_mensagens: {
        Row: {
          conversa_id: string;
          corpo: string;
          created_at: string;
          id: string;
          lida_at: string | null;
          remetente_id: string;
        };
        Insert: {
          conversa_id: string;
          corpo: string;
          created_at?: string;
          id?: string;
          lida_at?: string | null;
          remetente_id: string;
        };
        Update: {
          conversa_id?: string;
          corpo?: string;
          created_at?: string;
          id?: string;
          lida_at?: string | null;
          remetente_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_mensagens_conversa_id_fkey";
            columns: ["conversa_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_conversas";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string | null;
          currency: string | null;
          description: string | null;
          email: string | null;
          id: string;
          product_metadata: Json | null;
          product_type: string | null;
          refund_amount: number | null;
          refunded_at: string | null;
          status: string | null;
          stripe_payment_intent_id: string | null;
          stripe_session_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          amount?: number;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          email?: string | null;
          id?: string;
          product_metadata?: Json | null;
          product_type?: string | null;
          refund_amount?: number | null;
          refunded_at?: string | null;
          status?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_session_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          email?: string | null;
          id?: string;
          product_metadata?: Json | null;
          product_type?: string | null;
          refund_amount?: number | null;
          refunded_at?: string | null;
          status?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_session_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      profissionais: {
        Row: {
          aceita_deslocacoes: boolean | null;
          anos_experiencia: number | null;
          approved_at: string | null;
          approved_by: string | null;
          banner_url: string | null;
          canonical_url: string | null;
          certificacoes: Json | null;
          cidade: string | null;
          clicks_email: number | null;
          clicks_telefone: number | null;
          clicks_website: number | null;
          clicks_whatsapp: number | null;
          codigo_postal: string | null;
          created_at: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          descricao_completa: string | null;
          descricao_curta: string | null;
          destaque: boolean | null;
          disponibilidade_urgencias: boolean | null;
          distrito: string | null;
          email: string;
          especialidade: string | null;
          especialidades_detalhadas: string[] | null;
          facebook: string | null;
          formacao_academica: string | null;
          foto_perfil_url: string | null;
          horario_atendimento: Json | null;
          id: string;
          instagram: string | null;
          last_activity: string | null;
          leads_gerados: number | null;
          linguas: string[] | null;
          linkedin: string | null;
          meta_description: string | null;
          meta_keywords: string[] | null;
          meta_title: string | null;
          modalidade: string | null;
          morada: string | null;
          nome: string;
          ordem_destaque: number | null;
          pais: string | null;
          plano: string | null;
          plano_ativo: boolean | null;
          plano_fim: string | null;
          plano_inicio: string | null;
          plano_metodo_pagamento: string | null;
          plano_renovacao_automatica: boolean | null;
          plano_valor: number | null;
          portfolio: Json | null;
          premios_reconhecimentos: string[] | null;
          profile_views_last_30d: number | null;
          raio_deslocacao: number | null;
          rating_average: number | null;
          rating_count: number | null;
          reviews_aprovadas: number | null;
          servicos_oferecidos: Json | null;
          slug: string;
          status: string | null;
          telefone: string | null;
          telemovel: string;
          tempo_resposta_medio: string | null;
          tipo: string;
          titulo_profissional: string | null;
          updated_at: string | null;
          valor_deslocacao: number | null;
          verificado: boolean | null;
          verificado_em: string | null;
          verificado_por: string | null;
          videos: Json | null;
          views_count: number | null;
          website: string | null;
          whatsapp: string | null;
          zonas_atuacao: string[] | null;
        };
        Insert: {
          aceita_deslocacoes?: boolean | null;
          anos_experiencia?: number | null;
          approved_at?: string | null;
          approved_by?: string | null;
          banner_url?: string | null;
          canonical_url?: string | null;
          certificacoes?: Json | null;
          cidade?: string | null;
          clicks_email?: number | null;
          clicks_telefone?: number | null;
          clicks_website?: number | null;
          clicks_whatsapp?: number | null;
          codigo_postal?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao_completa?: string | null;
          descricao_curta?: string | null;
          destaque?: boolean | null;
          disponibilidade_urgencias?: boolean | null;
          distrito?: string | null;
          email: string;
          especialidade?: string | null;
          especialidades_detalhadas?: string[] | null;
          facebook?: string | null;
          formacao_academica?: string | null;
          foto_perfil_url?: string | null;
          horario_atendimento?: Json | null;
          id?: string;
          instagram?: string | null;
          last_activity?: string | null;
          leads_gerados?: number | null;
          linguas?: string[] | null;
          linkedin?: string | null;
          meta_description?: string | null;
          meta_keywords?: string[] | null;
          meta_title?: string | null;
          modalidade?: string | null;
          morada?: string | null;
          nome: string;
          ordem_destaque?: number | null;
          pais?: string | null;
          plano?: string | null;
          plano_ativo?: boolean | null;
          plano_fim?: string | null;
          plano_inicio?: string | null;
          plano_metodo_pagamento?: string | null;
          plano_renovacao_automatica?: boolean | null;
          plano_valor?: number | null;
          portfolio?: Json | null;
          premios_reconhecimentos?: string[] | null;
          profile_views_last_30d?: number | null;
          raio_deslocacao?: number | null;
          rating_average?: number | null;
          rating_count?: number | null;
          reviews_aprovadas?: number | null;
          servicos_oferecidos?: Json | null;
          slug: string;
          status?: string | null;
          telefone?: string | null;
          telemovel: string;
          tempo_resposta_medio?: string | null;
          tipo: string;
          titulo_profissional?: string | null;
          updated_at?: string | null;
          valor_deslocacao?: number | null;
          verificado?: boolean | null;
          verificado_em?: string | null;
          verificado_por?: string | null;
          videos?: Json | null;
          views_count?: number | null;
          website?: string | null;
          whatsapp?: string | null;
          zonas_atuacao?: string[] | null;
        };
        Update: {
          aceita_deslocacoes?: boolean | null;
          anos_experiencia?: number | null;
          approved_at?: string | null;
          approved_by?: string | null;
          banner_url?: string | null;
          canonical_url?: string | null;
          certificacoes?: Json | null;
          cidade?: string | null;
          clicks_email?: number | null;
          clicks_telefone?: number | null;
          clicks_website?: number | null;
          clicks_whatsapp?: number | null;
          codigo_postal?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao_completa?: string | null;
          descricao_curta?: string | null;
          destaque?: boolean | null;
          disponibilidade_urgencias?: boolean | null;
          distrito?: string | null;
          email?: string;
          especialidade?: string | null;
          especialidades_detalhadas?: string[] | null;
          facebook?: string | null;
          formacao_academica?: string | null;
          foto_perfil_url?: string | null;
          horario_atendimento?: Json | null;
          id?: string;
          instagram?: string | null;
          last_activity?: string | null;
          leads_gerados?: number | null;
          linguas?: string[] | null;
          linkedin?: string | null;
          meta_description?: string | null;
          meta_keywords?: string[] | null;
          meta_title?: string | null;
          modalidade?: string | null;
          morada?: string | null;
          nome?: string;
          ordem_destaque?: number | null;
          pais?: string | null;
          plano?: string | null;
          plano_ativo?: boolean | null;
          plano_fim?: string | null;
          plano_inicio?: string | null;
          plano_metodo_pagamento?: string | null;
          plano_renovacao_automatica?: boolean | null;
          plano_valor?: number | null;
          portfolio?: Json | null;
          premios_reconhecimentos?: string[] | null;
          profile_views_last_30d?: number | null;
          raio_deslocacao?: number | null;
          rating_average?: number | null;
          rating_count?: number | null;
          reviews_aprovadas?: number | null;
          servicos_oferecidos?: Json | null;
          slug?: string;
          status?: string | null;
          telefone?: string | null;
          telemovel?: string;
          tempo_resposta_medio?: string | null;
          tipo?: string;
          titulo_profissional?: string | null;
          updated_at?: string | null;
          valor_deslocacao?: number | null;
          verificado?: boolean | null;
          verificado_em?: string | null;
          verificado_por?: string | null;
          videos?: Json | null;
          views_count?: number | null;
          website?: string | null;
          whatsapp?: string | null;
          zonas_atuacao?: string[] | null;
        };
        Relationships: [];
      };
      profissionais_analytics_daily: {
        Row: {
          clicks_email: number | null;
          clicks_telefone: number | null;
          clicks_website: number | null;
          clicks_whatsapp: number | null;
          data: string;
          id: string;
          leads_gerados: number | null;
          profissional_id: string | null;
          views: number | null;
        };
        Insert: {
          clicks_email?: number | null;
          clicks_telefone?: number | null;
          clicks_website?: number | null;
          clicks_whatsapp?: number | null;
          data: string;
          id?: string;
          leads_gerados?: number | null;
          profissional_id?: string | null;
          views?: number | null;
        };
        Update: {
          clicks_email?: number | null;
          clicks_telefone?: number | null;
          clicks_website?: number | null;
          clicks_whatsapp?: number | null;
          data?: string;
          id?: string;
          leads_gerados?: number | null;
          profissional_id?: string | null;
          views?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "profissionais_analytics_daily_profissional_id_fkey";
            columns: ["profissional_id"];
            isOneToOne: false;
            referencedRelation: "profissionais";
            referencedColumns: ["id"];
          },
        ];
      };
      profissionais_artigos: {
        Row: {
          categoria: string;
          conteudo: string;
          created_at: string | null;
          id: string;
          leituras: number | null;
          profissional_id: string;
          resumo: string;
          titulo: string;
          updated_at: string | null;
        };
        Insert: {
          categoria: string;
          conteudo: string;
          created_at?: string | null;
          id?: string;
          leituras?: number | null;
          profissional_id: string;
          resumo: string;
          titulo: string;
          updated_at?: string | null;
        };
        Update: {
          categoria?: string;
          conteudo?: string;
          created_at?: string | null;
          id?: string;
          leituras?: number | null;
          profissional_id?: string;
          resumo?: string;
          titulo?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profissionais_artigos_profissional_id_fkey";
            columns: ["profissional_id"];
            isOneToOne: false;
            referencedRelation: "profissionais";
            referencedColumns: ["id"];
          },
        ];
      };
      profissionais_eventos: {
        Row: {
          created_at: string | null;
          data_fim: string | null;
          data_inicio: string;
          descricao: string;
          id: string;
          link_inscricao: string | null;
          local: string | null;
          online: boolean | null;
          pais: string | null;
          preco: string | null;
          profissional_id: string;
          tipo: string;
          titulo: string;
          updated_at: string | null;
          vagas: number | null;
        };
        Insert: {
          created_at?: string | null;
          data_fim?: string | null;
          data_inicio: string;
          descricao: string;
          id?: string;
          link_inscricao?: string | null;
          local?: string | null;
          online?: boolean | null;
          pais?: string | null;
          preco?: string | null;
          profissional_id: string;
          tipo: string;
          titulo: string;
          updated_at?: string | null;
          vagas?: number | null;
        };
        Update: {
          created_at?: string | null;
          data_fim?: string | null;
          data_inicio?: string;
          descricao?: string;
          id?: string;
          link_inscricao?: string | null;
          local?: string | null;
          online?: boolean | null;
          pais?: string | null;
          preco?: string | null;
          profissional_id?: string;
          tipo?: string;
          titulo?: string;
          updated_at?: string | null;
          vagas?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "profissionais_eventos_profissional_id_fkey";
            columns: ["profissional_id"];
            isOneToOne: false;
            referencedRelation: "profissionais";
            referencedColumns: ["id"];
          },
        ];
      };
      profissionais_leads: {
        Row: {
          contactado_em: string | null;
          created_at: string | null;
          email: string;
          id: string;
          ip_address: string | null;
          mensagem: string | null;
          nome: string;
          notas_profissional: string | null;
          origem: string | null;
          profissional_id: string | null;
          servico_interesse: string | null;
          status: string | null;
          telefone: string | null;
          urgencia: string | null;
          user_agent: string | null;
        };
        Insert: {
          contactado_em?: string | null;
          created_at?: string | null;
          email: string;
          id?: string;
          ip_address?: string | null;
          mensagem?: string | null;
          nome: string;
          notas_profissional?: string | null;
          origem?: string | null;
          profissional_id?: string | null;
          servico_interesse?: string | null;
          status?: string | null;
          telefone?: string | null;
          urgencia?: string | null;
          user_agent?: string | null;
        };
        Update: {
          contactado_em?: string | null;
          created_at?: string | null;
          email?: string;
          id?: string;
          ip_address?: string | null;
          mensagem?: string | null;
          nome?: string;
          notas_profissional?: string | null;
          origem?: string | null;
          profissional_id?: string | null;
          servico_interesse?: string | null;
          status?: string | null;
          telefone?: string | null;
          urgencia?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profissionais_leads_profissional_id_fkey";
            columns: ["profissional_id"];
            isOneToOne: false;
            referencedRelation: "profissionais";
            referencedColumns: ["id"];
          },
        ];
      };
      profissionais_reviews: {
        Row: {
          cliente_email: string;
          cliente_nome: string;
          cliente_telefone: string | null;
          comentario: string;
          created_at: string | null;
          id: string;
          moderado_em: string | null;
          moderado_por: string | null;
          motivo_rejeicao: string | null;
          profissional_id: string | null;
          rating: number;
          respondido_em: string | null;
          resposta_profissional: string | null;
          servico_utilizado: string | null;
          status: string | null;
          titulo: string | null;
          updated_at: string | null;
        };
        Insert: {
          cliente_email: string;
          cliente_nome: string;
          cliente_telefone?: string | null;
          comentario: string;
          created_at?: string | null;
          id?: string;
          moderado_em?: string | null;
          moderado_por?: string | null;
          motivo_rejeicao?: string | null;
          profissional_id?: string | null;
          rating: number;
          respondido_em?: string | null;
          resposta_profissional?: string | null;
          servico_utilizado?: string | null;
          status?: string | null;
          titulo?: string | null;
          updated_at?: string | null;
        };
        Update: {
          cliente_email?: string;
          cliente_nome?: string;
          cliente_telefone?: string | null;
          comentario?: string;
          created_at?: string | null;
          id?: string;
          moderado_em?: string | null;
          moderado_por?: string | null;
          motivo_rejeicao?: string | null;
          profissional_id?: string | null;
          rating?: number;
          respondido_em?: string | null;
          resposta_profissional?: string | null;
          servico_utilizado?: string | null;
          status?: string | null;
          titulo?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profissionais_reviews_profissional_id_fkey";
            columns: ["profissional_id"];
            isOneToOne: false;
            referencedRelation: "profissionais";
            referencedColumns: ["id"];
          },
        ];
      };
      profissionais_subscription_historico: {
        Row: {
          created_at: string | null;
          fim: string;
          id: string;
          inicio: string;
          payment_id: string | null;
          plano: string;
          profissional_id: string | null;
          renovado_para_id: string | null;
          status: string | null;
          valor: number;
        };
        Insert: {
          created_at?: string | null;
          fim: string;
          id?: string;
          inicio: string;
          payment_id?: string | null;
          plano: string;
          profissional_id?: string | null;
          renovado_para_id?: string | null;
          status?: string | null;
          valor: number;
        };
        Update: {
          created_at?: string | null;
          fim?: string;
          id?: string;
          inicio?: string;
          payment_id?: string | null;
          plano?: string;
          profissional_id?: string | null;
          renovado_para_id?: string | null;
          status?: string | null;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "profissionais_subscription_historico_profissional_id_fkey";
            columns: ["profissional_id"];
            isOneToOne: false;
            referencedRelation: "profissionais";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          autor_email: string | null;
          autor_localizacao: string | null;
          autor_nome: string;
          avaliacao: number;
          comentario: string;
          coudelaria_id: string | null;
          created_at: string | null;
          data_visita: string | null;
          ferramenta_slug: string | null;
          id: string;
          likes_count: number | null;
          recomenda: boolean | null;
          resposta_coudelaria: string | null;
          resposta_data: string | null;
          status: string | null;
          tipo_visita: string | null;
          titulo: string | null;
          updated_at: string | null;
          verificado: boolean | null;
        };
        Insert: {
          autor_email?: string | null;
          autor_localizacao?: string | null;
          autor_nome: string;
          avaliacao: number;
          comentario: string;
          coudelaria_id?: string | null;
          created_at?: string | null;
          data_visita?: string | null;
          ferramenta_slug?: string | null;
          id?: string;
          likes_count?: number | null;
          recomenda?: boolean | null;
          resposta_coudelaria?: string | null;
          resposta_data?: string | null;
          status?: string | null;
          tipo_visita?: string | null;
          titulo?: string | null;
          updated_at?: string | null;
          verificado?: boolean | null;
        };
        Update: {
          autor_email?: string | null;
          autor_localizacao?: string | null;
          autor_nome?: string;
          avaliacao?: number;
          comentario?: string;
          coudelaria_id?: string | null;
          created_at?: string | null;
          data_visita?: string | null;
          ferramenta_slug?: string | null;
          id?: string;
          likes_count?: number | null;
          recomenda?: boolean | null;
          resposta_coudelaria?: string | null;
          resposta_data?: string | null;
          status?: string | null;
          tipo_visita?: string | null;
          titulo?: string | null;
          updated_at?: string | null;
          verificado?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_coudelaria_id_fkey";
            columns: ["coudelaria_id"];
            isOneToOne: false;
            referencedRelation: "coudelarias";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_ratings: {
        Row: {
          buyer_email: string;
          cavalo_id: string;
          comment: string | null;
          created_at: string | null;
          id: string;
          rating: number;
        };
        Insert: {
          buyer_email: string;
          cavalo_id: string;
          comment?: string | null;
          created_at?: string | null;
          id?: string;
          rating: number;
        };
        Update: {
          buyer_email?: string;
          cavalo_id?: string;
          comment?: string | null;
          created_at?: string | null;
          id?: string;
          rating?: number;
        };
        Relationships: [
          {
            foreignKeyName: "seller_ratings_cavalo_id_fkey";
            columns: ["cavalo_id"];
            isOneToOne: false;
            referencedRelation: "cavalos_venda";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      aplicar_cupao: {
        Args: {
          p_cliente_email: string;
          p_cliente_nome: string;
          p_cupao_id: string;
          p_ip_address?: string;
          p_payment_id: string;
          p_produto_tipo: string;
          p_valor_desconto: number;
          p_valor_final: number;
          p_valor_original: number;
        };
        Returns: string;
      };
      generate_recovery_token: { Args: never; Returns: string };
      log_admin_activity: {
        Args: {
          p_action_type: string;
          p_admin_email: string;
          p_changes?: Json;
          p_description?: string;
          p_entity_id?: string;
          p_entity_name?: string;
          p_entity_type: string;
          p_severity?: string;
        };
        Returns: string;
      };
      mark_cart_recovered: {
        Args: { p_order_id: string; p_recovery_token: string };
        Returns: boolean;
      };
      registar_visualizacao_cavalo: {
        Args: { p_cavalo_id: string; p_visitante_hash: string };
        Returns: boolean;
      };
      validar_cupao: {
        Args: {
          p_cliente_email: string;
          p_codigo: string;
          p_produto_tipo: string;
          p_valor_compra: number;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
