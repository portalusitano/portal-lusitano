-- Privilégios de tabela como a Supabase os dá por omissão a anon/authenticated.
-- Sem eles a negação viria do GRANT e a prova da RLS seria vazia.
GRANT SELECT, INSERT, UPDATE ON public.marketplace_conversas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_mensagens TO authenticated;
GRANT SELECT ON public.marketplace_conversas TO anon;
GRANT SELECT ON public.marketplace_mensagens TO anon;
GRANT SELECT ON public.cavalos_venda TO anon, authenticated;
