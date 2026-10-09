-- The API and worker connect through a private Postgres connection string.
-- The browser uses Supabase Auth only; no service credentials are exposed.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Company', 'User', 'Sector', 'WhatsAppConnection', 'AuthSession',
    'Contact', 'Conversation', 'Message', 'InternalNote', 'ConversationEvent', 'BotConfig'
  ] LOOP
    IF to_regclass('public."' || table_name || '"') IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END $$;

-- Keep tenant data private until the authenticated API policies are installed.
-- Prisma uses the private database connection and is not exposed through PostgREST.
REVOKE ALL ON TABLE
  public."Company", public."User", public."Sector", public."WhatsAppConnection",
  public."AuthSession", public."Contact", public."Conversation", public."Message",
  public."InternalNote", public."ConversationEvent", public."BotConfig"
FROM anon, authenticated;
