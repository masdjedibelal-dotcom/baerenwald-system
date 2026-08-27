--
-- PostgreSQL database dump
--

\restrict fEGSXBM4KTO9vmZJQwBoypTz8YhoJUlqb5IjVsAuuDmJvrJjzgBKSvlk3ej4hVa

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: angebot_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.angebot_status AS ENUM (
    'entwurf',
    'gesendet_handwerker',
    'handwerker_akzeptiert',
    'gesendet_kunde',
    'kunde_akzeptiert',
    'abgelehnt'
);


--
-- Name: auftrag_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.auftrag_status AS ENUM (
    'offen',
    'in_arbeit',
    'abnahme',
    'abgeschlossen',
    'storniert'
);


--
-- Name: formular_phase; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.formular_phase AS ENUM (
    'vorab',
    'update',
    'abnahme'
);


--
-- Name: formular_typ; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.formular_typ AS ENUM (
    'handwerker',
    'betreuer'
);


--
-- Name: lead_kanal; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lead_kanal AS ENUM (
    'website',
    'telefon',
    'whatsapp',
    'email',
    'vor_ort',
    'sonstiges',
    'hv_melder_link',
    'hv_direkt',
    'hv_einladung',
    'hv_katalog',
    'hv_manuell',
    'servicepaket'
);


--
-- Name: TYPE lead_kanal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.lead_kanal IS 'Lead-Kanäle; servicepaket = HV Portal screenServicepakete (Portal 2.0 D5)';


--
-- Name: lead_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lead_status AS ENUM (
    'neu',
    'kontaktiert',
    'termin',
    'angebot',
    'auftrag',
    'abgeschlossen',
    'abgebrochen'
);


--
-- Name: termin_typ; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.termin_typ AS ENUM (
    'besichtigung',
    'beginn',
    'abnahme',
    'sonstiges'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'manager'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in',
    'like',
    'ilike',
    'is',
    'match',
    'imatch',
    'isdistinct'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text,
	negate boolean
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
begin
    if not exists (
        select 1
        from pg_catalog.pg_event_trigger_ddl_commands() ev
        join pg_catalog.pg_extension e on ev.objid = e.oid
        where e.extname = 'pg_graphql'
    ) then
        return;
    end if;

    drop function if exists graphql_public.graphql;
    create or replace function graphql_public.graphql(
        "operationName" text default null,
        query text default null,
        variables jsonb default null,
        extensions jsonb default null
    )
        returns jsonb
        language sql
        set search_path to ''
    as $$
        select graphql.resolve(
            query := query,
            variables := coalesce(variables, '{}'),
            "operationName" := "operationName",
            extensions := extensions
        );
    $$;

    -- Attach the wrapper to the extension so DROP EXTENSION cascades to it,
    -- which in turn triggers set_graphql_placeholder to reinstall the "not enabled" stub.
    alter extension pg_graphql add function graphql_public.graphql(text, text, jsonb, jsonb);

    grant usage on schema graphql to postgres, anon, authenticated, service_role;
    grant execute on function graphql.resolve to postgres, anon, authenticated, service_role;
    grant usage on schema graphql to postgres with grant option;
    grant usage on schema graphql_public to postgres with grant option;
end;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: -
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: compute_handwercher_compliance(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_handwercher_compliance(p_handwerker_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
declare
  fehlend int;
  abgelaufen int;
  warnung int;
  hw_gewerke text[];
  hat_bau boolean;
  hat_meister boolean;
begin
  select coalesce(h.gewerke, '{}'::text[]) into hw_gewerke
  from public.handwerker h where h.id = p_handwerker_id;

  hat_bau := public.handwerker_hat_bauleistung(hw_gewerke);
  hat_meister := public.handwerker_hat_meister_gewerk(hw_gewerke);

  select count(*) into fehlend
  from public.compliance_dokument_typen t
  where coalesce(t.aktiv, true) = true
    and t.compliance_ebene in ('allgemein', 'meister')
    and t.pflicht_fuer_fachbetriebe = true
    and (not t.nur_bei_bauleistung or hat_bau)
    and (t.compliance_ebene <> 'meister' or hat_meister)
    and (
      t.gewerk_slugs is null
      or cardinality(t.gewerk_slugs) = 0
      or t.gewerk_slugs && hw_gewerke
    )
    and not exists (
      select 1
      from public.partner_dokumente d
      where d.handwerker_id = p_handwerker_id
        and d.auftrag_id is null
        and d.typ = t.slug
        and d.datei_url is not null
        and trim(d.datei_url) <> ''
        and coalesce(d.status, 'freigegeben') in ('freigegeben', 'genehmigt')
        and (d.gueltig_bis is null or d.gueltig_bis >= current_date)
    )
    and t.slug <> 'rahmenvertrag';

  -- Rahmenvertrag: auch über handwerker_vertraege
  if exists (
    select 1 from public.compliance_dokument_typen t
    where t.slug = 'rahmenvertrag' and t.pflicht_fuer_fachbetriebe = true and coalesce(t.aktiv, true)
  ) and not exists (
    select 1 from public.partner_dokumente d
    where d.handwerker_id = p_handwerker_id and d.typ = 'rahmenvertrag'
      and d.auftrag_id is null and d.datei_url is not null and trim(d.datei_url) <> ''
      and coalesce(d.status, 'freigegeben') in ('freigegeben', 'genehmigt')
      and (d.gueltig_bis is null or d.gueltig_bis >= current_date)
  ) and not exists (
    select 1 from public.handwerker_vertraege v
    where v.handwerker_id = p_handwerker_id and v.typ = 'rahmen'
      and v.pdf_url is not null and trim(v.pdf_url) <> ''
      and v.status in ('pdf_erzeugt', 'unterschrieben')
  ) then
    fehlend := fehlend + 1;
  end if;

  select count(*) into abgelaufen
  from public.partner_dokumente d
  join public.compliance_dokument_typen t on t.slug = d.typ
  where d.handwerker_id = p_handwerker_id
    and d.auftrag_id is null
    and coalesce(t.aktiv, true) = true
    and t.compliance_ebene in ('allgemein', 'meister')
    and t.pflicht_fuer_fachbetriebe = true
    and d.gueltig_bis is not null
    and d.gueltig_bis < current_date;

  select count(*) into warnung
  from public.partner_dokumente d
  join public.compliance_dokument_typen t on t.slug = d.typ
  where d.handwerker_id = p_handwerker_id
    and d.auftrag_id is null
    and coalesce(t.aktiv, true) = true
    and t.compliance_ebene in ('allgemein', 'meister')
    and t.pflicht_fuer_fachbetriebe = true
    and d.gueltig_bis is not null
    and d.gueltig_bis >= current_date
    and d.gueltig_bis <= current_date + interval '30 days';

  if fehlend > 0 or abgelaufen > 0 then
    return 'unvollständig';
  elsif warnung > 0 then
    return 'warnung';
  else
    return 'vollständig';
  end if;
end;
$$;


--
-- Name: generate_beleg_nummer(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_beleg_nummer(p_typ text DEFAULT 'rechnung'::text) RETURNS text
    LANGUAGE plpgsql
    AS $_$
declare
  jahr text;
  prefix text;
  start_num int;
  max_num int;
  next_num int;
begin
  jahr := to_char(now(), 'YYYY');

  if coalesce(p_typ, 'rechnung') = 'gutschrift' then
    prefix := 'GS-RE' || jahr || '-';
  else
    prefix := 'RE' || jahr || '-';
  end if;

  start_num := case when jahr = '2026' then 2069 else 1 end;

  select coalesce(
    max(substring(rechnungsnummer from char_length(prefix) + 1)::int),
    0
  )
  into max_num
  from public.rechnungen
  where rechnungsnummer like prefix || '%'
    and substring(rechnungsnummer from char_length(prefix) + 1) ~ '^[0-9]+$'
    and lower(coalesce(status, '')) is distinct from 'entwurf';

  next_num := greatest(max_num + 1, start_num);

  return prefix || next_num::text;
end;
$_$;


--
-- Name: FUNCTION generate_beleg_nummer(p_typ text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generate_beleg_nummer(p_typ text) IS 'Fortlaufende Belegnummer beim Versand. Entwürfe zählen nicht (keine Lücken durch ungesendete Entwürfe).';


--
-- Name: generate_kundennummer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_kundennummer() RETURNS text
    LANGUAGE plpgsql
    AS $$
declare
  jahr text;
  laufend int;
begin
  jahr := to_char(now(), 'YYYY');
  select count(*) + 1
    into laufend
  from kunden
  where kundennummer
    like 'KD-' || jahr || '-%';
  return 'KD-' || jahr || '-'
    || lpad(laufend::text,
       4, '0');
end;
$$;


--
-- Name: generate_rechnungsnummer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_rechnungsnummer() RETURNS text
    LANGUAGE sql
    AS $$
  select public.generate_beleg_nummer('rechnung');
$$;


--
-- Name: get_kunde_id_by_portal_token(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_kunde_id_by_portal_token(token text) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT id FROM kunden
  WHERE portal_token = token
  LIMIT 1;
$$;


--
-- Name: handwerker_hat_bauleistung(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handwerker_hat_bauleistung(p_gewerke text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select exists (
    select 1
    from public.gewerke g
    where g.slug = any (coalesce(p_gewerke, '{}'::text[]))
      and g.ist_bauleistung = true
  );
$$;


--
-- Name: handwerker_hat_meister_gewerk(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handwerker_hat_meister_gewerk(p_gewerke text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select exists (
    select 1
    from public.gewerke g
    where g.slug = any (coalesce(p_gewerke, '{}'::text[]))
      and g.ausfuehrung in ('fachbetrieb', 'beides')
  );
$$;


--
-- Name: is_crm_staff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_crm_staff() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    SET row_security TO 'off'
    AS $$
  select exists (
    select 1 from public.user_profiles where id = auth.uid()
  );
$$;


--
-- Name: is_portal_handwerker(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_portal_handwerker() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    SET row_security TO 'off'
    AS $$
  select public.portal_handwerker_id() is not null;
$$;


--
-- Name: partner_todos_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.partner_todos_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: portal_auth_email_registered(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.portal_auth_email_registered(p_email text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'auth', 'public'
    AS $$
  select exists(
    select 1
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
  );
$$;


--
-- Name: portal_handwerker_angebot_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.portal_handwerker_angebot_ids() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    SET row_security TO 'off'
    AS $$
  select ah.angebot_id
  from public.angebot_handwerker ah
  where ah.handwerker_id = public.portal_handwerker_id()
    and ah.gesendet_at is not null;
$$;


--
-- Name: portal_handwerker_auftrag_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.portal_handwerker_auftrag_ids() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    SET row_security TO 'off'
    AS $$
  select ah.auftrag_id
  from public.auftrag_handwerker ah
  where ah.handwerker_id = public.portal_handwerker_id()
  union
  select ap.auftrag_id
  from public.auftrag_positionen ap
  where ap.handwerker_id = public.portal_handwerker_id();
$$;


--
-- Name: portal_handwerker_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.portal_handwerker_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    SET row_security TO 'off'
    AS $$
  select id from public.handwerker where auth_user_id = auth.uid() limit 1;
$$;


--
-- Name: portal_handwerker_kunde_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.portal_handwerker_kunde_ids() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    SET row_security TO 'off'
    AS $$
  select distinct a.kunde_id
  from public.angebote a
  inner join public.angebot_handwerker ah on ah.angebot_id = a.id
  where ah.handwerker_id = public.portal_handwerker_id()
    and ah.gesendet_at is not null
    and a.kunde_id is not null;
$$;


--
-- Name: portal_handwerker_lead_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.portal_handwerker_lead_ids() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    SET row_security TO 'off'
    AS $$
  select distinct a.lead_id
  from public.angebote a
  inner join public.angebot_handwerker ah on ah.angebot_id = a.id
  where ah.handwerker_id = public.portal_handwerker_id()
    and ah.gesendet_at is not null
    and a.lead_id is not null;
$$;


--
-- Name: portal_is_organisation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.portal_is_organisation() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    SET row_security TO 'off'
    AS $$
  select public.portal_kunde_portal_modus() = 'organisation';
$$;


--
-- Name: FUNCTION portal_is_organisation(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.portal_is_organisation() IS 'true wenn eingeloggter Nutzer ein Auftraggeber-Portal-Konto hat';


--
-- Name: portal_kunde_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.portal_kunde_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    SET row_security TO 'off'
    AS $$
  select coalesce(
    (select k.id from public.kunden k where k.auth_user_id = auth.uid() limit 1),
    (select m.kunde_id from public.kunden_mitglieder m
     where m.auth_user_id = auth.uid() and m.aktiv = true limit 1)
  );
$$;


--
-- Name: portal_kunde_lead_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.portal_kunde_lead_ids() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    SET row_security TO 'off'
    AS $$
  select l.id
  from public.leads l
  where l.kunde_id = public.portal_kunde_id();
$$;


--
-- Name: portal_kunde_portal_modus(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.portal_kunde_portal_modus() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    SET row_security TO 'off'
    AS $$
  select coalesce(
    (select k.portal_modus from public.kunden k where k.auth_user_id = auth.uid() limit 1),
    'privat'
  );
$$;


--
-- Name: portal_org_can_write(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.portal_org_can_write() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(public.portal_org_mitglied_rolle(), 'admin')
    in ('admin', 'sachbearbeiter');
$$;


--
-- Name: portal_org_mitglied_rolle(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.portal_org_mitglied_rolle() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    SET row_security TO 'off'
    AS $$
  select coalesce(
    (select 'admin' from public.kunden k
     where k.auth_user_id = auth.uid() and k.portal_modus = 'organisation' limit 1),
    (select m.rolle from public.kunden_mitglieder m
     where m.auth_user_id = auth.uid() and m.aktiv = true limit 1)
  );
$$;


--
-- Name: portal_organisation_objekt_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.portal_organisation_objekt_ids() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    SET row_security TO 'off'
    AS $$
  select o.id
  from public.kunden_objekte o
  where o.kunde_id = public.portal_kunde_id();
$$;


--
-- Name: recalc_handwerker_bewertungen(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalc_handwerker_bewertungen(p_handwerker_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.handwerker h
  set
    bewertung_anzahl = coalesce(s.cnt, 0),
    bewertung_gesamt = s.avg_gesamt,
    bewertung_qualitaet = s.avg_qualitaet,
    bewertung_termintreue = s.avg_termintreue,
    bewertung_sauberkeit = s.avg_sauberkeit,
    bewertung_kommunikation = s.avg_kommunikation,
    bewertung_preis_leistung = s.avg_preis_leistung
  from (
    select
      count(*)::int as cnt,
      round(avg((qualitaet + termintreue + sauberkeit + kommunikation + preis_leistung)::numeric / 5.0), 2) as avg_gesamt,
      round(avg(qualitaet::numeric), 2) as avg_qualitaet,
      round(avg(termintreue::numeric), 2) as avg_termintreue,
      round(avg(sauberkeit::numeric), 2) as avg_sauberkeit,
      round(avg(kommunikation::numeric), 2) as avg_kommunikation,
      round(avg(preis_leistung::numeric), 2) as avg_preis_leistung
    from public.handwerker_bewertungen
    where handwerker_id = p_handwerker_id
  ) s
  where h.id = p_handwerker_id;
end;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: set_handwerker_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_handwerker_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: set_kundennummer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_kundennummer() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.kundennummer is null then
    new.kundennummer :=
      generate_kundennummer();
  end if;
  return new;
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: sync_email_to_timeline(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_email_to_timeline() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  if new.auftrag_id is not null then
    insert into auftrag_timeline(
      auftrag_id,
      typ,
      titel)
    values (
      new.auftrag_id,
      'mail',
      'Mail gesendet: ' ||
        coalesce(new.betreff,
          new.subject, '')
    );
  end if;
  return new;
end;
$$;


--
-- Name: touch_auftrag_letzte_aktivitaet_from_position(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_auftrag_letzte_aktivitaet_from_position() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.leistung_status IS DISTINCT FROM OLD.leistung_status
     AND NEW.leistung_status = 'erledigt'
     AND NEW.auftrag_id IS NOT NULL
  THEN
    UPDATE public.auftraege
    SET letzte_aktivitaet = COALESCE(NEW.erledigt_am, now())
    WHERE id = NEW.auftrag_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: trg_handwerker_bewertungen_recalc(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_handwerker_bewertungen_recalc() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  hw_id uuid;
begin
  hw_id := coalesce(new.handwerker_id, old.handwerker_id);
  perform public.recalc_handwerker_bewertungen(hw_id);
  return coalesce(new, old);
end;
$$;


--
-- Name: update_compliance_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_compliance_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  fehlend int;
  abgelaufen int;
  warnung int;
begin
  -- Fehlende Pflicht-Dokumente
  select count(*) into fehlend
  from compliance_dokument_typen t
  where t.pflicht_fuer_fachbetriebe
    = true
  and not exists (
    select 1 from partner_dokumente d
    where d.handwerker_id = new.id
    and d.typ = t.slug
    and (d.gueltig_bis is null
      or d.gueltig_bis >= now())
  );

  -- Abgelaufene Dokumente
  select count(*) into abgelaufen
  from partner_dokumente
  where handwerker_id = new.id
  and gueltig_bis < now();

  -- Läuft in 30 Tagen ab
  select count(*) into warnung
  from partner_dokumente
  where handwerker_id = new.id
  and gueltig_bis between
    now() and now()
    + interval '30 days';

  if fehlend > 0 or abgelaufen > 0
    then new.compliance_status
      := 'unvollstaendig';
  elsif warnung > 0
    then new.compliance_status
      := 'warnung';
  else
    new.compliance_status
      := 'vollstaendig';
  end if;

  return new;
end;
$$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
    -- Regclass of the table e.g. public.notes
    entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

    -- I, U, D, T: insert, update ...
    action realtime.action = (
        case wal ->> 'action'
            when 'I' then 'INSERT'
            when 'U' then 'UPDATE'
            when 'D' then 'DELETE'
            else 'ERROR'
        end
    );

    -- Is row level security enabled for the table
    is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

    subscriptions realtime.subscription[] = array_agg(subs)
        from
            realtime.subscription subs
        where
            subs.entity = entity_
            -- Filter by action early - only get subscriptions interested in this action
            -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
            and (subs.action_filter = '*' or subs.action_filter = action::text);

    -- Subscription vars
    working_role regrole;
    working_selected_columns text[];
    claimed_role regrole;
    claims jsonb;

    subscription_id uuid;
    subscription_has_access bool;
    visible_to_subscription_ids uuid[] = '{}';

    -- structured info for wal's columns
    columns realtime.wal_column[];
    -- previous identity values for update/delete
    old_columns realtime.wal_column[];

    error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

    -- Primary jsonb output for record
    output jsonb;

    -- Loop record for iterating unique roles (outer loop)
    role_record record;
    -- Loop record for iterating unique selected_columns within a role (inner loop)
    cols_record record;
    -- Subscription ids visible at the role level (before fanning out by selected_columns)
    visible_role_sub_ids uuid[] = '{}';

begin
    perform set_config('role', null, true);

    columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'columns') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    old_columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'identity') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    for role_record in
        select claims_role
        from (select distinct claims_role from unnest(subscriptions)) t
        order by claims_role::text
    loop
        working_role := role_record.claims_role;

        -- Update `is_selectable` for columns and old_columns (once per role)
        columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(columns) c;

        old_columns =
                array_agg(
                    (
                        c.name,
                        c.type_name,
                        c.type_oid,
                        c.value,
                        c.is_pkey,
                        pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                    )::realtime.wal_column
                )
                from
                    unnest(old_columns) c;

        if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
            -- Fan out 400 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 400: Bad Request, no primary key']
                )::realtime.wal_rls;
            end loop;

        -- The claims role does not have SELECT permission to the primary key of entity
        elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
            -- Fan out 401 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 401: Unauthorized']
                )::realtime.wal_rls;
            end loop;

        else
            -- Create the prepared statement (once per role)
            if is_rls_enabled and action <> 'DELETE' then
                if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                    deallocate walrus_rls_stmt;
                end if;
                execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
            end if;

            -- Collect all visible subscription IDs for this role (filter check + RLS check)
            visible_role_sub_ids = '{}';

            for subscription_id, claims in (
                    select
                        subs.subscription_id,
                        subs.claims
                    from
                        unnest(subscriptions) subs
                    where
                        subs.entity = entity_
                        and subs.claims_role = working_role
                        and (
                            realtime.is_visible_through_filters(columns, subs.filters)
                            or (
                              action = 'DELETE'
                              and realtime.is_visible_through_filters(old_columns, subs.filters)
                            )
                        )
            ) loop

                if not is_rls_enabled or action = 'DELETE' then
                    visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                else
                    -- Check if RLS allows the role to see the record
                    perform
                        -- Trim leading and trailing quotes from working_role because set_config
                        -- doesn't recognize the role as valid if they are included
                        set_config('role', trim(both '"' from working_role::text), true),
                        set_config('request.jwt.claims', claims::text, true);

                    execute 'execute walrus_rls_stmt' into subscription_has_access;

                    -- Reset the role on every FOR..LOOP batch execution.
                    -- The first batch of 10 rows is pre-fetched using the current connection role (PG internal behaviour)
                    -- then we have to reset it again otherwise it would use the role defined in the `set_config` above
                    -- to fetch the remaining rows when rows>10, which could be a user-defined role that lacks execution grants.
                    -- The flow is:
                    --   1. run batch with conn role
                    --   2. set_config working_role
                    --   3. execute walrus
                    --   4. reset role (revert)
                    --   5. repeat
                    perform set_config('role', null, true);

                    if subscription_has_access then
                        visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                    end if;
                end if;
            end loop;

            perform set_config('role', null, true);

            -- Inner loop: per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;

                output = jsonb_build_object(
                    'schema', wal ->> 'schema',
                    'table', wal ->> 'table',
                    'type', action,
                    'commit_timestamp', to_char(
                        ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                    ),
                    'columns', (
                        select
                            jsonb_agg(
                                jsonb_build_object(
                                    'name', pa.attname,
                                    'type', pt.typname
                                )
                                order by pa.attnum asc
                            )
                        from
                            pg_attribute pa
                            join pg_type pt
                                on pa.atttypid = pt.oid
                            left join (
                                select unnest(conkey) as pkey_attnum
                                from pg_constraint
                                where conrelid = entity_ and contype = 'p'
                            ) pk on pk.pkey_attnum = pa.attnum
                        where
                            attrelid = entity_
                            and attnum > 0
                            and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
                            and (working_selected_columns is null or pa.attname = any(working_selected_columns) or pk.pkey_attnum is not null)
                    )
                )
                -- Add "record" key for insert and update
                || case
                    when action in ('INSERT', 'UPDATE') then
                        jsonb_build_object(
                            'record',
                            (
                                select
                                    jsonb_object_agg(
                                        -- if unchanged toast, get column name and value from old record
                                        coalesce((c).name, (oc).name),
                                        case
                                            when (c).name is null then (oc).value
                                            else (c).value
                                        end
                                    )
                                from
                                    unnest(columns) c
                                    full outer join unnest(old_columns) oc
                                        on (c).name = (oc).name
                                where
                                    coalesce((c).is_selectable, (oc).is_selectable)
                                    and (working_selected_columns is null or coalesce((c).name, (oc).name) = any(working_selected_columns) or coalesce((c).is_pkey, (oc).is_pkey))
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            )
                        )
                    else '{}'::jsonb
                end
                -- Add "old_record" key for update and delete
                || case
                    when action = 'UPDATE' then
                        jsonb_build_object(
                                'old_record',
                                (
                                    select jsonb_object_agg((c).name, (c).value)
                                    from unnest(old_columns) c
                                    where
                                        (c).is_selectable
                                        and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                        and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                )
                            )
                    when action = 'DELETE' then
                        jsonb_build_object(
                            'old_record',
                            (
                                select jsonb_object_agg((c).name, (c).value)
                                from unnest(old_columns) c
                                where
                                    (c).is_selectable
                                    and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                    and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                            )
                        )
                    else '{}'::jsonb
                end;

                -- Filter visible_role_sub_ids to those matching the current selected_columns group
                visible_to_subscription_ids = coalesce(
                    (
                        select array_agg(s.subscription_id)
                        from unnest(subscriptions) s
                        where s.claims_role = working_role
                          and (s.selected_columns is not distinct from working_selected_columns)
                          and s.subscription_id = any(visible_role_sub_ids)
                    ),
                    '{}'::uuid[]
                );

                return next (
                    output,
                    is_rls_enabled,
                    visible_to_subscription_ids,
                    case
                        when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                        else '{}'
                    end
                )::realtime.wal_rls;
            end loop;

        end if;
    end loop;

    perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
/*
Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
*/
declare
    op_symbol text = (
        case
            when op = 'eq' then '='
            when op = 'neq' then '!='
            when op = 'lt' then '<'
            when op = 'lte' then '<='
            when op = 'gt' then '>'
            when op = 'gte' then '>='
            when op = 'in' then '= any'
            else 'UNKNOWN OP'
        end
    );
    res boolean;
begin
    execute format(
        'select %L::'|| type_::text || ' ' || op_symbol
        || ' ( %L::'
        || (
            case
                when op = 'in' then type_::text || '[]'
                else type_::text end
        )
        || ')', val_1, val_2) into res;
    return res;
end;
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
declare
    op_symbol text;
    res boolean;
begin
    -- IS DISTINCT FROM / IS NOT DISTINCT FROM: infix, both sides typed literals
    if op = 'isdistinct' then
        execute format(
            'select %L::%s %s %L::%s',
            val_1,
            type_::text,
            case when negate then 'IS NOT DISTINCT FROM' else 'IS DISTINCT FROM' end,
            val_2,
            type_::text
        ) into res;
        return res;
    end if;

    -- IS requires a keyword RHS (NULL, TRUE, FALSE, UNKNOWN), not a typed literal
    if op = 'is' then
        if val_2 not in ('null', 'true', 'false', 'unknown') then
            raise exception 'invalid value for is filter: must be null, true, false, or unknown';
        end if;
        execute format(
            'select %L::%s %s %s',
            val_1,
            type_::text,
            case when negate then 'IS NOT' else 'IS' end,
            upper(val_2)
        ) into res;
        return res;
    end if;

    op_symbol = case
        when op = 'eq'    then '='
        when op = 'neq'   then '!='
        when op = 'lt'    then '<'
        when op = 'lte'   then '<='
        when op = 'gt'    then '>'
        when op = 'gte'   then '>='
        when op = 'in'    then '= any'
        when op = 'like'   then 'LIKE'
        when op = 'ilike'  then 'ILIKE'
        when op = 'match'  then '~'
        when op = 'imatch' then '~*'
        else null
    end;

    if op_symbol is null then
        raise exception 'unsupported equality operator: %', op::text;
    end if;

    execute format(
        'select %L::%s %s (%L::%s)',
        val_1,
        type_::text,
        op_symbol,
        val_2,
        case when op = 'in' then type_::text || '[]' else type_::text end
    ) into res;

    return case when negate then not res else res end;
end;
$$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    select
        filters is null
        or array_length(filters, 1) is null
        or coalesce(
            count(col.name) = count(1)
            and sum(
                realtime.check_equality_op(
                    op:=f.op,
                    type_:=coalesce(col.type_oid::regtype, col.type_name::regtype),
                    val_1:=col.value #>> '{}',
                    val_2:=f.value,
                    negate:=coalesce(f.negate, false)
                )::int
            ) filter (where col.name is not null) = count(col.name),
            false
        )
    from
        unnest(filters) f
        left join unnest(columns) col
            on f.column_name = col.name;
$$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  SELECT
    realtime.wal2json_escape_identifier(nsp.nspname::text)
    || '.'
    || realtime.wal2json_escape_identifier(pc.relname::text)
  FROM pg_class pc
  JOIN pg_namespace nsp ON pc.relnamespace = nsp.oid
  WHERE pc.oid = entity
$$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: send_binary(bytea, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, binary_payload, event, topic, private, extension)
    VALUES (generated_id, payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    col_names text[] = coalesce(
            array_agg(a.attname order by a.attnum),
            '{}'::text[]
        )
        from
            pg_catalog.pg_attribute a
        where
            a.attrelid = new.entity
            and a.attnum > 0
            and not a.attisdropped
            and pg_catalog.has_column_privilege(
                (new.claims ->> 'role'),
                a.attrelid,
                a.attnum,
                'SELECT'
            );
    filter realtime.user_defined_filter;
    col_type regtype;
    in_val jsonb;
    selected_col text;
begin
    for filter in select * from unnest(new.filters) loop
        if not filter.column_name = any(col_names) then
            raise exception 'invalid column for filter %', filter.column_name;
        end if;

        col_type = (
            select atttypid::regtype
            from pg_catalog.pg_attribute
            where attrelid = new.entity
                  and attname = filter.column_name
        );
        if col_type is null then
            raise exception 'failed to lookup type for column %', filter.column_name;
        end if;

        if filter.op = 'in'::realtime.equality_op then
            in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
            if coalesce(jsonb_array_length(in_val), 0) > 100 then
                raise exception 'too many values for `in` filter. Maximum 100';
            end if;
        elsif filter.op = 'is'::realtime.equality_op then
            -- `is` requires a keyword RHS rather than a typed literal
            if filter.value not in ('null', 'true', 'false', 'unknown') then
                raise exception 'invalid value for is filter: must be null, true, false, or unknown';
            end if;
            -- IS NULL works for any type, but IS TRUE/FALSE/UNKNOWN require a boolean
            -- operand. Reject the non-null keywords on non-boolean columns here so they
            -- don't abort apply_rls at WAL time.
            if filter.value <> 'null' and col_type <> 'boolean'::regtype then
                raise exception 'is % filter requires a boolean column, got %', filter.value, col_type::text;
            end if;
        elsif filter.op in ('like'::realtime.equality_op, 'ilike'::realtime.equality_op) then
            -- like/ilike apply the text pattern operator (~~); reject column types that
            -- have no such operator instead of failing at WAL time
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = '~~' and oprleft = col_type
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
        elsif filter.op in ('match'::realtime.equality_op, 'imatch'::realtime.equality_op) then
            -- match/imatch apply the regex operators ~ / ~*; reject column types that have
            -- no such operator (e.g. integer) instead of failing at WAL time, mirroring the
            -- like/ilike guard above.
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = case when filter.op = 'imatch'::realtime.equality_op then '~*' else '~' end
                  and oprleft = col_type
                  and oprright = col_type
                  and oprresult = 'boolean'::regtype
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
            -- validate the regex eagerly so a bad pattern is rejected here, not inside
            -- apply_rls where it would abort the WAL stream for the entity
            begin
                perform '' ~ filter.value;
            exception when others then
                raise exception 'invalid regular expression for % filter: %', filter.op::text, sqlerrm;
            end;
        else
            -- eq/neq/lt/lte/gt/gte: value must be coercable to the type
            perform realtime.cast(filter.value, col_type);
        end if;
    end loop;

    if new.selected_columns is not null then
        for selected_col in select * from unnest(new.selected_columns) loop
            if not selected_col = any(col_names) then
                raise exception 'invalid column for select %', selected_col;
            end if;
        end loop;
    end if;

    -- Apply consistent order to filters so the unique constraint can't be tricked by a
    -- different filter order. negate is part of the sort key.
    new.filters = coalesce(
        array_agg(f order by f.column_name, f.op, f.value, f.negate),
        '{}'
    ) from unnest(new.filters) f;

    new.selected_columns = (
        select array_agg(c order by c)
        from unnest(new.selected_columns) c
    );

    return new;
end;
$$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: wal2json_escape_identifier(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.wal2json_escape_identifier(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  -- Prefix `\`, `,`, `.`, and any whitespace with `\`
  SELECT regexp_replace(name, '([\\,.[:space:]])', '\\\1', 'g')
$$;


--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    RETURN _parts[array_length(_parts, 1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_prefix_len INT;
    v_prefix_start INT;
    v_combined_levels INT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_prefix_len := length(coalesce(prefix, ''));
    v_prefix_start := coalesce(array_length(string_to_array(coalesce(prefix, ''), v_delimiter), 1), 1);
    v_combined_levels := coalesce(array_length(string_to_array(v_prefix, v_delimiter), 1), 1);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT array_to_string(path_tokens[$1:$2], '/') AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $3 || '%%'
                  AND bucket_id = $4
                  AND array_length(objects.path_tokens, 1) <> $2
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT array_to_string(path_tokens[$1:$2], '/') AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $3 || '%%'
               AND bucket_id = $4
               AND array_length(objects.path_tokens, 1) = $2
             ORDER BY %I %s)
            LIMIT $5 OFFSET $6
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING v_prefix_start, v_combined_levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := substring(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter) from v_prefix_len + 1);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := substring(v_current.name from v_prefix_len + 1);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
    v_sort_order text;
    v_sort_column text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    -- Defense-in-depth: this function is independently reachable and must
    -- not trust p_sort_order/p_sort_column to already be validated by a
    -- caller. Normalize to the same strict allow-list storage.search_v2
    -- uses before interpolating anything into dynamic SQL below.
    v_sort_order := lower(coalesce(p_sort_order, 'asc'));
    IF v_sort_order NOT IN ('asc', 'desc') THEN
        v_sort_order := 'asc';
    END IF;

    v_sort_column := lower(coalesce(p_sort_column, 'updated_at'));
    IF v_sort_column NOT IN ('updated_at', 'created_at') THEN
        v_sort_column := 'updated_at';
    END IF;

    IF v_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        v_sort_column,
        v_cursor_op,
        v_sort_column,
        v_sort_order,
        v_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_claims_allowlist text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: abnahmeprotokoll; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.abnahmeprotokoll (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    datum date,
    punkte jsonb DEFAULT '[]'::jsonb,
    maengel jsonb DEFAULT '[]'::jsonb,
    abgenommen_am timestamp with time zone,
    kunde_unterschrift boolean DEFAULT false,
    notizen text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: akten_notizen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.akten_notizen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    bezug_typ text NOT NULL,
    kunde_objekt_id uuid,
    lead_id uuid,
    text text NOT NULL,
    wiedervorlage_am date,
    erledigt_am timestamp with time zone,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT akten_notizen_bezug_check CHECK ((((bezug_typ = 'objekt'::text) AND (kunde_objekt_id IS NOT NULL) AND (lead_id IS NULL)) OR ((bezug_typ = 'vorgang'::text) AND (lead_id IS NOT NULL))))
);


--
-- Name: angebot_handwerker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.angebot_handwerker (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    angebot_id uuid NOT NULL,
    handwerker_id uuid NOT NULL,
    gewerk_id uuid,
    status text DEFAULT 'ausstehend'::text NOT NULL,
    gesendet_at timestamp with time zone,
    accepted_at timestamp with time zone,
    notizen text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    antwort_at timestamp with time zone,
    antwort_notiz text,
    hw_preis_netto numeric,
    hw_preis_brutto numeric,
    hw_angebot_pdf_url text,
    hw_eingereicht_at timestamp with time zone,
    hw_status text,
    hw_notiz text,
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    ablehnung_grund text,
    aufgabe_notiz text,
    hw_rechnung_pdf_url text,
    hw_rechnung_eingereicht_at timestamp with time zone,
    hw_angebot_anhang_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    hw_crm_notiz text,
    hw_crm_antwort_at timestamp with time zone,
    hw_konditionen jsonb,
    bestaetigt_at timestamp with time zone,
    hw_rechnung_status text,
    hw_rechnung_bezahlt_at timestamp with time zone,
    hw_rechnung_betrag_brutto numeric(12,2),
    ohne_lv boolean DEFAULT false NOT NULL,
    hw_rechnung_reverse_charge_13b boolean DEFAULT false NOT NULL,
    CONSTRAINT angebot_handwerker_hw_rechnung_status_check CHECK (((hw_rechnung_status IS NULL) OR (hw_rechnung_status = ANY (ARRAY['eingereicht'::text, 'bezahlt'::text, 'abgelehnt'::text]))))
);


--
-- Name: COLUMN angebot_handwerker.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.status IS 'Kanonisch: ausstehend | angefragt | akzeptiert | abgelehnt | ersetzt | zugewiesen. Legacy angenommen/uebernommen → akzeptiert.';


--
-- Name: COLUMN angebot_handwerker.hw_preis_netto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_preis_netto IS 'Vom Handwerker eingereicht (netto)';


--
-- Name: COLUMN angebot_handwerker.hw_preis_brutto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_preis_brutto IS 'Vom Handwerker eingereicht (brutto)';


--
-- Name: COLUMN angebot_handwerker.hw_angebot_pdf_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_angebot_pdf_url IS 'PDF-URL (Storage handwerker-uploads)';


--
-- Name: COLUMN angebot_handwerker.hw_eingereicht_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_eingereicht_at IS 'Zeitpunkt Einreichung durch Handwerker';


--
-- Name: COLUMN angebot_handwerker.hw_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_status IS 'offen | eingereicht | bestaetigt | uebernommen | abgelehnt | rueckfrage — bestaetigt = CRM-Einigung, HW-Bestätigung ausstehend';


--
-- Name: COLUMN angebot_handwerker.hw_notiz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_notiz IS 'Optionale Notiz des Handwerkers';


--
-- Name: COLUMN angebot_handwerker.token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.token IS 'Geheimer Pfad-Segment für /handwerker/anfrage/[token]';


--
-- Name: COLUMN angebot_handwerker.ablehnung_grund; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.ablehnung_grund IS 'Auswahl bei öffentlicher Ablehnung durch Handwerker';


--
-- Name: COLUMN angebot_handwerker.hw_rechnung_pdf_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_rechnung_pdf_url IS 'Rechnungs-PDF (Storage handwerker-uploads)';


--
-- Name: COLUMN angebot_handwerker.hw_rechnung_eingereicht_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_rechnung_eingereicht_at IS 'Zeitpunkt Rechnungs-Upload durch Handwerker';


--
-- Name: COLUMN angebot_handwerker.hw_angebot_anhang_urls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_angebot_anhang_urls IS 'Storage-Pfade aller eingereichten Angebots-PDFs (max. 3). hw_angebot_pdf_url = erstes Element.';


--
-- Name: COLUMN angebot_handwerker.hw_konditionen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_konditionen IS 'HW-Konditionen: { art: bestaetigt|gegenvorschlag, positionen: [{ position_id, leistung, ek_netto, hw_netto, mwst_satz, geaendert }], eingereicht_at }';


--
-- Name: COLUMN angebot_handwerker.bestaetigt_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.bestaetigt_at IS 'Zeitpunkt der Partner-Bestätigung nach CRM-Freigabe (neuer Koordinations-Flow).';


--
-- Name: COLUMN angebot_handwerker.hw_rechnung_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_rechnung_status IS 'Eingangsrechnung: eingereicht | bezahlt | abgelehnt (NULL = eingereicht wenn PDF vorhanden)';


--
-- Name: COLUMN angebot_handwerker.hw_rechnung_bezahlt_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_rechnung_bezahlt_at IS 'Zeitpunkt CRM „als bezahlt markiert“';


--
-- Name: COLUMN angebot_handwerker.hw_rechnung_betrag_brutto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_rechnung_betrag_brutto IS 'Optionaler Rechnungsbetrag Brutto; sonst Fallback hw_preis_brutto';


--
-- Name: COLUMN angebot_handwerker.ohne_lv; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.ohne_lv IS 'Partner erstellt oder lädt eigenes Angebot — kein LV von Bärenwald.';


--
-- Name: COLUMN angebot_handwerker.hw_rechnung_reverse_charge_13b; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebot_handwerker.hw_rechnung_reverse_charge_13b IS 'Wenn true, wird bei der automatisch erzeugten Partner-Eingangsrechnung reverse_charge_13b gesetzt.';


--
-- Name: angebot_ki_beispiele; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.angebot_ki_beispiele (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    scope text NOT NULL,
    prompt text NOT NULL,
    gewerk_slug text,
    kontext jsonb DEFAULT '{}'::jsonb NOT NULL,
    ergebnis jsonb DEFAULT '{}'::jsonb NOT NULL,
    akzeptiert boolean DEFAULT true NOT NULL,
    user_id uuid
);


--
-- Name: TABLE angebot_ki_beispiele; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.angebot_ki_beispiele IS 'Akzeptierte KI-Ausgaben im Angebots-Wizard — Few-Shot-Lernen für spätere Generierungen';


--
-- Name: angebot_vorlagen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.angebot_vorlagen (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    beschreibung text,
    positionen jsonb DEFAULT '[]'::jsonb NOT NULL,
    gesamt_min numeric(10,2),
    gesamt_max numeric(10,2),
    gesamt_fix numeric(10,2),
    aktiv boolean DEFAULT true,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: angebote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.angebote (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    lead_id uuid,
    kunde_id uuid,
    status public.angebot_status DEFAULT 'entwurf'::public.angebot_status NOT NULL,
    positionen jsonb DEFAULT '[]'::jsonb NOT NULL,
    gesamt_min numeric(10,2),
    gesamt_max numeric(10,2),
    pdf_url text,
    pdf_generiert_at timestamp with time zone,
    gesendet_handwerker_at timestamp with time zone,
    gesendet_kunde_at timestamp with time zone,
    akzeptiert_at timestamp with time zone,
    notizen text,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    preis_typ text DEFAULT 'range'::text,
    vorlage_id uuid,
    gesamt_fix numeric(10,2),
    lohn_netto numeric(10,2),
    material_netto numeric(10,2),
    angebotsnr text,
    leistungsumfang text,
    einleitung text,
    zahlungsbedingungen text DEFAULT 'sofort_netto'::text,
    hinweise text,
    gueltig_bis date,
    gesendet_am timestamp with time zone,
    dokument_typ text DEFAULT 'einfach'::text,
    projektbeschreibung text,
    fotos_urls jsonb DEFAULT '[]'::jsonb,
    varianten jsonb,
    wichtige_hinweise text,
    nachgefasst_am timestamp with time zone,
    status_einfach text DEFAULT 'entwurf'::text,
    verlaengert_am timestamp with time zone,
    kunde_objekt_id uuid,
    ablehnung_grund text,
    ablehnung_konkurrenz_preis numeric(10,2),
    ablehnung_notiz text,
    visualisierung_ids uuid[],
    zahlungsplan jsonb,
    herkunft text,
    ist_wiederkehrend boolean DEFAULT false NOT NULL,
    wiederkehr_turnus text,
    wiedervorlage_datum date,
    wiedervorlage_notiz text,
    ersetzt_durch uuid,
    korrektur_von uuid,
    korrektur_art text,
    org_freigabe_erforderlich boolean DEFAULT false NOT NULL,
    org_freigabe_berechnet_at timestamp with time zone,
    ansprechpartner_id uuid,
    ist_partner_einholung boolean DEFAULT false NOT NULL,
    CONSTRAINT angebote_dokument_typ_check CHECK ((dokument_typ = ANY (ARRAY['einfach'::text, 'projekt'::text]))),
    CONSTRAINT angebote_herkunft_check CHECK (((herkunft IS NULL) OR (herkunft = ANY (ARRAY['crm'::text, 'handwerker'::text, 'kunde'::text, 'system'::text])))),
    CONSTRAINT angebote_korrektur_art_check CHECK (((korrektur_art IS NULL) OR (korrektur_art = 'ueberarbeitet'::text)))
);


--
-- Name: COLUMN angebote.dokument_typ; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.dokument_typ IS 'einfach = Standardlayout; projekt = erweitertes Layout mit Beschreibung/Fotos/optional Varianten';


--
-- Name: COLUMN angebote.fotos_urls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.fotos_urls IS 'Öffentliche Bild-URLs (JSON-Array) für Projektdokumentation im PDF';


--
-- Name: COLUMN angebote.varianten; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.varianten IS 'Optional: { a: { name, positionen? }, b: { name, positionen? } }';


--
-- Name: COLUMN angebote.status_einfach; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.status_einfach IS 'entwurf | gesendet | angenommen | abgelehnt | abgelaufen | ersetzt';


--
-- Name: COLUMN angebote.verlaengert_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.verlaengert_am IS 'Zuletzt Gültigkeit verlängert — Erinnerungs-Mail 7 Tage danach (wenn nachgefasst_am noch leer).';


--
-- Name: COLUMN angebote.kunde_objekt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.kunde_objekt_id IS 'Ausführungsort für dieses Angebot (PDF: Durchführung in)';


--
-- Name: COLUMN angebote.ablehnung_grund; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.ablehnung_grund IS 'Kunden-Ablehnung (CRM-Statistik)';


--
-- Name: COLUMN angebote.zahlungsplan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.zahlungsplan IS 'Unverbindlicher Vorschlag (Spec Q2). Entscheidung im RE-Flow';


--
-- Name: COLUMN angebote.herkunft; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.herkunft IS 'D11: Quelle des Angebots — handwerker = HW-Kalkulation (Empfohlenes Angebot in D3)';


--
-- Name: COLUMN angebote.ist_wiederkehrend; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.ist_wiederkehrend IS 'Bestand: wiederkehrendes Angebot';


--
-- Name: COLUMN angebote.wiederkehr_turnus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.wiederkehr_turnus IS 'Turnus des wiederkehrenden Angebots';


--
-- Name: COLUMN angebote.wiedervorlage_datum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.wiedervorlage_datum IS 'Spec Wiedervorlage Datum (Header)';


--
-- Name: COLUMN angebote.wiedervorlage_notiz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.wiedervorlage_notiz IS 'Spec Wiedervorlage Notiz';


--
-- Name: COLUMN angebote.ersetzt_durch; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.ersetzt_durch IS 'Spec ersetztDurch';


--
-- Name: COLUMN angebote.korrektur_von; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.korrektur_von IS 'Spec korrekturVon';


--
-- Name: COLUMN angebote.korrektur_art; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.korrektur_art IS 'Spec korrekturArt: ueberarbeitet';


--
-- Name: COLUMN angebote.org_freigabe_erforderlich; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.org_freigabe_erforderlich IS 'Snapshot: Org-Freigabe nötig (einmal berechnet in CRM). Portal liest nur.';


--
-- Name: COLUMN angebote.org_freigabe_berechnet_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.org_freigabe_berechnet_at IS 'Zeitpunkt der letzten Freigabe-Berechnung.';


--
-- Name: COLUMN angebote.ansprechpartner_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.ansprechpartner_id IS 'Optionaler Ansprechpartner (Empfänger) für Angebot-Versand';


--
-- Name: COLUMN angebote.ist_partner_einholung; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.angebote.ist_partner_einholung IS 'Intern: Partner-Angebote einholen ohne Kunden-LV. Nicht in Kunden-Angebotslisten.';


--
-- Name: audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    aktion text NOT NULL,
    actor_id uuid,
    actor_rolle text,
    kunde_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auftraege; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftraege (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    angebot_id uuid,
    lead_id uuid,
    kunde_id uuid,
    status public.auftrag_status DEFAULT 'offen'::public.auftrag_status NOT NULL,
    titel text,
    start_datum date,
    end_datum date,
    abnahme_datum date,
    abnahme_protokoll_url text,
    abnahme_protokoll_gesendet_at timestamp with time zone,
    notizen text,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kunden_token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
    betreuer_id uuid,
    fortschritt integer DEFAULT 0,
    kunden_seite_aufrufe integer DEFAULT 0,
    kunden_seite_letzter_aufruf timestamp with time zone,
    naechster_schritt text,
    zahlungsplan jsonb,
    ist_bauprojekt boolean DEFAULT false NOT NULL,
    bauleiter_name text,
    bauleiter_telefon text,
    bauleiter_email text,
    bau_mannschaft jsonb DEFAULT '[]'::jsonb NOT NULL,
    bau_nachunternehmer_name text,
    bau_nachunternehmer_firma text,
    handwerker_bestaetigt_at timestamp with time zone,
    kostentraeger text,
    versicherungs_nr text,
    versicherungsakte_pdf_url text,
    abschlussdokumentation_url text,
    abschlussdokumentation_gesendet_at timestamp with time zone,
    hw_abschluss_signiert_am timestamp with time zone,
    ist_wiederkehrend boolean DEFAULT false NOT NULL,
    wiederkehr_turnus text,
    bautagebuch_hidden_position_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    wiedervorlage_datum date,
    wiedervorlage_notiz text,
    letzte_aktivitaet timestamp with time zone,
    ist_notfall boolean DEFAULT false NOT NULL,
    notfall_verguetung text DEFAULT 'aufwand'::text,
    CONSTRAINT auftraege_kostentraeger_check CHECK (((kostentraeger IS NULL) OR (kostentraeger = ANY (ARRAY['gemeinschaft'::text, 'sondereigentum'::text, 'mieter'::text, 'versicherung'::text, 'unklar'::text])))),
    CONSTRAINT auftraege_notfall_verguetung_check CHECK (((notfall_verguetung IS NULL) OR (notfall_verguetung = 'aufwand'::text)))
);


--
-- Name: COLUMN auftraege.betreuer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.betreuer_id IS 'CRM-Ansprechpartner (user_profiles.id = auth.users.id). Sichtbar im Kundenportal unter Auftrag → Ansprechpartner.';


--
-- Name: COLUMN auftraege.zahlungsplan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.zahlungsplan IS 'DEPRECATED (Spec Q2): nicht mehr lesen. Vorschlag auf angebote.zahlungsplan';


--
-- Name: COLUMN auftraege.ist_bauprojekt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.ist_bauprojekt IS 'CRM-Flag: Bauauftrag mit erweiterten Pflichten (Bautagebuch, Nachweise).';


--
-- Name: COLUMN auftraege.bauleiter_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.bauleiter_name IS 'Bauleitung (Eigenregie / Bauauftrag)';


--
-- Name: COLUMN auftraege.bau_mannschaft; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.bau_mannschaft IS 'Stamm-Mannschaft auf der Baustelle (Namen)';


--
-- Name: COLUMN auftraege.handwerker_bestaetigt_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.handwerker_bestaetigt_at IS 'Zeitpunkt der verbindlichen HW-Annahme aller Leistungen am Auftrag';


--
-- Name: COLUMN auftraege.hw_abschluss_signiert_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.hw_abschluss_signiert_am IS 'D11: HW hat Abschlussdokumentation inkl. Signatur eingereicht';


--
-- Name: COLUMN auftraege.ist_wiederkehrend; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.ist_wiederkehrend IS 'Bestand: laufender Wartungs-/Service-Auftrag';


--
-- Name: COLUMN auftraege.wiederkehr_turnus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.wiederkehr_turnus IS 'Turnus des Bestands-Auftrags';


--
-- Name: COLUMN auftraege.bautagebuch_hidden_position_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.bautagebuch_hidden_position_ids IS 'Positions-IDs, die im Bautagebuch ausgeblendet sind (Leistung bleibt im Auftrag).';


--
-- Name: COLUMN auftraege.wiedervorlage_datum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.wiedervorlage_datum IS 'Spec Wiedervorlage Datum (Header)';


--
-- Name: COLUMN auftraege.wiedervorlage_notiz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.wiedervorlage_notiz IS 'Spec Wiedervorlage Notiz';


--
-- Name: COLUMN auftraege.letzte_aktivitaet; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.letzte_aktivitaet IS 'Spec letzteAktivitaet - persistiert beim Erledigen einer Position';


--
-- Name: COLUMN auftraege.ist_notfall; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.ist_notfall IS 'Notfall-Direktbeauftragung ohne Deckel';


--
-- Name: COLUMN auftraege.notfall_verguetung; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftraege.notfall_verguetung IS 'Nur aufwand (Spec Q3). Spalte bleibt fuer spaetere Erweiterung';


--
-- Name: auftrag_abnahmeprotokolle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_abnahmeprotokolle (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auftrag_id uuid NOT NULL,
    abnahme_datum date NOT NULL,
    notizen text,
    punkte jsonb DEFAULT '[]'::jsonb NOT NULL,
    maengel jsonb DEFAULT '[]'::jsonb NOT NULL,
    pdf_url text,
    an_kunde_gesendet_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    protokoll_typ text DEFAULT 'erstabnahme'::text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    handwerker_id uuid,
    ebene text DEFAULT 'gesamt'::text NOT NULL,
    freigabe_status text DEFAULT 'entwurf'::text NOT NULL,
    freigegeben_at timestamp with time zone,
    freigegeben_von uuid,
    abgelehnt_at timestamp with time zone,
    abgelehnt_von uuid,
    ablehnung_notiz text,
    CONSTRAINT auftrag_abnahmeprotokolle_ebene_check CHECK ((ebene = ANY (ARRAY['handwerker'::text, 'gesamt'::text]))),
    CONSTRAINT auftrag_abnahmeprotokolle_freigabe_status_check CHECK ((freigabe_status = ANY (ARRAY['entwurf'::text, 'zur_freigabe'::text, 'freigegeben'::text, 'abgelehnt'::text])))
);


--
-- Name: TABLE auftrag_abnahmeprotokolle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.auftrag_abnahmeprotokolle IS 'Checklisten-Abnahmeprotokoll inkl. Mängelliste und PDF';


--
-- Name: COLUMN auftrag_abnahmeprotokolle.an_kunde_gesendet_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_abnahmeprotokolle.an_kunde_gesendet_at IS 'Nur nach Freigabe / manuellem finalem Versand setzen — nicht bei Portal-Eingang';


--
-- Name: COLUMN auftrag_abnahmeprotokolle.protokoll_typ; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_abnahmeprotokolle.protokoll_typ IS 'erstabnahme | nachabnahme | schlussabnahme';


--
-- Name: COLUMN auftrag_abnahmeprotokolle.meta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_abnahmeprotokolle.meta IS 'Übergabe-Uhrzeit/Ort, Personen, Bauvorhaben-Kurzfelder, Ergebnis, Fotos, Rechtshinweise';


--
-- Name: COLUMN auftrag_abnahmeprotokolle.handwerker_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_abnahmeprotokolle.handwerker_id IS 'Bei ebene=handwerker: Partner der Teilabnahme; bei gesamt null';


--
-- Name: COLUMN auftrag_abnahmeprotokolle.ebene; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_abnahmeprotokolle.ebene IS 'handwerker = Teilabnahme eines Partners; gesamt = Gesamtabnahme-Dokument';


--
-- Name: COLUMN auftrag_abnahmeprotokolle.freigabe_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_abnahmeprotokolle.freigabe_status IS 'CRM-Freigabe: entwurf | zur_freigabe | freigegeben | abgelehnt';


--
-- Name: auftrag_baustellen_dokumente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_baustellen_dokumente (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    typ text NOT NULL,
    titel text NOT NULL,
    datei_url text NOT NULL,
    kalenderwoche integer,
    jahr integer,
    wochen_nummer integer,
    quelle text DEFAULT 'upload'::text NOT NULL,
    referenz_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auftrag_baustellen_dokumente_quelle_check CHECK ((quelle = ANY (ARRAY['upload'::text, 'generiert'::text]))),
    CONSTRAINT auftrag_baustellen_dokumente_typ_check CHECK ((typ = ANY (ARRAY['tagesbericht'::text, 'wochenbericht'::text, 'regiebericht'::text, 'sonstiges'::text])))
);


--
-- Name: auftrag_bautagebuch_eintraege; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_bautagebuch_eintraege (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    timeline_id uuid,
    titel text NOT NULL,
    beschreibung text,
    datum date DEFAULT CURRENT_DATE NOT NULL,
    foto_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    fuer_kunde_freigegeben boolean DEFAULT false NOT NULL,
    freigegeben_at timestamp with time zone,
    an_kunde_gesendet_at timestamp with time zone,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    handwerker_id uuid,
    gewerk_id uuid,
    gewerk_phase_key text,
    eintrag_typ text DEFAULT 'tagebuch'::text NOT NULL,
    CONSTRAINT auftrag_bautagebuch_eintraege_typ_check CHECK ((eintrag_typ = ANY (ARRAY['tagebuch'::text, 'befund'::text])))
);


--
-- Name: TABLE auftrag_bautagebuch_eintraege; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.auftrag_bautagebuch_eintraege IS 'Bautagebuch / Kunden-Updates zum Auftrag';


--
-- Name: COLUMN auftrag_bautagebuch_eintraege.handwerker_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_bautagebuch_eintraege.handwerker_id IS 'Handwerker, der den Eintrag erstellt hat (Partner-Portal)';


--
-- Name: COLUMN auftrag_bautagebuch_eintraege.eintrag_typ; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_bautagebuch_eintraege.eintrag_typ IS 'tagebuch = Baustellen-Tagebuch; befund = Schadenbefund/Leckortung (HV read-only)';


--
-- Name: auftrag_bautagesberichte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_bautagesberichte (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    tag_nummer integer DEFAULT 1 NOT NULL,
    datum date DEFAULT CURRENT_DATE NOT NULL,
    arbeitszeit_von text,
    arbeitszeit_bis text,
    wetter text,
    auftraggeber_name text,
    auftraggeber_adresse text,
    nachunternehmer_name text,
    nachunternehmer_firma text,
    leistungen jsonb DEFAULT '[]'::jsonb NOT NULL,
    behinderungen text,
    qualitaetssicherung text,
    risiken jsonb DEFAULT '[]'::jsonb NOT NULL,
    zusammenfassung text,
    personal_namen jsonb DEFAULT '[]'::jsonb NOT NULL,
    fotos jsonb DEFAULT '[]'::jsonb NOT NULL,
    handwerker_id uuid,
    pdf_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE auftrag_bautagesberichte; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.auftrag_bautagesberichte IS 'Ausführlicher Bautagesbericht (Bauprojekte) inkl. PDF-Export';


--
-- Name: auftrag_fachdoku_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_fachdoku_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auftrag_id uuid NOT NULL,
    slot_code text NOT NULL,
    label text NOT NULL,
    status text DEFAULT 'offen'::text NOT NULL,
    datei_url text,
    datei_name text,
    uploaded_by_role text,
    uploaded_by_handwerker_id uuid,
    uploaded_by_user_id uuid,
    erledigt_am timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auftrag_fachdoku_slots_status_check CHECK ((status = ANY (ARRAY['offen'::text, 'erledigt'::text]))),
    CONSTRAINT auftrag_fachdoku_slots_uploaded_by_role_check CHECK (((uploaded_by_role IS NULL) OR (uploaded_by_role = ANY (ARRAY['hw'::text, 'crm'::text]))))
);


--
-- Name: TABLE auftrag_fachdoku_slots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.auftrag_fachdoku_slots IS 'Fachnachweise (Mess-/Prüfprotokolle) je Auftrag — soft Hinweis, kein Abschluss-Gate';


--
-- Name: auftrag_handwerker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_handwerker (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    handwerker_id uuid NOT NULL,
    gewerk_id uuid,
    status text DEFAULT 'zugewiesen'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    vereinbarter_preis numeric(10,2),
    absprachen text,
    notizen text,
    projektvertrag_bestaetigt_am timestamp with time zone,
    abnahme_signiert_am timestamp with time zone,
    abnahme_protokoll_id uuid
);


--
-- Name: COLUMN auftrag_handwerker.vereinbarter_preis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_handwerker.vereinbarter_preis IS 'Vereinbarter Preis mit Handwerker (intern)';


--
-- Name: COLUMN auftrag_handwerker.absprachen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_handwerker.absprachen IS 'Absprachen mit Handwerker';


--
-- Name: COLUMN auftrag_handwerker.notizen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_handwerker.notizen IS 'Interne Notizen zur Handwerker-Zuweisung';


--
-- Name: COLUMN auftrag_handwerker.projektvertrag_bestaetigt_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_handwerker.projektvertrag_bestaetigt_am IS 'Zeitpunkt verbindlicher Annahme des Projekt-Nachunternehmervertrags durch den Handwerker';


--
-- Name: COLUMN auftrag_handwerker.abnahme_signiert_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_handwerker.abnahme_signiert_am IS 'Zeitpunkt der Partner-Teilabnahme / Signatur im Portal';


--
-- Name: COLUMN auftrag_handwerker.abnahme_protokoll_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_handwerker.abnahme_protokoll_id IS 'Aktuelles Teilabnahme-Protokoll dieses Partners';


--
-- Name: auftrag_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_milestones (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    titel text NOT NULL,
    beschreibung text,
    datum date,
    erledigt boolean DEFAULT false,
    erledigt_at timestamp with time zone,
    fuer_kunden_sichtbar boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    ist_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: auftrag_position_notizen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_position_notizen (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    position_id uuid NOT NULL,
    datum date DEFAULT CURRENT_DATE NOT NULL,
    text text NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: auftrag_positionen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_positionen (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    gewerk_slug text,
    gewerk_name text NOT NULL,
    oberkategorie text,
    unterkategorie text,
    leistung_name text NOT NULL,
    beschreibung text,
    einheit text DEFAULT 'pauschal'::text,
    menge numeric(10,2) DEFAULT 1,
    preis_fix numeric(10,2),
    lohn_fix numeric(10,2),
    material_fix numeric(10,2),
    handwerker_id uuid,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    handwerker_status text,
    handwerker_angefragt_at timestamp with time zone,
    absprachen text,
    notizen_intern text,
    projekt_phase text,
    gewerk_block_key text,
    start_datum date,
    end_datum date,
    preis_partner numeric(10,2),
    leistung_status text DEFAULT 'offen'::text,
    fuer_kunde_sichtbar boolean DEFAULT false,
    einkauf_preis numeric(10,2),
    aenderung_typ text,
    preis_alt numeric,
    typ text DEFAULT 'lv'::text,
    verguetung text DEFAULT 'festpreis'::text,
    geschaetzt_std numeric(10,2),
    stundensatz numeric(10,2),
    gestartet_am timestamp with time zone,
    erledigt_am timestamp with time zone,
    anerkennung_status text DEFAULT 'nicht_noetig'::text,
    CONSTRAINT auftrag_positionen_aenderung_typ_check CHECK (((aenderung_typ IS NULL) OR (aenderung_typ = ANY (ARRAY['neu'::text, 'geaendert'::text, 'entfernt'::text])))),
    CONSTRAINT auftrag_positionen_anerkennung_check CHECK (((anerkennung_status IS NULL) OR (anerkennung_status = ANY (ARRAY['nicht_noetig'::text, 'in_pruefung'::text, 'anerkannt'::text, 'abgelehnt'::text])))),
    CONSTRAINT auftrag_positionen_leistung_status_check CHECK (((leistung_status IS NULL) OR (leistung_status = ANY (ARRAY['offen'::text, 'in_arbeit'::text, 'erledigt'::text])))),
    CONSTRAINT auftrag_positionen_typ_check CHECK (((typ IS NULL) OR (typ = ANY (ARRAY['lv'::text, 'regie'::text, 'material'::text])))),
    CONSTRAINT auftrag_positionen_verguetung_check CHECK (((verguetung IS NULL) OR (verguetung = ANY (ARRAY['festpreis'::text, 'aufwand'::text]))))
);


--
-- Name: COLUMN auftrag_positionen.handwerker_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_positionen.handwerker_status IS 'ausstehend | angefragt | warten | akzeptiert | abgelehnt | zugewiesen';


--
-- Name: COLUMN auftrag_positionen.projekt_phase; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_positionen.projekt_phase IS 'Planung | Vorbereitung | Ausführung | Abnahme | Rechnung (leer = ohne Phase)';


--
-- Name: COLUMN auftrag_positionen.gewerk_block_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_positionen.gewerk_block_key IS 'Gruppierung wie im Angebot (mehrere Gewerk-Blöcke)';


--
-- Name: COLUMN auftrag_positionen.preis_partner; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_positionen.preis_partner IS 'Vereinbarter Partner-Preis (EK) pro Leistung';


--
-- Name: COLUMN auftrag_positionen.leistung_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_positionen.leistung_status IS 'Lebenszyklus laut Spec status: offen | in_arbeit | erledigt';


--
-- Name: COLUMN auftrag_positionen.aenderung_typ; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_positionen.aenderung_typ IS 'CRM setzt bei Zuweisung/Änderung: neu | geaendert | entfernt. Portal cleart nach HW-Annahme.';


--
-- Name: COLUMN auftrag_positionen.preis_alt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_positionen.preis_alt IS 'Alter preis_partner vor Preisänderung (Netto-Zeilenpreis).';


--
-- Name: COLUMN auftrag_positionen.typ; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_positionen.typ IS 'lv | regie | material';


--
-- Name: COLUMN auftrag_positionen.verguetung; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_positionen.verguetung IS 'festpreis | aufwand';


--
-- Name: COLUMN auftrag_positionen.anerkennung_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_positionen.anerkennung_status IS 'Weitere Arbeit / Regie: nicht_noetig | in_pruefung | anerkannt | abgelehnt';


--
-- Name: auftrag_regiearbeiten; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_regiearbeiten (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    datum date DEFAULT CURRENT_DATE NOT NULL,
    bezeichnung text NOT NULL,
    beschreibung text,
    personen_anzahl integer DEFAULT 1 NOT NULL,
    stunden numeric(8,2) DEFAULT 0 NOT NULL,
    material text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auftrag_rueckfragen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_rueckfragen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auftrag_id uuid NOT NULL,
    handwerker_id uuid NOT NULL,
    text text NOT NULL,
    foto_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'offen'::text NOT NULL,
    antwort_text text,
    antwort_am timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auftrag_terminslots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_terminslots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auftrag_id uuid NOT NULL,
    lead_id uuid,
    slot_beginn timestamp with time zone NOT NULL,
    slot_ende timestamp with time zone,
    status text DEFAULT 'vorgeschlagen'::text NOT NULL,
    bestaetigt_am timestamp with time zone,
    abgesagt_am timestamp with time zone,
    absage_grund text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auftrag_terminslots_status_check CHECK ((status = ANY (ARRAY['vorgeschlagen'::text, 'bestaetigt'::text, 'abgesagt'::text, 'abgelaufen'::text])))
);


--
-- Name: auftrag_timeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_timeline (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    typ text NOT NULL,
    titel text NOT NULL,
    beschreibung text,
    foto_urls text[],
    erstellt_von uuid,
    handwerker_id uuid,
    sichtbar_fuer_kunde boolean DEFAULT false NOT NULL,
    fuer_kunde_freigegeben boolean DEFAULT false NOT NULL,
    freigegeben_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email_log_id uuid
);


--
-- Name: TABLE auftrag_timeline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.auftrag_timeline IS 'Chronologische Ereignisse zum Auftrag (CRM + ggf. kundensichtbar)';


--
-- Name: COLUMN auftrag_timeline.email_log_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auftrag_timeline.email_log_id IS 'Verweis auf gespeicherte E-Mail (Vorschau in Verlauf/Aktivität)';


--
-- Name: auftrag_wochenberichte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_wochenberichte (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    wochen_nummer integer DEFAULT 1 NOT NULL,
    kalenderwoche integer NOT NULL,
    jahr integer NOT NULL,
    von_datum date NOT NULL,
    bis_datum date NOT NULL,
    fazit text,
    ausblick text,
    pdf_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auftrag_zahlungsplaene; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_zahlungsplaene (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auftrag_id uuid NOT NULL,
    titel text,
    gesamt_netto numeric(12,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auftrag_zahlungsplan_positionen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auftrag_zahlungsplan_positionen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zahlungsplan_id uuid NOT NULL,
    bezeichnung text NOT NULL,
    prozent numeric(5,2),
    betrag_netto numeric(12,2),
    faellig_am date,
    rechnung_id uuid,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: baustopps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.baustopps (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    typ text DEFAULT 'witterung'::text NOT NULL,
    grund text NOT NULL,
    beginn_datum date NOT NULL,
    ende_datum date,
    verzoegerung_tage integer,
    altes_enddatum date,
    neues_enddatum date,
    kunde_informiert boolean DEFAULT false,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bautagebuch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bautagebuch (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    datum date DEFAULT CURRENT_DATE NOT NULL,
    titel text NOT NULL,
    notizen text,
    fotos_urls text[] DEFAULT '{}'::text[],
    fuer_kunde_sichtbar boolean DEFAULT false,
    gesendet_am timestamp with time zone,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: buergschaften; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buergschaften (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    einbehalt_id uuid NOT NULL,
    handwerker_id uuid NOT NULL,
    urkunden_nummer text NOT NULL,
    bank text,
    betrag numeric(10,2) NOT NULL,
    gueltig_bis date NOT NULL,
    dokument_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: compliance_dokument_typen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_dokument_typen (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    slug text NOT NULL,
    bezeichnung text NOT NULL,
    beschreibung text,
    pflicht_fuer_fachbetriebe boolean DEFAULT true,
    erneuerung_monate integer,
    sort_order integer DEFAULT 0,
    scope text DEFAULT 'standard'::text NOT NULL,
    gewerk_slugs text[],
    pflicht_bauprojekt boolean DEFAULT false NOT NULL,
    vertrag_referenz text,
    kategorie text,
    aktiv boolean DEFAULT true NOT NULL,
    mehrfach_erlaubt boolean DEFAULT false NOT NULL,
    compliance_ebene text DEFAULT 'allgemein'::text NOT NULL,
    nur_bei_bauleistung boolean DEFAULT false NOT NULL,
    CONSTRAINT compliance_dokument_typen_ebene_check CHECK ((compliance_ebene = ANY (ARRAY['allgemein'::text, 'meister'::text, 'leistung'::text]))),
    CONSTRAINT compliance_dokument_typen_scope_check CHECK ((scope = ANY (ARRAY['standard'::text, 'stamm'::text, 'bauprojekt'::text, 'gewerk'::text])))
);


--
-- Name: COLUMN compliance_dokument_typen.scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compliance_dokument_typen.scope IS 'standard = alle Gewerke; bauprojekt = je Auftrag/Vorhaben; gewerk = nur passende Gewerke (gewerk_slugs)';


--
-- Name: COLUMN compliance_dokument_typen.gewerk_slugs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compliance_dokument_typen.gewerk_slugs IS 'Bei scope=gewerk: Slugs aus gewerke.slug; leer = für alle Gewerke sichtbar';


--
-- Name: COLUMN compliance_dokument_typen.pflicht_bauprojekt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compliance_dokument_typen.pflicht_bauprojekt IS 'Pflicht bei aktivem Bauprojekt (Status-Berechnung folgt projektbezogen)';


--
-- Name: COLUMN compliance_dokument_typen.vertrag_referenz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compliance_dokument_typen.vertrag_referenz IS 'Optional: Verweis auf Vertragspassus (z. B. §6, Anlage 1)';


--
-- Name: COLUMN compliance_dokument_typen.kategorie; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compliance_dokument_typen.kategorie IS 'Optional: Überschrift für Gruppen in der Compliance-Liste';


--
-- Name: COLUMN compliance_dokument_typen.mehrfach_erlaubt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compliance_dokument_typen.mehrfach_erlaubt IS 'Mehrere Uploads pro Handwerker/Auftrag erlaubt (z. B. Individuell)';


--
-- Name: COLUMN compliance_dokument_typen.compliance_ebene; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compliance_dokument_typen.compliance_ebene IS 'allgemein = alle Partner; meister = Fachbetrieb/Meister-Gewerke; leistung = je Auftrag/Leistungsvertrag';


--
-- Name: COLUMN compliance_dokument_typen.nur_bei_bauleistung; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compliance_dokument_typen.nur_bei_bauleistung IS 'Nur Pflicht wenn Partner mindestens ein Bau-Gewerk hat (gewerke.ist_bauleistung)';


--
-- Name: copilot_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.copilot_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: copilot_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.copilot_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT copilot_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


--
-- Name: TABLE copilot_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.copilot_messages IS 'Bärenwald Copilot (Telegram): Chat-Verlauf für Claude';


--
-- Name: crm_impersonation_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_impersonation_tokens (
    jti uuid NOT NULL,
    admin_id uuid NOT NULL,
    admin_email text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    target_email text NOT NULL,
    role_label text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: crm_notification_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_notification_reads (
    user_id uuid NOT NULL,
    source_key text NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE crm_notification_reads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_notification_reads IS 'CRM-Inbox: gelesen pro User, source_key z. B. neue_anfrage:{leadId}';


--
-- Name: crm_push_prefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_push_prefs (
    user_id uuid NOT NULL,
    push_enabled boolean DEFAULT false NOT NULL,
    neue_anfragen boolean DEFAULT true NOT NULL,
    handwerker_updates boolean DEFAULT true NOT NULL,
    angebot_entscheidungen boolean DEFAULT true NOT NULL,
    anstehende_abnahmen boolean DEFAULT true NOT NULL,
    auftrag_partner boolean DEFAULT true NOT NULL,
    ueberfaellige_rechnungen boolean DEFAULT true NOT NULL,
    system_updates boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE crm_push_prefs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_push_prefs IS 'CRM PWA-Push: Master + Event-Switches pro Staff-User';


--
-- Name: crm_push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE crm_push_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_push_subscriptions IS 'Web-Push-Subscriptions (Home-Screen-PWA) pro Gerät/User';


--
-- Name: custom_field_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_field_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objekt_typ text NOT NULL,
    label text NOT NULL,
    feld_typ text NOT NULL,
    optionen jsonb,
    pflicht boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    aktiv boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: custom_field_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_field_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    definition_id uuid NOT NULL,
    objekt_id uuid NOT NULL,
    wert text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: datenschutz_anfragen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.datenschutz_anfragen (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    typ text DEFAULT 'loeschung'::text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    beschreibung text,
    status text DEFAULT 'offen'::text NOT NULL,
    erledigt_at timestamp with time zone,
    notizen text,
    created_at timestamp with time zone DEFAULT now(),
    kontext text
);


--
-- Name: COLUMN datenschutz_anfragen.kontext; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.datenschutz_anfragen.kontext IS 'Betroffenen-Kontext: mieter_meldung | privatkunde | partner | sonstiges';


--
-- Name: datenschutz_fristen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.datenschutz_fristen (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    kategorie text NOT NULL,
    bezeichnung text NOT NULL,
    frist_monate integer NOT NULL,
    beschreibung text,
    gesetzliche_grundlage text,
    aktiv boolean DEFAULT true
);


--
-- Name: datenschutz_loeschlog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.datenschutz_loeschlog (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    typ text NOT NULL,
    referenz_id uuid,
    referenz_typ text,
    grund text NOT NULL,
    geloescht_von uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: datenschutz_vvt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.datenschutz_vvt (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titel text NOT NULL,
    zweck text NOT NULL,
    rechtsgrundlage text,
    betroffene_kategorien text,
    datenarten text,
    empfaenger text,
    drittland text,
    loeschfrist_hinweis text,
    toms text,
    aktiv boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: TABLE datenschutz_vvt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.datenschutz_vvt IS 'Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)';


--
-- Name: eigentuemer_objekte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eigentuemer_objekte (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    kunde_objekt_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE eigentuemer_objekte; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.eigentuemer_objekte IS 'D8: Welche Objekte ein Eigentümer-Portal-Nutzer sehen darf (Sichtbarkeit Vorgänge/Objekte).';


--
-- Name: einbehalte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.einbehalte (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    handwerker_id uuid NOT NULL,
    rechnung_brutto numeric(10,2) NOT NULL,
    einbehalt_prozent numeric(4,2) DEFAULT 5.00 NOT NULL,
    einbehalt_betrag numeric(10,2) NOT NULL,
    bezahlt_betrag numeric(10,2) NOT NULL,
    status text DEFAULT 'einbehalten'::text NOT NULL,
    freigabe_datum date NOT NULL,
    freigegeben_at timestamp with time zone,
    notizen text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: eingangsrechnungen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eingangsrechnungen (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    lieferant text NOT NULL,
    beschreibung text,
    kategorie text DEFAULT 'material'::text NOT NULL,
    betrag_netto numeric(10,2) NOT NULL,
    mwst_satz numeric(4,2) DEFAULT 19.00,
    betrag_brutto numeric(10,2) NOT NULL,
    rechnungsdatum date,
    faellig_am date,
    bezahlt boolean DEFAULT false,
    bezahlt_am date,
    beleg_url text,
    notizen text,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: einheit_bewohner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.einheit_bewohner (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    objekt_einheit_id uuid NOT NULL,
    name text NOT NULL,
    telefon text,
    email text,
    aktiv boolean DEFAULT true NOT NULL,
    anonymisiert_am timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rolle text DEFAULT 'mieter'::text NOT NULL,
    mietbeginn date,
    mietende date,
    miete_hinweis text,
    sondereigentum_verwaltung boolean DEFAULT false NOT NULL,
    notiz text,
    portal_kunde_id uuid,
    CONSTRAINT einheit_bewohner_rolle_check CHECK ((rolle = ANY (ARRAY['mieter'::text, 'eigentuemer'::text])))
);


--
-- Name: COLUMN einheit_bewohner.rolle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.einheit_bewohner.rolle IS 'mieter | eigentuemer — Person an der Einheit';


--
-- Name: COLUMN einheit_bewohner.sondereigentum_verwaltung; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.einheit_bewohner.sondereigentum_verwaltung IS 'Nur Eigentümer: HV führt Sondereigentum (Default false).';


--
-- Name: COLUMN einheit_bewohner.portal_kunde_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.einheit_bewohner.portal_kunde_id IS 'Verknüpfter Privatkunde (CRM-Stamm und/oder Portal-Login). Die Bewohner-Zeile bleibt Akte der HV; Phase-1-Portal bleibt HV-Kontext.';


--
-- Name: einstellungen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.einstellungen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: eintrag_fotos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eintrag_fotos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    eintrag_id uuid NOT NULL,
    storage_path text NOT NULL,
    exif_aufnahme timestamp with time zone,
    server_eingang timestamp with time zone DEFAULT now() NOT NULL,
    exif_gps_lat numeric(10,7),
    exif_gps_lng numeric(10,7),
    aufnahmeart text DEFAULT 'direkt'::text NOT NULL,
    nachreich_grund text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT eintrag_fotos_aufnahmeart_check CHECK ((aufnahmeart = ANY (ARRAY['direkt'::text, 'nachgereicht'::text]))),
    CONSTRAINT eintrag_fotos_nachreich_check CHECK (((aufnahmeart <> 'nachgereicht'::text) OR ((nachreich_grund IS NOT NULL) AND (length(TRIM(BOTH FROM nachreich_grund)) > 0))))
);


--
-- Name: COLUMN eintrag_fotos.exif_gps_lat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.eintrag_fotos.exif_gps_lat IS 'GPS Latitude (statt POINT — einfacher in JS)';


--
-- Name: COLUMN eintrag_fotos.exif_gps_lng; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.eintrag_fotos.exif_gps_lng IS 'GPS Longitude';


--
-- Name: email_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    lead_id uuid,
    angebot_id uuid,
    auftrag_id uuid,
    typ text NOT NULL,
    empfaenger text NOT NULL,
    subject text NOT NULL,
    resend_id text,
    status text DEFAULT 'gesendet'::text NOT NULL,
    fehler_text text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    an_email text,
    an_name text,
    betreff text,
    inhalt_html text,
    kunde_id uuid,
    rechnung_id uuid,
    gesendet_von uuid,
    fehler_nachricht text,
    created_at timestamp with time zone DEFAULT now(),
    anhang_dateiname text
);


--
-- Name: COLUMN email_log.anhang_dateiname; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.email_log.anhang_dateiname IS 'Dateiname des PDF-Anhangs beim Versand';


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    typ text NOT NULL,
    angebot_id uuid,
    zuweisung_id uuid,
    to_email text,
    subject text,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: formular_eintraege; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.formular_eintraege (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    template_id uuid NOT NULL,
    auftrag_id uuid,
    handwerker_id uuid,
    phase public.formular_phase DEFAULT 'vorab'::public.formular_phase NOT NULL,
    daten jsonb DEFAULT '{}'::jsonb NOT NULL,
    foto_urls text[],
    gespeichert_at timestamp with time zone,
    submitted_at timestamp with time zone,
    ist_entwurf boolean DEFAULT true NOT NULL,
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    unterschrift_kunde text,
    unterschrift_at timestamp with time zone,
    gesamtstunden numeric(6,2),
    material_kosten numeric(10,2)
);


--
-- Name: formular_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.formular_templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    gewerk_id uuid,
    name text NOT NULL,
    typ public.formular_typ DEFAULT 'handwerker'::public.formular_typ NOT NULL,
    phase public.formular_phase,
    felder jsonb DEFAULT '[]'::jsonb NOT NULL,
    aktiv boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    subtyp text
);


--
-- Name: fremd_vorgaenge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fremd_vorgaenge (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    kunde_objekt_id uuid NOT NULL,
    titel text NOT NULL,
    datum date DEFAULT CURRENT_DATE NOT NULL,
    kategorie text DEFAULT 'sonstiges'::text NOT NULL,
    betrag numeric(12,2),
    dokument_url text,
    notiz text,
    quelle text DEFAULT 'extern'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: funnel_portal_otp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.funnel_portal_otp (
    email text NOT NULL,
    code_hash text NOT NULL,
    user_id uuid,
    expires_at timestamp with time zone NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gewaehrleistungen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gewaehrleistungen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auftrag_id uuid NOT NULL,
    partner_id uuid,
    abnahme_am date NOT NULL,
    frist_bis date NOT NULL,
    status text DEFAULT 'aktiv'::text NOT NULL,
    mangel_lead_id uuid,
    regress_notiz text,
    wiedervorlage_am date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gewerke; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gewerke (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    aktiv boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ausfuehrung text DEFAULT 'eigen'::text,
    fachbetrieb_hinweis text,
    ist_bauleistung boolean DEFAULT true NOT NULL
);


--
-- Name: COLUMN gewerke.ist_bauleistung; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gewerke.ist_bauleistung IS 'false = Facility/Reinigung etc. — kein Bau-Paket (SoKA, §48b) im Stamm';


--
-- Name: gpt_raum_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gpt_raum_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ist_bilder_urls text[] DEFAULT '{}'::text[] NOT NULL,
    raum_analyse jsonb,
    wunsch_text text,
    render_prompt text,
    ergebnis_bild_url text,
    ergebnis_historie jsonb DEFAULT '[]'::jsonb NOT NULL,
    gpt_erklaerung jsonb,
    render_count integer DEFAULT 0 NOT NULL,
    ki_chat_verlauf jsonb DEFAULT '[]'::jsonb NOT NULL,
    funnel_quelle text DEFAULT 'gpt_raumvisualisierung'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    ziel_bild_url text,
    inspiration_analyse jsonb,
    viz_brief jsonb,
    lead_submitted_at timestamp with time zone,
    kunde_id uuid,
    visitor_token text,
    analyze_count integer DEFAULT 0 NOT NULL
);


--
-- Name: TABLE gpt_raum_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gpt_raum_sessions IS 'Anonyme GPT-Raumvisualisierung / Projekt-Studio (7 Tage TTL)';


--
-- Name: COLUMN gpt_raum_sessions.inspiration_analyse; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gpt_raum_sessions.inspiration_analyse IS 'Claude-Analyse des Inspirationsbildes (getrennt von Ist-Raumanalyse)';


--
-- Name: COLUMN gpt_raum_sessions.viz_brief; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gpt_raum_sessions.viz_brief IS 'Nutzer-Constraints für realistische Render-Pipeline (Modus, preserve, Antworten)';


--
-- Name: COLUMN gpt_raum_sessions.lead_submitted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gpt_raum_sessions.lead_submitted_at IS 'Anfrage über GPT-Lead-API — schaltet zusätzliche Renders frei';


--
-- Name: COLUMN gpt_raum_sessions.kunde_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gpt_raum_sessions.kunde_id IS 'Eingeloggter Portal-Kunde — höhere Limits';


--
-- Name: COLUMN gpt_raum_sessions.visitor_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gpt_raum_sessions.visitor_token IS 'Anonymer Browser-Token — Session-Quota ohne IP-Limit';


--
-- Name: handwerker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.handwerker (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    firma text,
    email text,
    telefon text,
    adresse text,
    gewerke text[],
    aktiv boolean DEFAULT true NOT NULL,
    notizen text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    partner_kategorie_id uuid,
    subkategorie text,
    ist_fachbetrieb boolean DEFAULT false,
    whatsapp text,
    webseite text,
    steuernummer text,
    ustid text,
    iban text,
    compliance_status text DEFAULT 'unvollstaendig'::text,
    auth_user_id uuid,
    bewertung_gesamt numeric(3,2),
    bewertung_qualitaet numeric(3,2),
    bewertung_termintreue numeric(3,2),
    bewertung_sauberkeit numeric(3,2),
    bewertung_kommunikation numeric(3,2),
    bewertung_preis_leistung numeric(3,2),
    bewertung_anzahl integer DEFAULT 0 NOT NULL,
    vorname text,
    nachname text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    strasse text,
    ort text,
    handelsregister text,
    bic text,
    bank text,
    ist_portal_gesperrt boolean DEFAULT false NOT NULL,
    portal_gesperrt_am timestamp with time zone,
    logo_url text,
    rechnungsnr_seq integer DEFAULT 0 NOT NULL,
    kleinunternehmer boolean DEFAULT false NOT NULL,
    herkunft text,
    hausnummer text,
    plz text,
    CONSTRAINT handwerker_herkunft_check CHECK (((herkunft IS NULL) OR (herkunft = ANY (ARRAY['handwerker'::text, 'partner'::text]))))
);


--
-- Name: COLUMN handwerker.auth_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.auth_user_id IS 'Supabase Auth User — auch CRM-Mitarbeiter, wenn E-Mail im Handwerker-Stamm.';


--
-- Name: COLUMN handwerker.bewertung_gesamt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.bewertung_gesamt IS 'Ø Gesamtbewertung (1–5) über alle Kategorien und Bewertungen';


--
-- Name: COLUMN handwerker.vorname; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.vorname IS 'Vorname Geschäftsführer / Ansprechpartner';


--
-- Name: COLUMN handwerker.nachname; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.nachname IS 'Nachname Geschäftsführer / Ansprechpartner';


--
-- Name: COLUMN handwerker.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.updated_at IS 'Letzte Stammdaten-Änderung';


--
-- Name: COLUMN handwerker.strasse; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.strasse IS 'D12: Straße für Angebote/Rechnungen (Mock HW_FIRMA.strasse)';


--
-- Name: COLUMN handwerker.ort; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.ort IS 'D12: PLZ / Ort (Mock HW_FIRMA.ort)';


--
-- Name: COLUMN handwerker.handelsregister; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.handelsregister IS 'D12: Handelsregister (Mock HW_FIRMA.hrb)';


--
-- Name: COLUMN handwerker.bic; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.bic IS 'D12: BIC (Mock HW_FIRMA.bic)';


--
-- Name: COLUMN handwerker.bank; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.bank IS 'D12: Bankname (Mock HW_FIRMA.bank)';


--
-- Name: COLUMN handwerker.ist_portal_gesperrt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.ist_portal_gesperrt IS 'Wenn true: kein Partner-Portal-Login/-Register; Partner sollen sich an Bärenwald wenden.';


--
-- Name: COLUMN handwerker.portal_gesperrt_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.portal_gesperrt_am IS 'Zeitpunkt des Portal-Ausschlusses (null wenn nicht gesperrt).';


--
-- Name: COLUMN handwerker.logo_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.logo_url IS 'Storage-Pfad oder URL Firmenlogo für Angebote/Rechnungen';


--
-- Name: COLUMN handwerker.rechnungsnr_seq; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.rechnungsnr_seq IS 'Fortlaufender Zähler für Partner-Rechnungsnummern (pro Jahr manuell zurücksetzbar)';


--
-- Name: COLUMN handwerker.kleinunternehmer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.kleinunternehmer IS '§19 UStG — Rechnung ohne MwSt-Ausweis, mit Kleinunternehmer-Hinweis';


--
-- Name: COLUMN handwerker.herkunft; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.herkunft IS 'partner = aus Tabelle partner migriert; null/handwerker = nativ';


--
-- Name: COLUMN handwerker.hausnummer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.hausnummer IS 'Hausnummer zur Straße (Portal Firmendaten / CRM Stammdaten)';


--
-- Name: COLUMN handwerker.plz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker.plz IS 'PLZ (Portal Firmendaten / CRM Stammdaten); ort nur noch Ortsname';


--
-- Name: handwerker_bewertungen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.handwerker_bewertungen (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    handwerker_id uuid NOT NULL,
    auftrag_id uuid NOT NULL,
    gewerk_id uuid,
    qualitaet smallint NOT NULL,
    termintreue smallint NOT NULL,
    sauberkeit smallint NOT NULL,
    kommunikation smallint NOT NULL,
    preis_leistung smallint NOT NULL,
    notiz text,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT handwerker_bewertungen_kommunikation_check CHECK (((kommunikation >= 1) AND (kommunikation <= 5))),
    CONSTRAINT handwerker_bewertungen_preis_leistung_check CHECK (((preis_leistung >= 1) AND (preis_leistung <= 5))),
    CONSTRAINT handwerker_bewertungen_qualitaet_check CHECK (((qualitaet >= 1) AND (qualitaet <= 5))),
    CONSTRAINT handwerker_bewertungen_sauberkeit_check CHECK (((sauberkeit >= 1) AND (sauberkeit <= 5))),
    CONSTRAINT handwerker_bewertungen_termintreue_check CHECK (((termintreue >= 1) AND (termintreue <= 5)))
);


--
-- Name: TABLE handwerker_bewertungen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.handwerker_bewertungen IS 'Interne Handwerker-Bewertung nach Projektabschluss (5 Kategorien)';


--
-- Name: handwerker_compliance_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.handwerker_compliance_status AS
 SELECT id,
    name,
    firma,
    0 AS pflicht_gesamt,
    0 AS docs_vorhanden,
    0 AS bald_ablaufend,
        CASE
            WHEN (compliance_status = 'ok'::text) THEN 'ok'::text
            WHEN (compliance_status = 'fehlt'::text) THEN 'fehlt'::text
            ELSE 'unvollstaendig'::text
        END AS compliance_status_berechnet
   FROM public.handwerker h
  WHERE (aktiv = true);


--
-- Name: handwerker_vertraege; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.handwerker_vertraege (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    typ text NOT NULL,
    vertrags_nr text NOT NULL,
    status text DEFAULT 'entwurf'::text NOT NULL,
    auftrag_id uuid,
    handwerker_id uuid NOT NULL,
    gewerk_id uuid,
    gewerk_name text,
    bauvorhaben text,
    leistungsumfang text,
    verguetung_text text,
    regiesatz_netto numeric(10,2),
    einbehalt_prozent numeric(4,2) DEFAULT 5.00 NOT NULL,
    zahlungsziel_tage integer DEFAULT 14 NOT NULL,
    aufmass_rhythmus_tage integer DEFAULT 14 NOT NULL,
    pdf_url text,
    signiert_am timestamp with time zone,
    notizen text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_vertrag_id uuid,
    dokument_art text DEFAULT 'hauptvertrag'::text NOT NULL,
    dokument_titel text,
    bezug_vertrag_vom text,
    bezug_vertrags_nr text,
    vertrag_vom text,
    nachtrag_positionen jsonb,
    portal_akzeptiert_am timestamp with time zone,
    portal_akzeptiert_auth_user_id uuid,
    CONSTRAINT handwerker_vertraege_dokument_art_check CHECK ((dokument_art = ANY (ARRAY['hauptvertrag'::text, 'ergaenzung'::text]))),
    CONSTRAINT handwerker_vertraege_typ_check CHECK ((typ = ANY (ARRAY['projekt'::text, 'rahmen'::text])))
);


--
-- Name: TABLE handwerker_vertraege; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.handwerker_vertraege IS 'Projekt-Nachunternehmerverträge und Partner-Rahmenverträge';


--
-- Name: COLUMN handwerker_vertraege.typ; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker_vertraege.typ IS 'projekt = je Auftrag, rahmen = je Handwerker';


--
-- Name: COLUMN handwerker_vertraege.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker_vertraege.status IS 'entwurf | pdf_erzeugt | unterschrieben';


--
-- Name: COLUMN handwerker_vertraege.portal_akzeptiert_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker_vertraege.portal_akzeptiert_am IS 'Partner hat Rahmenvertrag im Portal akzeptiert (Registrierung oder Profil)';


--
-- Name: COLUMN handwerker_vertraege.portal_akzeptiert_auth_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handwerker_vertraege.portal_akzeptiert_auth_user_id IS 'auth.users.id des Partners bei Annahme im eingeloggten Portal';


--
-- Name: hausmeister_objekte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hausmeister_objekte (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_hausmeister_id uuid NOT NULL,
    kunde_objekt_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE hausmeister_objekte; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hausmeister_objekte IS 'Genau ein aktiver Hausmeister pro Objekt; ein HM kann viele Objekte haben.';


--
-- Name: hv_calendar_feeds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hv_calendar_feeds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    auth_user_id uuid NOT NULL,
    token_hash text NOT NULL,
    label text,
    aktiv boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hv_notification_prefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hv_notification_prefs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    auth_user_id uuid NOT NULL,
    kategorie text NOT NULL,
    modus text DEFAULT 'sofort'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hv_notification_prefs_modus_check CHECK ((modus = ANY (ARRAY['sofort'::text, 'digest'::text, 'nur_notfall'::text])))
);


--
-- Name: hv_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hv_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    auth_user_id uuid,
    typ text NOT NULL,
    titel text NOT NULL,
    body text,
    link text,
    gelesen_am timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hv_portal_abnahmen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hv_portal_abnahmen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auftrag_id uuid NOT NULL,
    lead_id uuid,
    kunde_id uuid,
    art text NOT NULL,
    anmerkung text,
    signatur_png text,
    signiert_name text NOT NULL,
    signiert_am timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hv_portal_abnahmen_art_check CHECK ((art = ANY (ARRAY['ohne_vorbehalt'::text, 'mit_anmerkung'::text, 'zurueckgewiesen'::text])))
);


--
-- Name: hw_formular_einreichungen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hw_formular_einreichungen (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tab_id uuid NOT NULL,
    auftrag_id uuid NOT NULL,
    handwerker_id uuid,
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
    felder_werte jsonb DEFAULT '{}'::jsonb,
    foto_urls text[],
    status text DEFAULT 'offen'::text,
    gesendet_at timestamp with time zone,
    eingereicht_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: hw_formular_tabs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hw_formular_tabs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    handwerker_id uuid,
    name text NOT NULL,
    beschreibung text,
    felder jsonb DEFAULT '[]'::jsonb NOT NULL,
    sort_order integer DEFAULT 0,
    aktiv boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: kalender_termine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kalender_termine (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    lead_id uuid,
    auftrag_id uuid,
    titel text NOT NULL,
    beschreibung text,
    typ public.termin_typ DEFAULT 'sonstiges'::public.termin_typ NOT NULL,
    datum date NOT NULL,
    uhrzeit_von time without time zone,
    uhrzeit_bis time without time zone,
    adresse text,
    erledigt boolean DEFAULT false NOT NULL,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    verweis_typ text,
    verweis_id uuid,
    wiedervorlage_notiz text,
    zugewiesen_an uuid
);


--
-- Name: TABLE kalender_termine; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.kalender_termine IS 'CRM-Kalender: Termine zu Leads oder Aufträgen';


--
-- Name: COLUMN kalender_termine.zugewiesen_an; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kalender_termine.zugewiesen_an IS 'CRM-Mitarbeiter:in für Vor-Ort-Termin (Kalender + Kunden-Mail)';


--
-- Name: katalog_lernsignale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.katalog_lernsignale (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    angebot_id uuid,
    lead_id uuid,
    gewerk_id uuid,
    titel text NOT NULL,
    beschreibung text DEFAULT ''::text NOT NULL,
    einheit text DEFAULT 'pauschal'::text NOT NULL,
    preis_netto numeric(10,2) DEFAULT 0 NOT NULL,
    menge numeric(12,3) DEFAULT 1 NOT NULL,
    quelle text DEFAULT 'frei'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT katalog_lernsignale_quelle_check CHECK ((quelle = ANY (ARRAY['frei'::text, 'katalog_abgewandelt'::text])))
);


--
-- Name: TABLE katalog_lernsignale; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.katalog_lernsignale IS 'Freie Angebotspositionen für KI-Analyse — kein Auto-Insert in den Katalog';


--
-- Name: katalog_positionen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.katalog_positionen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gewerk_id uuid NOT NULL,
    titel text NOT NULL,
    kategorie text DEFAULT 'Sonstiges'::text NOT NULL,
    beschreibung_standard text DEFAULT ''::text NOT NULL,
    aktiv boolean DEFAULT true NOT NULL,
    sortierung integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT katalog_positionen_kategorie_check CHECK ((kategorie = ANY (ARRAY['Reparatur'::text, 'Erneuerung'::text, 'Wartung'::text, 'Komplettsanierung'::text, 'Teilleistung'::text, 'Laufende Leistung'::text, 'Nebenleistung'::text, 'Entsorgung'::text, 'Baumarbeiten'::text, 'Verlegen'::text, 'Aufbereitung'::text, 'Abbruch'::text, 'Innen'::text, 'Außen'::text, 'Wände'::text, 'Decken'::text, 'Sonstiges'::text])))
);


--
-- Name: TABLE katalog_positionen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.katalog_positionen IS 'Kuratierter Preiskatalog: Positionstitel ohne Preis';


--
-- Name: katalog_preise; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.katalog_preise (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    produkt_slug text NOT NULL,
    groessenklasse text,
    preis_min numeric,
    preis_max numeric,
    preis_fix numeric,
    stundensatz numeric,
    m2_satz numeric,
    lohnanteil_prozent numeric,
    aktiv boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: katalog_produkte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.katalog_produkte (
    slug text NOT NULL,
    bezeichnung text NOT NULL,
    familie text NOT NULL,
    preis_typ text DEFAULT 'fix'::text NOT NULL,
    lohnanteil_prozent numeric DEFAULT 85 NOT NULL,
    has_fixpreis boolean DEFAULT false NOT NULL,
    beschreibung text,
    scope_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    aktiv boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT katalog_produkte_preis_typ_check CHECK ((preis_typ = ANY (ARRAY['fix'::text, 'band'::text, 'stundensatz'::text, 'm2_fix'::text, 'm2_band'::text])))
);


--
-- Name: katalog_varianten; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.katalog_varianten (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    position_id uuid NOT NULL,
    variante text DEFAULT ''::text NOT NULL,
    beschreibung text DEFAULT ''::text NOT NULL,
    einheit text NOT NULL,
    preis_typ text DEFAULT 'ab'::text NOT NULL,
    preis numeric(10,2) NOT NULL,
    aktiv boolean DEFAULT true NOT NULL,
    sortierung integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT katalog_varianten_einheit_check CHECK ((einheit = ANY (ARRAY['m²'::text, 'lfd. m'::text, 'm³'::text, 'Stück'::text, 'Stunde'::text, 'pauschal'::text, 'Monat'::text, 'Saison'::text, 'Besuch'::text, 'm²/Monat'::text, 'm²/Saison'::text]))),
    CONSTRAINT katalog_varianten_preis_check CHECK ((preis >= (0)::numeric)),
    CONSTRAINT katalog_varianten_preis_typ_check CHECK ((preis_typ = ANY (ARRAY['fix'::text, 'ab'::text])))
);


--
-- Name: TABLE katalog_varianten; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.katalog_varianten IS 'Varianten mit Preis; IDs können alte preislisten-IDs sein';


--
-- Name: ki_anfragen_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ki_anfragen_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    session_id text,
    anfrage_text text NOT NULL,
    claude_antwort text,
    typ text DEFAULT 'unbekannt'::text,
    extrahiertes_json jsonb,
    lead_erstellt boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    lead_id uuid
);


--
-- Name: ki_cluster_analysen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ki_cluster_analysen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bereich text NOT NULL,
    analyse_key text NOT NULL,
    titel text NOT NULL,
    ergebnis jsonb DEFAULT '{}'::jsonb NOT NULL,
    narrative text,
    sample_size integer DEFAULT 0 NOT NULL,
    generiert_am timestamp with time zone DEFAULT now() NOT NULL,
    gueltig_bis timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ki_cluster_analysen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ki_cluster_analysen IS 'KI-/SQL-Analysen je Cluster (Preise, Handwerker, Funnel …) für /ki-analytics';


--
-- Name: ki_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ki_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    empfehlung_id uuid,
    typ text NOT NULL,
    text_content text,
    bild_url text,
    bild_prompt text,
    status text DEFAULT 'generiert'::text NOT NULL,
    publiziert_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ki_empfehlungen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ki_empfehlungen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bereich text NOT NULL,
    prioritaet text DEFAULT 'mittel'::text NOT NULL,
    titel text NOT NULL,
    beschreibung text,
    daten_basis jsonb,
    content jsonb,
    aktion_typ text,
    aktion_payload jsonb,
    gesehen boolean DEFAULT false NOT NULL,
    umgesetzt boolean DEFAULT false NOT NULL,
    umgesetzt_at timestamp with time zone,
    analyse_lauf timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ki_historische_positionen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ki_historische_positionen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dokument_nr text NOT NULL,
    gewerk text,
    leistung text NOT NULL,
    einheit text,
    menge numeric(12,4),
    einzelpreis_netto numeric(12,2),
    gesamt_netto numeric(12,2),
    berechnung text,
    kostenart text,
    crm_modul text,
    import_batch text,
    importiert_am timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ki_historische_positionen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ki_historische_positionen IS 'Leistungspositionen zur Historie (Excel Leistungspositionen-Tab)';


--
-- Name: ki_historische_vorgaenge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ki_historische_vorgaenge (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dokument_nr text NOT NULL,
    dokumenttyp text NOT NULL,
    status text NOT NULL,
    kundennr text,
    kunde_name text,
    objekt_adresse text,
    gewerk text NOT NULL,
    taetigkeit text,
    netto numeric(12,2),
    mwst numeric(12,2),
    brutto numeric(12,2),
    berechnung text,
    hinweis text,
    import_batch text,
    importiert_am timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ki_historische_vorgaenge; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ki_historische_vorgaenge IS 'Abgeschlossene Rechnungen/Angebote aus Excel-Historie — nur für KI Analytics, nicht operatives CRM';


--
-- Name: ki_produkt_katalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ki_produkt_katalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hauptmodul text NOT NULL,
    untermodul text,
    typische_einheit text,
    preislogik text,
    beispiele text,
    sort_order integer DEFAULT 0 NOT NULL,
    import_batch text,
    importiert_am timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ki_produkt_katalog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ki_produkt_katalog IS 'Produkt-/Preislogik aus CRM_Struktur (Excel)';


--
-- Name: ki_visualisierungen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ki_visualisierungen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    angebot_id uuid,
    ist_bilder_urls text[],
    ziel_bild_url text,
    analyse_prompt text,
    prompt_history jsonb DEFAULT '[]'::jsonb,
    ergebnis_urls text[],
    ausgewaehlte_urls text[],
    ins_angebot boolean DEFAULT false,
    status text DEFAULT 'neu'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kunden; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kunden (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    email text,
    telefon text,
    adresse text,
    plz text,
    ort text,
    typ text DEFAULT 'privat'::text NOT NULL,
    notizen text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ansprechpartner text,
    webseite text,
    geburtstag date,
    kundennummer text,
    quelle text,
    gesamt_umsatz numeric(12,2) DEFAULT 0,
    letzte_aktivitaet timestamp with time zone,
    vorname text,
    nachname text,
    strasse text,
    hausnummer text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ust_id text,
    auth_user_id uuid,
    portal_modus text DEFAULT 'privat'::text NOT NULL,
    org_kennung text,
    org_anzeigename text,
    org_logo_url text,
    freigabe_modus text DEFAULT 'direkt'::text NOT NULL,
    freigabe_schwelle_eur numeric,
    notfall_direkt boolean DEFAULT true NOT NULL,
    kleinreparatur_aktiv boolean DEFAULT false NOT NULL,
    org_primary_color text,
    mieter_kontakt_telefon text,
    mieter_kontakt_email text,
    mieter_kontakt_hinweis text,
    av_akzeptiert_am timestamp with time zone,
    av_version text,
    impressum_url text,
    datenschutz_url text,
    av_akzeptiert_von uuid,
    av_text_snapshot text,
    wl_ansprache_am timestamp with time zone,
    org_primary_color_dk text,
    org_primary_color_soft text,
    org_logo_kuerzel text,
    org_sub text,
    org_telefon text,
    org_strasse text,
    org_ort text,
    eigentuemer_freigabe_schwelle_eur numeric(10,2),
    ist_spam boolean DEFAULT false NOT NULL,
    spam_markiert_am timestamp with time zone,
    ist_portal_gesperrt boolean DEFAULT false NOT NULL,
    portal_gesperrt_am timestamp with time zone,
    kleinreparaturen_ohne_angebot boolean DEFAULT false NOT NULL,
    org_hero_url text,
    org_hausnummer text,
    org_plz text,
    hm_auto_zuweisen boolean DEFAULT false NOT NULL,
    akut_fall_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT kunden_freigabe_modus_check CHECK ((freigabe_modus = ANY (ARRAY['direkt'::text, 'freigabe'::text]))),
    CONSTRAINT kunden_portal_modus_check CHECK ((portal_modus = ANY (ARRAY['privat'::text, 'organisation'::text, 'eigentuemer'::text, 'mieter'::text, 'hausmeister'::text])))
);


--
-- Name: COLUMN kunden.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.email IS 'Kontakt-E-Mail (Duplikate erlaubt). Portal-Login bleibt über auth_user_id eindeutig.';


--
-- Name: COLUMN kunden.auth_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.auth_user_id IS 'Supabase Auth User — auch CRM-Mitarbeiter, wenn E-Mail im Kundenstamm.';


--
-- Name: COLUMN kunden.portal_modus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.portal_modus IS 'privat | organisation (HV) | eigentuemer | mieter | hausmeister — letztere drei nur Portal-Stubs, nicht CRM-Kundenliste';


--
-- Name: COLUMN kunden.org_kennung; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.org_kennung IS 'URL-Slug z. B. musterverwaltung → /melden/{org_kennung}';


--
-- Name: COLUMN kunden.freigabe_modus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.freigabe_modus IS 'direkt = ohne Org-Freigabe; freigabe = Org muss freigeben';


--
-- Name: COLUMN kunden.freigabe_schwelle_eur; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.freigabe_schwelle_eur IS 'Ab diesem Betrag Freigabe nötig (null = immer nach freigabe_modus)';


--
-- Name: COLUMN kunden.notfall_direkt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.notfall_direkt IS 'Notfall-Meldungen umgehen Freigabe';


--
-- Name: COLUMN kunden.kleinreparatur_aktiv; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.kleinreparatur_aktiv IS 'Optionaler Sofort-Pfad Kleinreparatur. Schwelle = kunden.freigabe_schwelle_eur (eine Schwelle).';


--
-- Name: COLUMN kunden.org_primary_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.org_primary_color IS 'WL primary (HEX), z. B. #22508C';


--
-- Name: COLUMN kunden.mieter_kontakt_telefon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.mieter_kontakt_telefon IS 'Mieter-Fußzeile / No-Reply-Hinweis (WL)';


--
-- Name: COLUMN kunden.mieter_kontakt_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.mieter_kontakt_email IS 'Mieter-Fußzeile E-Mail (WL)';


--
-- Name: COLUMN kunden.av_akzeptiert_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.av_akzeptiert_am IS 'AV-Vertrag akzeptiert (Organisation-Onboarding)';


--
-- Name: COLUMN kunden.av_akzeptiert_von; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.av_akzeptiert_von IS 'Auth-User-ID bei AV-Akzeptanz (Org-Portal)';


--
-- Name: COLUMN kunden.av_text_snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.av_text_snapshot IS 'Archivierter AV-Volltext zum Zeitpunkt der Akzeptanz';


--
-- Name: COLUMN kunden.wl_ansprache_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.wl_ansprache_am IS 'Start der 30-Tage-Übergangsfrist (Bestands-HVs)';


--
-- Name: COLUMN kunden.org_primary_color_dk; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.org_primary_color_dk IS 'WL primary dunkel (HEX)';


--
-- Name: COLUMN kunden.org_primary_color_soft; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.org_primary_color_soft IS 'WL soft/background (HEX)';


--
-- Name: COLUMN kunden.org_logo_kuerzel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.org_logo_kuerzel IS 'Logo-Kürzel für Marke ohne Bild (z. B. IS)';


--
-- Name: COLUMN kunden.org_sub; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.org_sub IS 'Untertitel Sidebar/Header, Default Hausverwaltung';


--
-- Name: COLUMN kunden.org_telefon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.org_telefon IS 'HV-Stammdaten Telefon (ORG.tel)';


--
-- Name: COLUMN kunden.org_strasse; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.org_strasse IS 'HV-Stammdaten Straße (ohne Hausnummer)';


--
-- Name: COLUMN kunden.org_ort; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.org_ort IS 'HV-Stammdaten Ort (ohne PLZ)';


--
-- Name: COLUMN kunden.eigentuemer_freigabe_schwelle_eur; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.eigentuemer_freigabe_schwelle_eur IS 'D8: Kostenfreigabe-Schwelle des Eigentümers (Mock-Beispiel 500 €)';


--
-- Name: COLUMN kunden.ist_spam; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.ist_spam IS 'Wenn true: keine neuen Anfragen über Rechner/Website, kein Portal-Login/-Register mit dieser E-Mail.';


--
-- Name: COLUMN kunden.spam_markiert_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.spam_markiert_am IS 'Zeitpunkt der Spam-Markierung (null wenn nicht Spam).';


--
-- Name: COLUMN kunden.ist_portal_gesperrt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.ist_portal_gesperrt IS 'Wenn true: kein Kundenportal-Login/-Register; Rechner/Website und CRM bleiben nutzbar (anders als ist_spam).';


--
-- Name: COLUMN kunden.portal_gesperrt_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.portal_gesperrt_am IS 'Zeitpunkt des Portal-Ausschlusses (null wenn nicht gesperrt).';


--
-- Name: COLUMN kunden.kleinreparaturen_ohne_angebot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.kleinreparaturen_ohne_angebot IS 'ABGELÖST / nicht mehr verwenden — Angebot wird immer erzeugt; Freigabe über freigabe_schwelle_eur.';


--
-- Name: COLUMN kunden.org_hero_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.org_hero_url IS 'Whitelabel Hero/Banner-URL für Portal und Aushang';


--
-- Name: COLUMN kunden.org_hausnummer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.org_hausnummer IS 'HV-Stammdaten Hausnummer';


--
-- Name: COLUMN kunden.org_plz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.org_plz IS 'HV-Stammdaten PLZ';


--
-- Name: COLUMN kunden.hm_auto_zuweisen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.hm_auto_zuweisen IS 'Wenn true: neue Meldungen (nicht Akut) automatisch in hm_pruefung an den Objekt-Hausmeister.';


--
-- Name: COLUMN kunden.akut_fall_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden.akut_fall_ids IS 'Whitelist Sofortmaßnahme-Fall-IDs (Portal-Katalog). Leer = kein Direktauftrag.';


--
-- Name: kunden_ansprechpartner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kunden_ansprechpartner (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    telefon text,
    rolle text,
    ist_primaer boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE kunden_ansprechpartner; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.kunden_ansprechpartner IS 'CRM-Ansprechpartner (Name/E-Mail/Telefon) unter einem Kunden — Versandempfänger ohne neuen Kunden-Account.';


--
-- Name: kunden_dokumente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kunden_dokumente (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    kunde_id uuid NOT NULL,
    name text NOT NULL,
    typ text NOT NULL,
    datei_url text,
    groesse_bytes integer,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: kunden_mitglieder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kunden_mitglieder (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    auth_user_id uuid NOT NULL,
    rolle text DEFAULT 'sachbearbeiter'::text NOT NULL,
    aktiv boolean DEFAULT true NOT NULL,
    eingeladen_am timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kunden_mitglieder_rolle_check CHECK ((rolle = ANY (ARRAY['admin'::text, 'sachbearbeiter'::text, 'lesen'::text])))
);


--
-- Name: kunden_notizen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kunden_notizen (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    kunde_id uuid NOT NULL,
    inhalt text NOT NULL,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: kunden_objekte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kunden_objekte (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    titel text NOT NULL,
    strasse text,
    hausnummer text,
    plz text,
    ort text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    melde_slug text,
    melde_aktiv boolean DEFAULT true NOT NULL,
    einheiten_hinweis text,
    notizen_intern text,
    created_by text DEFAULT 'crm'::text NOT NULL,
    kostenstelle_nr text,
    freigabe_schwelle_eur numeric(10,2),
    typ text,
    cover_url text,
    versicherer text,
    versicherungs_nr text,
    selbstbehalt_eur numeric(10,2),
    notfall_direkt boolean,
    automatische_schadenakte boolean DEFAULT false NOT NULL,
    CONSTRAINT kunden_objekte_created_by_check CHECK ((created_by = ANY (ARRAY['crm'::text, 'portal'::text])))
);


--
-- Name: TABLE kunden_objekte; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.kunden_objekte IS 'HV-Objekte (Portal TEIL E). Spec organisation_ref=kunde_id, name=titel, adresse=strasse/hausnummer/plz/ort.';


--
-- Name: COLUMN kunden_objekte.melde_slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden_objekte.melde_slug IS 'Teil-URL /melden/{org}/{melde_slug}';


--
-- Name: COLUMN kunden_objekte.melde_aktiv; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden_objekte.melde_aktiv IS 'Öffentliches Meldeformular ein/aus';


--
-- Name: COLUMN kunden_objekte.freigabe_schwelle_eur; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden_objekte.freigabe_schwelle_eur IS 'Override Org-Schwelle; NULL = kunden.freigabe_schwelle_eur';


--
-- Name: COLUMN kunden_objekte.typ; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden_objekte.typ IS 'E1: Objekttyp (Mehrfamilienhaus / Wohnanlage / Einfamilienhaus (B2C)); ersetzt schrittweise portal2-Meta in notizen_intern';


--
-- Name: COLUMN kunden_objekte.cover_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden_objekte.cover_url IS 'Öffentliche URL des Gebäudefotos (dekorativ, optional).';


--
-- Name: COLUMN kunden_objekte.versicherer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden_objekte.versicherer IS 'Gebäudeversicherer (Stammdaten)';


--
-- Name: COLUMN kunden_objekte.versicherungs_nr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden_objekte.versicherungs_nr IS 'Policen-Nr. Gebäudeversicherung';


--
-- Name: COLUMN kunden_objekte.selbstbehalt_eur; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden_objekte.selbstbehalt_eur IS 'Selbstbehalt in EUR';


--
-- Name: COLUMN kunden_objekte.notfall_direkt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden_objekte.notfall_direkt IS 'Override Org-Notfall-Direkt; NULL = kunden.notfall_direkt';


--
-- Name: COLUMN kunden_objekte.automatische_schadenakte; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kunden_objekte.automatische_schadenakte IS 'Wenn true: Mieter-/Schadensmeldungen setzen Kostenträger Versicherung und erzeugen/aktualisieren die Schadenakte.';


--
-- Name: lead_befund_punkte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_befund_punkte (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    befund_id uuid NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    titel text NOT NULL,
    quelle text NOT NULL,
    vorlage_key text,
    status text,
    notiz text DEFAULT ''::text NOT NULL,
    foto_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lead_befund_punkte_quelle_check CHECK ((quelle = ANY (ARRAY['system'::text, 'frei'::text]))),
    CONSTRAINT lead_befund_punkte_status_check CHECK (((status IS NULL) OR (status = ANY (ARRAY['unauffaellig'::text, 'auffaellig'::text, 'nicht_pruefbar'::text]))))
);


--
-- Name: COLUMN lead_befund_punkte.vorlage_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_befund_punkte.vorlage_key IS 'Stabiler Punkt-Key aus Vorlage (basis_*, wl_*, …); null bei Freipunkten.';


--
-- Name: COLUMN lead_befund_punkte.foto_refs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_befund_punkte.foto_refs IS 'JSON-Array von Storage-Paths oder URLs.';


--
-- Name: lead_befunde; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_befunde (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    durchgefuehrt_von text DEFAULT ''::text NOT NULL,
    durchgefuehrt_am date DEFAULT CURRENT_DATE NOT NULL,
    ergebnis text,
    melde_kategorie text,
    vorlage_key text,
    objekt_kontakt_id uuid,
    created_by_kunde_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    abgeschlossen_at timestamp with time zone,
    CONSTRAINT lead_befunde_ergebnis_check CHECK (((ergebnis IS NULL) OR (ergebnis = ANY (ARRAY['selbst_erledigt'::text, 'fachfirma_angebot'::text, 'fachfirma_akut'::text]))))
);


--
-- Name: TABLE lead_befunde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lead_befunde IS 'Hausmeister-Vorbefund am Lead (1:1). Vorlage materialisiert als lead_befund_punkte.';


--
-- Name: COLUMN lead_befunde.ergebnis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_befunde.ergebnis IS 'selbst_erledigt | fachfirma_angebot | fachfirma_akut — null = Entwurf/Prüfung läuft';


--
-- Name: COLUMN lead_befunde.vorlage_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_befunde.vorlage_key IS 'Snapshot des Vorlagen-Keys bei Instanziierung (wasser_leckage, abfluss, …).';


--
-- Name: lead_notizen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_notizen (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    lead_id uuid NOT NULL,
    inhalt text NOT NULL,
    datei_url text,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now(),
    kalender_termin_id uuid,
    titel text,
    datei_urls text[],
    quelle_notiz_id uuid
);


--
-- Name: COLUMN lead_notizen.kalender_termin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_notizen.kalender_termin_id IS 'Optional: Notiz gehört zu einem Termin der Anfrage';


--
-- Name: COLUMN lead_notizen.titel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_notizen.titel IS 'Kurztitel (z. B. bei Termin-Notizen)';


--
-- Name: COLUMN lead_notizen.datei_urls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_notizen.datei_urls IS 'Mehrere Bild-URLs (z. B. Termin-Notizen)';


--
-- Name: COLUMN lead_notizen.quelle_notiz_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_notizen.quelle_notiz_id IS 'Kopie einer Termin-Notiz für Tab Anfrage-Notizen';


--
-- Name: lead_timeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_timeline (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    typ text NOT NULL,
    titel text NOT NULL,
    beschreibung text,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    angebot_id uuid,
    email_log_id uuid
);


--
-- Name: TABLE lead_timeline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lead_timeline IS 'Chronologische Einträge zur Anfrage (Auto-Log + manuelle Notizen)';


--
-- Name: COLUMN lead_timeline.email_log_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_timeline.email_log_id IS 'Verweis auf gespeicherte E-Mail (Vorschau in Timeline)';


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    kunde_id uuid,
    kanal public.lead_kanal DEFAULT 'website'::public.lead_kanal NOT NULL,
    status public.lead_status DEFAULT 'neu'::public.lead_status NOT NULL,
    situation text,
    bereiche text[],
    preis_min numeric(10,2),
    preis_max numeric(10,2),
    plz text,
    zeitraum text,
    kundentyp text,
    funnel_daten jsonb,
    kontakt_name text,
    kontakt_email text,
    kontakt_telefon text,
    kontakt_nachricht text,
    notizen text,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    budget_ca numeric(10,2),
    bereiche_sonstiges text,
    zeitraum_von date,
    zeitraum_bis date,
    vor_ort_notizen text,
    kunde_objekt_id uuid,
    ki_session_id text,
    ki_zusammenfassung text,
    strasse text,
    hausnummer text,
    produkt_slug text,
    leistung_slug text,
    ist_bauprojekt boolean DEFAULT false NOT NULL,
    auftraggeber_kunde_id uuid,
    anlass text,
    erfassung_von text,
    melder_name text,
    melder_einheit text,
    melder_telefon text,
    melder_email text,
    einladung_token uuid,
    einladung_status text,
    org_freigabe_status text DEFAULT 'nicht_noetig'::text NOT NULL,
    service_modus text,
    hv_meldung_status text,
    preis_unsicher boolean DEFAULT false NOT NULL,
    vorgang_phase text,
    kostentraeger text,
    kostentraeger_vorgeschlagen boolean DEFAULT false NOT NULL,
    melde_tracking_token text,
    versicherungs_nr text,
    duplikat_hinweis boolean DEFAULT false NOT NULL,
    storniert_am timestamp with time zone,
    storniert_grund text,
    storniert_von text,
    eigentuemer_freigabe_status text,
    ist_wiederkehrend boolean DEFAULT false NOT NULL,
    wiederkehr_turnus text,
    zusammengefuehrt_in uuid,
    wiedervorlage_datum date,
    wiedervorlage_notiz text,
    geloescht_am timestamp with time zone,
    duplikat_band_dismissed boolean DEFAULT false NOT NULL,
    freigabe_bypass_grund text,
    mieter_vor_ort_at timestamp with time zone,
    ansprechpartner_id uuid,
    versicherungsakte_pdf_url text,
    CONSTRAINT leads_anlass_check CHECK (((anlass IS NULL) OR (anlass = ANY (ARRAY['meldung'::text, 'projekt'::text, 'servicepaket'::text, 'sonstiges'::text])))),
    CONSTRAINT leads_eigentuemer_freigabe_status_check CHECK (((eigentuemer_freigabe_status IS NULL) OR (eigentuemer_freigabe_status = ANY (ARRAY['ausstehend'::text, 'freigegeben'::text, 'abgelehnt'::text, 'nicht_noetig'::text])))),
    CONSTRAINT leads_einladung_status_check CHECK (((einladung_status IS NULL) OR (einladung_status = ANY (ARRAY['offen'::text, 'ergaenzt'::text, 'entfallen'::text])))),
    CONSTRAINT leads_erfassung_von_check CHECK (((erfassung_von IS NULL) OR (erfassung_von = ANY (ARRAY['melder'::text, 'organisation'::text, 'crm'::text])))),
    CONSTRAINT leads_freigabe_bypass_grund_check CHECK (((freigabe_bypass_grund IS NULL) OR (freigabe_bypass_grund = ANY (ARRAY['schwelle'::text, 'akut'::text])))),
    CONSTRAINT leads_hv_meldung_status_check CHECK (((hv_meldung_status IS NULL) OR (hv_meldung_status = ANY (ARRAY['neu'::text, 'notmassnahme'::text, 'angebot_eingefordert'::text, 'kleinreparatur'::text, 'abgelehnt'::text, 'abgeschlossen'::text, 'hm_pruefung'::text, 'hm_erledigt'::text])))),
    CONSTRAINT leads_kostentraeger_check CHECK (((kostentraeger IS NULL) OR (kostentraeger = ANY (ARRAY['gemeinschaft'::text, 'sondereigentum'::text, 'mieter'::text, 'versicherung'::text, 'unklar'::text])))),
    CONSTRAINT leads_org_freigabe_status_check CHECK ((org_freigabe_status = ANY (ARRAY['nicht_noetig'::text, 'ausstehend'::text, 'freigegeben'::text, 'abgelehnt'::text]))),
    CONSTRAINT leads_service_modus_check CHECK (((service_modus IS NULL) OR (service_modus = ANY (ARRAY['paket'::text, 'einzeln'::text]))))
);


--
-- Name: COLUMN leads.kunde_objekt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.kunde_objekt_id IS 'Ausgewähltes Objekt für diese Anfrage (Wizard/PDF)';


--
-- Name: COLUMN leads.strasse; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.strasse IS 'Straße laut Website-Anfrage (Funnel)';


--
-- Name: COLUMN leads.hausnummer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.hausnummer IS 'Hausnummer laut Website-Anfrage (Funnel)';


--
-- Name: COLUMN leads.produkt_slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.produkt_slug IS 'Katalog-Produkt-Slug (z. B. bad-m-komfort)';


--
-- Name: COLUMN leads.leistung_slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.leistung_slug IS 'Leistungs-Basis-Slug (z. B. badezimmer-sanierung)';


--
-- Name: COLUMN leads.ist_bauprojekt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.ist_bauprojekt IS 'Bauprojekt / Bauauftrag — erweiterte Unterlagen & Bautagesberichte';


--
-- Name: COLUMN leads.auftraggeber_kunde_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.auftraggeber_kunde_id IS 'Organisation (HV) bei Melder-Meldungen; kunde_id = Melder';


--
-- Name: COLUMN leads.anlass; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.anlass IS 'meldung | projekt | servicepaket';


--
-- Name: COLUMN leads.einladung_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.einladung_token IS 'Token für /melden/ergaenzen/{token}';


--
-- Name: COLUMN leads.org_freigabe_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.org_freigabe_status IS 'Freigabe-Workflow Organisation';


--
-- Name: COLUMN leads.hv_meldung_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.hv_meldung_status IS 'HV-Meldungs-Workflow: neu | notmassnahme | angebot_eingefordert | kleinreparatur | abgelehnt | abgeschlossen | hm_pruefung | hm_erledigt';


--
-- Name: COLUMN leads.vorgang_phase; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.vorgang_phase IS 'CACHE only - Phase aus Existenz Angebot/Auftrag/RE ableiten, nie als einzige Quelle lesen';


--
-- Name: COLUMN leads.duplikat_hinweis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.duplikat_hinweis IS 'Vorstufe Spec-Duplikat-Band - zusammengefuehrt_in ergaenzt, ersetzt nicht';


--
-- Name: COLUMN leads.eigentuemer_freigabe_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.eigentuemer_freigabe_status IS 'D8: Eigentümer-Kostenfreigabe — ausstehend | freigegeben | abgelehnt | nicht_noetig';


--
-- Name: COLUMN leads.ist_wiederkehrend; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.ist_wiederkehrend IS 'Bestand: wiederkehrende Leistung (Wartung/Pflege) statt einmaligem Vorgang';


--
-- Name: COLUMN leads.wiederkehr_turnus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.wiederkehr_turnus IS 'Turnus: woechentlich|monatlich|quartal|saisonal|auf_abruf|individuell';


--
-- Name: COLUMN leads.zusammengefuehrt_in; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.zusammengefuehrt_in IS 'Spec zusammengefuehrtIn - Ziel-Lead; duplikat_hinweis bleibt Vorstufe';


--
-- Name: COLUMN leads.wiedervorlage_datum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.wiedervorlage_datum IS 'Spec Wiedervorlage Datum (Header)';


--
-- Name: COLUMN leads.wiedervorlage_notiz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.wiedervorlage_notiz IS 'Spec Wiedervorlage Notiz';


--
-- Name: COLUMN leads.geloescht_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.geloescht_am IS 'Soft-delete Anfrage; Listen filtern geloescht_am IS NULL; Undo setzt NULL';


--
-- Name: COLUMN leads.duplikat_band_dismissed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.duplikat_band_dismissed IS 'Nutzer hat Duplikat-Band geschlossen — Zusammenführen bleibt im ⋯-Menü';


--
-- Name: COLUMN leads.freigabe_bypass_grund; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.freigabe_bypass_grund IS 'Wenn org_freigabe_status=nicht_noetig: schwelle | akut. Null = keine Bypass-Info.';


--
-- Name: COLUMN leads.mieter_vor_ort_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.mieter_vor_ort_at IS 'Zeitpunkt der Vor-Ort-Bestätigung (Mieter-Statusschritt).';


--
-- Name: COLUMN leads.ansprechpartner_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.ansprechpartner_id IS 'Optionaler Ansprechpartner (Empfänger) für diese Anfrage';


--
-- Name: COLUMN leads.versicherungsakte_pdf_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.versicherungsakte_pdf_url IS 'Schadenakte Versicherung (PDF-URL), auch ohne Auftrag verfügbar.';


--
-- Name: leads_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads_status_history (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    lead_id uuid NOT NULL,
    status_alt public.lead_status,
    status_neu public.lead_status NOT NULL,
    notiz text,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid
);


--
-- Name: COLUMN leads_status_history.notiz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads_status_history.notiz IS 'Optionale Notiz zum Statuswechsel';


--
-- Name: COLUMN leads_status_history.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads_status_history.user_id IS 'CRM-Nutzer:in, die den Status geändert hat (null bei System/API)';


--
-- Name: marketing_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quelle text NOT NULL,
    metrik text NOT NULL,
    wert jsonb DEFAULT '{}'::jsonb NOT NULL,
    zeitraum_start date,
    zeitraum_end date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mieter_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mieter_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    auftrag_id uuid,
    sterne integer NOT NULL,
    freitext text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mieter_feedback_sterne_check CHECK (((sterne >= 1) AND (sterne <= 5)))
);


--
-- Name: nachtraege; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nachtraege (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    grund text NOT NULL,
    positionen jsonb DEFAULT '[]'::jsonb NOT NULL,
    gesamt_min numeric(10,2),
    gesamt_max numeric(10,2),
    status text DEFAULT 'entwurf'::text NOT NULL,
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
    kunde_bestaetigt_at timestamp with time zone,
    kunde_ip text,
    handwerker_bestaetigt boolean DEFAULT false,
    handwerker_bestaetigt_at timestamp with time zone,
    gesendet_at timestamp with time zone,
    akzeptiert_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE nachtraege; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nachtraege IS 'Zusatzleistungen / Preisänderungen mit Kundenfreigabe';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    handwerker_id uuid NOT NULL,
    typ text NOT NULL,
    projekt_name text DEFAULT ''::text NOT NULL,
    leistung_name text,
    gelesen boolean DEFAULT false NOT NULL,
    link text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_typ_check CHECK ((typ = ANY (ARRAY['neu'::text, 'geaendert'::text, 'entfernt'::text, 'erinnerung'::text, 'bautagebuch'::text])))
);


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS 'Partner-Portal: Glocke + E-Mail-Trigger (CRM → /api/internal/partner-notify)';


--
-- Name: objekt_abos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objekt_abos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    kunde_objekt_id uuid NOT NULL,
    produkt_slug text NOT NULL,
    service_modus text DEFAULT 'paket'::text NOT NULL,
    status text DEFAULT 'aktiv'::text NOT NULL,
    start_am date NOT NULL,
    end_am date,
    kuendigung_eingereicht_am timestamp with time zone,
    kuendigungsfrist_wochen integer DEFAULT 4 NOT NULL,
    monatspreis_netto numeric NOT NULL,
    lohnanteil_prozent numeric DEFAULT 85 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT objekt_abos_status_check CHECK ((status = ANY (ARRAY['aktiv'::text, 'gekuendigt'::text, 'beendet'::text, 'entwurf'::text])))
);


--
-- Name: objekt_dokumente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objekt_dokumente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    kunde_objekt_id uuid NOT NULL,
    kategorie text NOT NULL,
    titel text NOT NULL,
    storage_path text,
    storage_url text,
    ablauf_datum date,
    erinnerung_tage integer[] DEFAULT '{60,30}'::integer[] NOT NULL,
    status text DEFAULT 'aktiv'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT objekt_dokumente_kategorie_check CHECK ((kategorie = ANY (ARRAY['versicherung'::text, 'vertrag'::text, 'protokoll'::text, 'grundbuch'::text, 'sonstiges'::text])))
);


--
-- Name: objekt_einheiten; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objekt_einheiten (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_objekt_id uuid NOT NULL,
    bezeichnung text NOT NULL,
    wohnflaeche_m2 numeric,
    sort_order integer DEFAULT 0 NOT NULL,
    aktiv boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE objekt_einheiten; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.objekt_einheiten IS 'E1/E2: Einheiten je Objekt — Count für Karten-Badge „n Wohneinheiten“ und Melde-Anzeige';


--
-- Name: objekt_kontakte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objekt_kontakte (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    kunde_objekt_id uuid NOT NULL,
    rolle text NOT NULL,
    name text NOT NULL,
    telefon text,
    email text,
    notiz text,
    sort_order integer DEFAULT 0 NOT NULL,
    aktiv boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT objekt_kontakte_rolle_check CHECK ((rolle = ANY (ARRAY['hausmeister'::text, 'beirat'::text, 'dienstleister'::text, 'notfall'::text, 'makler'::text, 'sonstiges'::text])))
);


--
-- Name: objekt_pruefpflichten; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objekt_pruefpflichten (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_objekt_id uuid NOT NULL,
    typ text NOT NULL,
    intervall_monate integer,
    letzte_pruefung date,
    naechste_faellig date,
    nachweis_dokument_id uuid,
    quelle text DEFAULT 'manuell'::text NOT NULL,
    status text DEFAULT 'aktiv'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT objekt_pruefpflichten_quelle_check CHECK ((quelle = ANY (ARRAY['abo'::text, 'manuell'::text, 'crm'::text])))
);


--
-- Name: org_freigabe_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_freigabe_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    angebot_id uuid,
    auftraggeber_kunde_id uuid NOT NULL,
    aktion text NOT NULL,
    betrag_eur numeric,
    notiz text,
    erstellt_von text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT org_freigabe_log_aktion_check CHECK ((aktion = ANY (ARRAY['angefordert'::text, 'freigegeben'::text, 'abgelehnt'::text, 'nachtrag_angefordert'::text, 'info_gesendet'::text, 'auto_auftrag'::text])))
);


--
-- Name: org_hausmeister; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_hausmeister (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_kunde_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    portal_zugang boolean DEFAULT false NOT NULL,
    portal_kunde_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE org_hausmeister; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.org_hausmeister IS 'Hausmeister-Personen einer HV; optional Portal-Zugang (portal_kunde_id).';


--
-- Name: partner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    kategorie_id uuid,
    subkategorie text,
    ansprechpartner text,
    telefon text,
    email text,
    adresse text,
    website text,
    notizen text,
    aktiv boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    partner_typ text DEFAULT 'partner'::text
);


--
-- Name: partner_bautagebuch_anfragen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_bautagebuch_anfragen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auftrag_id uuid NOT NULL,
    handwerker_id uuid NOT NULL,
    notiz text,
    erledigt_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    angefordert_von uuid,
    position_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL
);


--
-- Name: TABLE partner_bautagebuch_anfragen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.partner_bautagebuch_anfragen IS 'Offene Aufforderung vom CRM: Handwerker soll Bautagebuch-Eintrag im Partner-Portal erstellen.';


--
-- Name: COLUMN partner_bautagebuch_anfragen.position_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partner_bautagebuch_anfragen.position_ids IS 'Optionale auftrag_positionen.id — im Portal vorauswählen beim Update.';


--
-- Name: partner_dokumente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_dokumente (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    handwerker_id uuid NOT NULL,
    typ text NOT NULL,
    bezeichnung text NOT NULL,
    gueltig_bis date,
    datei_url text,
    notizen text,
    hochgeladen_am timestamp with time zone DEFAULT now(),
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now(),
    auftrag_id uuid,
    status text DEFAULT 'freigegeben'::text NOT NULL,
    freigegeben_am timestamp with time zone,
    ablehnung_grund text,
    geloescht_am timestamp with time zone,
    geloescht_von text,
    CONSTRAINT partner_dokumente_status_check CHECK ((status = ANY (ARRAY['freigegeben'::text, 'genehmigt'::text, 'hochgeladen'::text, 'in_pruefung'::text, 'eingereicht'::text, 'abgelehnt'::text, 'geloescht'::text])))
);


--
-- Name: COLUMN partner_dokumente.auftrag_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partner_dokumente.auftrag_id IS 'NULL = allgemeine Partner-Compliance; gesetzt = projektbezogener Nachweis (sichtbar am Auftrag und beim Handwerker)';


--
-- Name: COLUMN partner_dokumente.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partner_dokumente.status IS 'freigegeben | genehmigt | hochgeladen | in_pruefung | eingereicht | abgelehnt | geloescht';


--
-- Name: COLUMN partner_dokumente.geloescht_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partner_dokumente.geloescht_am IS 'Partner hat Unterlage soft-gelöscht; CRM bestätigt endgültig.';


--
-- Name: COLUMN partner_dokumente.geloescht_von; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.partner_dokumente.geloescht_von IS 'partner | crm';


--
-- Name: partner_handwerker_migration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_handwerker_migration (
    partner_id uuid NOT NULL,
    handwerker_id uuid NOT NULL,
    migrated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE partner_handwerker_migration; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.partner_handwerker_migration IS 'Rueckholbarkeit Partner->Handwerker (Spec Q4). partner-Zeilen bleiben erhalten';


--
-- Name: partner_kategorien; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_kategorien (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    beschreibung text,
    sort_order integer DEFAULT 0
);


--
-- Name: partner_positions_anfragen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_positions_anfragen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auftrag_id uuid NOT NULL,
    handwerker_id uuid NOT NULL,
    titel text NOT NULL,
    begruendung text,
    schaetzung_eur numeric(12,2),
    schaetzung_minuten integer,
    status text DEFAULT 'offen'::text NOT NULL,
    position_id uuid,
    nachtrag_id uuid,
    crm_notiz text,
    decided_at timestamp with time zone,
    decided_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT partner_positions_anfragen_status_check CHECK ((status = ANY (ARRAY['offen'::text, 'intern'::text, 'nachtrag'::text, 'abgelehnt'::text])))
);


--
-- Name: TABLE partner_positions_anfragen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.partner_positions_anfragen IS 'Partner meldet Mehrbedarf/neue Position — CRM entscheidet intern | Nachtrag | Ablehnung.';


--
-- Name: partner_todos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_todos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    handwerker_id uuid NOT NULL,
    titel text NOT NULL,
    erledigt boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT partner_todos_titel_check CHECK ((char_length(TRIM(BOTH FROM titel)) > 0))
);


--
-- Name: TABLE partner_todos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.partner_todos IS 'Private Aufgabenliste im Partner-Portal (keine Kundendaten).';


--
-- Name: portal_einladungen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_einladungen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    kunde_id uuid NOT NULL,
    objekt_id uuid,
    einheit_ref text,
    einheit_id uuid,
    bewohner_id uuid,
    portal_kunde_id uuid,
    status text DEFAULT 'offen'::text NOT NULL,
    expires_at timestamp with time zone,
    created_by uuid,
    lead_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    eingeloest_am timestamp with time zone,
    org_hausmeister_id uuid,
    CONSTRAINT portal_einladungen_status_check CHECK ((status = ANY (ARRAY['offen'::text, 'eingeloest'::text, 'abgelaufen'::text, 'entfallen'::text])))
);


--
-- Name: TABLE portal_einladungen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.portal_einladungen IS 'Portal 2.0 E4/B9: Einladungs-Token für Mieter (teilbarer Link + QR). Mail nur mailto/HV-Branding, nie Bärenwald-Absender (D10/G5).';


--
-- Name: COLUMN portal_einladungen.einheit_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.portal_einladungen.einheit_ref IS 'Optionale Wohnungs-/Einheiten-Referenz (Spec einheit_ref), z. B. WE-Bezeichnung.';


--
-- Name: COLUMN portal_einladungen.einheit_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.portal_einladungen.einheit_id IS 'FK objekt_einheiten — Zuordnung Mieter↔Einheit bei Registrierung.';


--
-- Name: COLUMN portal_einladungen.portal_kunde_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.portal_einladungen.portal_kunde_id IS 'Kundenstamm des eingelösten Mieters (nach Registrierung).';


--
-- Name: COLUMN portal_einladungen.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.portal_einladungen.expires_at IS 'Ablauf; null = unbegrenzt bis manuell entfallen.';


--
-- Name: COLUMN portal_einladungen.org_hausmeister_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.portal_einladungen.org_hausmeister_id IS 'Hausmeister-Einladung (Portal-Zugang).';


--
-- Name: portal_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    empfaenger_user_id uuid NOT NULL,
    typ text NOT NULL,
    titel text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    vorgang_ref text,
    link text,
    gelesen boolean DEFAULT false NOT NULL,
    gelesen_am timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    icon_bg text,
    icon_fg text,
    icon_glyph text
);


--
-- Name: TABLE portal_notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.portal_notifications IS 'Portal 2.0 B4: Glocke für Kunde/HV/Eigentümer/Mieter/Partner (empfaenger_user_id). Quellen: CRM-Status, Freigabe, Termin, Bautagebuch, HW-Angebot.';


--
-- Name: COLUMN portal_notifications.body; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.portal_notifications.body IS 'Mock notifData Feld „text“ / Nachrichtenkörper.';


--
-- Name: COLUMN portal_notifications.vorgang_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.portal_notifications.vorgang_ref IS 'Lead-/Vorgangs-Referenz (z. B. lead_id oder V-Nummer).';


--
-- Name: position_eintraege; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.position_eintraege (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    position_id uuid,
    typ text NOT NULL,
    beschreibung text,
    beschreibung_roh text,
    zeit_minuten integer,
    erfasst_von text DEFAULT 'partner_app'::text NOT NULL,
    erfasser_akteur text,
    quelle text,
    rueckdatiert_grund text,
    ereignis_zeit timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    auftrag_id uuid,
    CONSTRAINT position_eintraege_bezug_check CHECK (((position_id IS NOT NULL) OR (auftrag_id IS NOT NULL))),
    CONSTRAINT position_eintraege_erfasst_von_check CHECK ((erfasst_von = ANY (ARRAY['partner_app'::text, 'eigenbetrieb_app'::text, 'crm_intern'::text]))),
    CONSTRAINT position_eintraege_quelle_check CHECK (((quelle IS NULL) OR (quelle = ANY (ARRAY['telefonisch'::text, 'foto_erhalten'::text, 'vor_ort'::text])))),
    CONSTRAINT position_eintraege_typ_check CHECK ((typ = ANY (ARRAY['start'::text, 'fortschritt'::text, 'ergebnis'::text, 'weitere_arbeit'::text, 'notiz'::text])))
);


--
-- Name: TABLE position_eintraege; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.position_eintraege IS 'Positions-Lebenszyklus-Einträge (Start/Fortschritt/Ergebnis) — ersetzt freies BT als Eingabe';


--
-- Name: COLUMN position_eintraege.position_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.position_eintraege.position_id IS 'Leistungsbezug; null = freier Eintrag ohne Leistung (typ notiz).';


--
-- Name: COLUMN position_eintraege.auftrag_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.position_eintraege.auftrag_id IS 'Auftrag-Bezug; Pflicht bei Einträgen ohne position_id (freie BT-Notiz).';


--
-- Name: position_material; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.position_material (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    position_id uuid NOT NULL,
    bezeichnung text NOT NULL,
    menge numeric(12,3) DEFAULT 1 NOT NULL,
    einzelpreis numeric(12,2) DEFAULT 0 NOT NULL,
    beleg_foto_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: preislisten; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preislisten (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    gewerk_id uuid NOT NULL,
    leistung text NOT NULL,
    einheit text NOT NULL,
    preis_min numeric(10,2) NOT NULL,
    aktiv boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kategorie text,
    preis_fix numeric(10,2),
    preis_typ text DEFAULT 'range'::text,
    unterkategorie text
);


--
-- Name: punch_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.punch_list (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auftrag_id uuid NOT NULL,
    gewerk_id uuid,
    beschreibung text NOT NULL,
    status text DEFAULT 'offen'::text NOT NULL,
    prioritaet text DEFAULT 'normal'::text NOT NULL,
    foto_urls text[] DEFAULT '{}'::text[] NOT NULL,
    foto_nachher_urls text[] DEFAULT '{}'::text[] NOT NULL,
    behoben_at timestamp with time zone,
    behoben_von uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    abnahme_punkt_id text,
    protokoll_id uuid
);


--
-- Name: TABLE punch_list; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.punch_list IS 'Abnahme-Mängelliste';


--
-- Name: COLUMN punch_list.abnahme_punkt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.punch_list.abnahme_punkt_id IS 'Verknüpfung zum Checklisten-Punkt im Abnahmeprotokoll (JSON punkt_id).';


--
-- Name: push_prefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_prefs (
    auth_user_id uuid NOT NULL,
    push_enabled boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE push_prefs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.push_prefs IS 'Master-Toggle für OS-/PWA-Push (In-App-Glocke bleibt unabhängig).';


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auth_user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    portal text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE push_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.push_subscriptions IS 'Web-Push-Endpoints (VAPID) je Gerät/Browser für eingeloggte Portal-User.';


--
-- Name: rechnungen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rechnungen (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    angebot_id uuid,
    auftrag_id uuid,
    kunde_id uuid NOT NULL,
    rechnungsnummer text,
    status text DEFAULT 'entwurf'::text NOT NULL,
    positionen jsonb DEFAULT '[]'::jsonb NOT NULL,
    lohn_netto numeric(10,2) DEFAULT 0,
    material_netto numeric(10,2) DEFAULT 0,
    netto numeric(10,2) DEFAULT 0,
    mwst_satz numeric(4,2) DEFAULT 19.00,
    mwst_betrag numeric(10,2) DEFAULT 0,
    brutto numeric(10,2) DEFAULT 0,
    leistungszeitraum_von date,
    leistungszeitraum_bis date,
    faellig_am date,
    rechnungsdatum date DEFAULT CURRENT_DATE NOT NULL,
    gesendet_at timestamp with time zone,
    bezahlt_at timestamp with time zone,
    pdf_url text,
    notizen text,
    erstellt_von uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    beleg_typ text DEFAULT 'rechnung'::text NOT NULL,
    bezug_rechnung_id uuid,
    reverse_charge_13b boolean DEFAULT false NOT NULL,
    mwst_aufschluesselung jsonb DEFAULT '[]'::jsonb NOT NULL,
    einleitung text,
    hinweise text,
    erinnerung_7_sent_at timestamp with time zone,
    erinnerung_21_sent_at timestamp with time zone,
    intern_warnung_30_at timestamp with time zone,
    rechnung_art text DEFAULT 'voll'::text NOT NULL,
    abschlag_index integer,
    zahlungsplan_abschlag_id text,
    mail_einleitung text,
    mail_betreff text,
    zahlungsbedingungen text,
    hinweis_35a boolean,
    kostentraeger text,
    lohnanteil_eur numeric(10,2),
    lohnanteil_prozent numeric(5,2),
    zahlungsziel_tage integer,
    ist_wiederkehrend boolean DEFAULT false NOT NULL,
    wiederkehr_turnus text,
    wiedervorlage_datum date,
    wiedervorlage_notiz text,
    ersetzt_durch uuid,
    korrektur_von uuid,
    korrektur_art text,
    reklamation_am date,
    reklamation_grund text,
    richtung text DEFAULT 'ausgehend'::text NOT NULL,
    handwerker_id uuid,
    angebot_handwerker_id uuid,
    ansprechpartner_id uuid,
    kunde_objekt_id uuid,
    CONSTRAINT rechnungen_korrektur_art_check CHECK (((korrektur_art IS NULL) OR (korrektur_art = ANY (ARRAY['ersetzt'::text, 'gutschrift'::text])))),
    CONSTRAINT rechnungen_richtung_check CHECK ((richtung = ANY (ARRAY['ausgehend'::text, 'eingehend'::text])))
);


--
-- Name: COLUMN rechnungen.rechnungsnummer; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.rechnungsnummer IS 'Offizielle Belegnummer (RE… / GS-RE…). Null solange Status Entwurf — Vergabe beim Versand.';


--
-- Name: COLUMN rechnungen.faellig_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.faellig_am IS 'Fälligkeitsdatum — wird im CRM-Resolver für Phase rechnung / überfällig genutzt.';


--
-- Name: COLUMN rechnungen.beleg_typ; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.beleg_typ IS 'rechnung | gutschrift';


--
-- Name: COLUMN rechnungen.bezug_rechnung_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.bezug_rechnung_id IS 'Bei Gutschrift: Referenz auf Originalrechnung';


--
-- Name: COLUMN rechnungen.einleitung; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.einleitung IS 'Fließtext nach Anrede im Rechnungs-PDF';


--
-- Name: COLUMN rechnungen.hinweise; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.hinweise IS 'Zusätzliche Absätze vor Zahlungshinweis (Rechnungs-PDF)';


--
-- Name: COLUMN rechnungen.rechnung_art; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.rechnung_art IS 'voll | abschlag | schluss';


--
-- Name: COLUMN rechnungen.zahlungsplan_abschlag_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.zahlungsplan_abschlag_id IS 'Verknüpfung zur Zeile im Auftrags-Zahlungsplan (JSON id)';


--
-- Name: COLUMN rechnungen.zahlungsbedingungen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.zahlungsbedingungen IS 'Zahlungsbedingungen auf der Rechnung (Standard-Text oder Abschlagsplan)';


--
-- Name: COLUMN rechnungen.ist_wiederkehrend; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.ist_wiederkehrend IS 'Bestand: Abrechnung zu wiederkehrendem Auftrag';


--
-- Name: COLUMN rechnungen.wiederkehr_turnus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.wiederkehr_turnus IS 'Turnus-Hinweis zur Bestands-Rechnung';


--
-- Name: COLUMN rechnungen.wiedervorlage_datum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.wiedervorlage_datum IS 'Spec Wiedervorlage Datum (Header)';


--
-- Name: COLUMN rechnungen.wiedervorlage_notiz; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.wiedervorlage_notiz IS 'Spec Wiedervorlage Notiz';


--
-- Name: COLUMN rechnungen.ersetzt_durch; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.ersetzt_durch IS 'Spec ersetztDurch';


--
-- Name: COLUMN rechnungen.korrektur_von; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.korrektur_von IS 'Spec korrekturVon';


--
-- Name: COLUMN rechnungen.korrektur_art; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.korrektur_art IS 'Spec korrekturArt: ersetzt | gutschrift';


--
-- Name: COLUMN rechnungen.reklamation_am; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.reklamation_am IS 'Spec Rate-Reklamation Datum';


--
-- Name: COLUMN rechnungen.reklamation_grund; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.reklamation_grund IS 'Spec Rate-Reklamation Grund';


--
-- Name: COLUMN rechnungen.ansprechpartner_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rechnungen.ansprechpartner_id IS 'Optionaler Ansprechpartner für Empfängeradresse, Anrede und Versand-Mail. Null = Hauptkontakt / Primär.';


--
-- Name: sammelrechnung_positionen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sammelrechnung_positionen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sammelrechnung_id uuid NOT NULL,
    objekt_abo_id uuid,
    kunde_objekt_id uuid,
    beschreibung text NOT NULL,
    netto numeric NOT NULL,
    ust_satz numeric DEFAULT 19 NOT NULL,
    lohnanteil_eur numeric DEFAULT 0 NOT NULL,
    lohnanteil_prozent numeric DEFAULT 0 NOT NULL,
    leistungszeitraum_von date,
    leistungszeitraum_bis date,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: sammelrechnungen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sammelrechnungen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kunde_id uuid NOT NULL,
    periode text NOT NULL,
    status text DEFAULT 'entwurf'::text NOT NULL,
    gesamt_netto numeric,
    pdf_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quelle text NOT NULL,
    event_typ text NOT NULL,
    severity text DEFAULT 'info'::text NOT NULL,
    details jsonb,
    resolved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: todos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.todos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titel text NOT NULL,
    beschreibung text,
    erledigt boolean DEFAULT false NOT NULL,
    erledigt_at timestamp with time zone,
    faellig_am date,
    prioritaet text DEFAULT 'normal'::text NOT NULL,
    zugewiesen_an uuid,
    kunde_id uuid,
    lead_id uuid,
    auftrag_id uuid,
    handwerker_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT todos_prioritaet_check CHECK ((prioritaet = ANY (ARRAY['niedrig'::text, 'normal'::text, 'hoch'::text])))
);


--
-- Name: TABLE todos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.todos IS 'CRM-Aufgaben: abhakbar, zuweisbar, optional verknüpft mit Kunde/Vorgang/Handwerker';


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid NOT NULL,
    name text,
    role public.user_role DEFAULT 'manager'::public.user_role NOT NULL,
    aktiv boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    telefon text,
    full_name text,
    email text,
    phone text
);


--
-- Name: COLUMN user_profiles.telefon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.telefon IS 'Handy / Direktwahl für Kunden-Kommunikation und Termin-Mails';


--
-- Name: COLUMN user_profiles.full_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.full_name IS 'Anzeigename im Kundenportal (Ansprechpartner am Auftrag).';


--
-- Name: COLUMN user_profiles.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.phone IS 'Direktdurchwahl für Kundenportal (optional).';


--
-- Name: v_auftrag_tagesspannen; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_auftrag_tagesspannen WITH (security_invoker='true') AS
 SELECT ap.auftrag_id,
    (timezone('Europe/Berlin'::text, COALESCE(ef.exif_aufnahme, ef.server_eingang)))::date AS tag,
    min(COALESCE(ef.exif_aufnahme, ef.server_eingang)) AS spanne_von,
    max(COALESCE(ef.exif_aufnahme, ef.server_eingang)) AS spanne_bis,
    (count(ef.id))::integer AS foto_count
   FROM ((public.eintrag_fotos ef
     JOIN public.position_eintraege pe ON ((pe.id = ef.eintrag_id)))
     JOIN public.auftrag_positionen ap ON ((ap.id = pe.position_id)))
  WHERE (ef.aufnahmeart = 'direkt'::text)
  GROUP BY ap.auftrag_id, ((timezone('Europe/Berlin'::text, COALESCE(ef.exif_aufnahme, ef.server_eingang)))::date);


--
-- Name: VIEW v_auftrag_tagesspannen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_auftrag_tagesspannen IS 'Dokumentierte Zeitspanne je Auftrag+Tag aus Direkt-Fotos (Plausibilisierung, kein Timer)';


--
-- Name: v_hv_kalender_events; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_hv_kalender_events AS
 SELECT n.kunde_id,
    COALESCE(n.kunde_objekt_id, l.kunde_objekt_id) AS kunde_objekt_id,
    (n.wiedervorlage_am)::timestamp with time zone AS event_beginn,
    NULL::timestamp with time zone AS event_ende,
    'wiedervorlage'::text AS event_typ,
    "left"(n.text, 80) AS titel,
    n.id AS quelle_id
   FROM (public.akten_notizen n
     LEFT JOIN public.leads l ON ((l.id = n.lead_id)))
  WHERE ((n.erledigt_am IS NULL) AND (n.wiedervorlage_am IS NOT NULL))
UNION ALL
 SELECT o.kunde_id,
    p.kunde_objekt_id,
    (p.naechste_faellig)::timestamp with time zone AS event_beginn,
    NULL::timestamp with time zone AS event_ende,
    'pruefpflicht'::text AS event_typ,
    p.typ AS titel,
    p.id AS quelle_id
   FROM (public.objekt_pruefpflichten p
     JOIN public.kunden_objekte o ON ((o.id = p.kunde_objekt_id)))
  WHERE ((p.status = 'aktiv'::text) AND (p.naechste_faellig IS NOT NULL))
UNION ALL
 SELECT d.kunde_id,
    d.kunde_objekt_id,
    ((d.ablauf_datum - ((t.tag || ' days'::text))::interval))::timestamp with time zone AS event_beginn,
    NULL::timestamp with time zone AS event_ende,
    'dokument_erinnerung'::text AS event_typ,
    (((d.titel || ' ('::text) || t.tag) || ' Tage)'::text) AS titel,
    d.id AS quelle_id
   FROM (public.objekt_dokumente d
     CROSS JOIN LATERAL ( SELECT unnest(d.erinnerung_tage) AS tag) t)
  WHERE ((d.status = 'aktiv'::text) AND (d.ablauf_datum IS NOT NULL))
UNION ALL
 SELECT a.kunde_id,
    a.kunde_objekt_id,
    (a.start_am)::timestamp with time zone AS event_beginn,
    NULL::timestamp with time zone AS event_ende,
    'abo_start'::text AS event_typ,
    a.produkt_slug AS titel,
    a.id AS quelle_id
   FROM public.objekt_abos a
  WHERE (a.status = ANY (ARRAY['aktiv'::text, 'gekuendigt'::text]))
UNION ALL
 SELECT a.kunde_id,
    a.kunde_objekt_id,
    (a.end_am)::timestamp with time zone AS event_beginn,
    NULL::timestamp with time zone AS event_ende,
    'abo_ende'::text AS event_typ,
    a.produkt_slug AS titel,
    a.id AS quelle_id
   FROM public.objekt_abos a
  WHERE (a.end_am IS NOT NULL);


--
-- Name: v_objekt_kosten; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_objekt_kosten AS
 SELECT r.kunde_id,
    COALESCE(l.kunde_objekt_id, ab.kunde_objekt_id) AS kunde_objekt_id,
    (date_trunc('year'::text, COALESCE((r.rechnungsdatum)::timestamp with time zone, r.created_at)))::date AS jahr,
    sum(r.brutto) AS brutto_gesamt,
    sum(COALESCE(r.lohnanteil_eur, (0)::numeric)) AS lohnanteil_gesamt,
    r.kostentraeger,
    (count(*))::integer AS anzahl_rechnungen
   FROM (((public.rechnungen r
     LEFT JOIN public.auftraege a ON ((a.id = r.auftrag_id)))
     LEFT JOIN public.leads l ON ((l.id = a.lead_id)))
     LEFT JOIN public.angebote ab ON ((ab.id = a.angebot_id)))
  WHERE (r.status IS DISTINCT FROM 'storniert'::text)
  GROUP BY r.kunde_id, COALESCE(l.kunde_objekt_id, ab.kunde_objekt_id), (date_trunc('year'::text, COALESCE((r.rechnungsdatum)::timestamp with time zone, r.created_at))), r.kostentraeger;


--
-- Name: vor_baubeginn_protokolle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vor_baubeginn_protokolle (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    auftrag_id uuid NOT NULL,
    erstellt_von uuid,
    adresse text,
    datum date DEFAULT CURRENT_DATE NOT NULL,
    bereiche_dokumentiert text[],
    vorhandene_schaeden text,
    besonderheiten text,
    foto_urls text[],
    kunde_informiert boolean DEFAULT false,
    abgeschlossen boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vorab_formulare; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vorab_formulare (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    lead_id uuid NOT NULL,
    ausgefuellt_von uuid,
    vor_ort_datum date,
    adresse text,
    zugang text,
    daten jsonb DEFAULT '{}'::jsonb NOT NULL,
    foto_urls text[],
    notizen text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vorgang_kommentare; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vorgang_kommentare (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    kunde_id uuid,
    actor_rolle text NOT NULL,
    actor_name text,
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
)
PARTITION BY RANGE (inserted_at);


--
-- Name: messages_2026_04_16; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_04_16 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
);


--
-- Name: messages_2026_04_17; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_04_17 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
);


--
-- Name: messages_2026_04_18; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_04_18 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
);


--
-- Name: messages_2026_04_19; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_04_19 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
);


--
-- Name: messages_2026_04_20; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_04_20 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
);


--
-- Name: messages_2026_04_21; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_04_21 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
);


--
-- Name: messages_2026_04_22; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_04_22 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    selected_columns text[],
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL,
    versioning_status text DEFAULT 'DISABLED'::text NOT NULL,
    CONSTRAINT buckets_versioning_dark_check CHECK ((versioning_status = 'DISABLED'::text)),
    CONSTRAINT buckets_versioning_standard_only_check CHECK (((type = 'STANDARD'::storage.buckettype) OR (versioning_status = 'DISABLED'::text))),
    CONSTRAINT buckets_versioning_status_check CHECK ((versioning_status = ANY (ARRAY['DISABLED'::text, 'ENABLED'::text, 'SUSPENDED'::text])))
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    archived_at timestamp with time zone,
    is_delete_marker boolean DEFAULT false NOT NULL,
    is_versioned boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text,
    rollback text[]
);


--
-- Name: messages_2026_04_16; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_16 FOR VALUES FROM ('2026-04-16 00:00:00') TO ('2026-04-17 00:00:00');


--
-- Name: messages_2026_04_17; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_17 FOR VALUES FROM ('2026-04-17 00:00:00') TO ('2026-04-18 00:00:00');


--
-- Name: messages_2026_04_18; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_18 FOR VALUES FROM ('2026-04-18 00:00:00') TO ('2026-04-19 00:00:00');


--
-- Name: messages_2026_04_19; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_19 FOR VALUES FROM ('2026-04-19 00:00:00') TO ('2026-04-20 00:00:00');


--
-- Name: messages_2026_04_20; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_20 FOR VALUES FROM ('2026-04-20 00:00:00') TO ('2026-04-21 00:00:00');


--
-- Name: messages_2026_04_21; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_21 FOR VALUES FROM ('2026-04-21 00:00:00') TO ('2026-04-22 00:00:00');


--
-- Name: messages_2026_04_22; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_22 FOR VALUES FROM ('2026-04-22 00:00:00') TO ('2026-04-23 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: abnahmeprotokoll abnahmeprotokoll_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abnahmeprotokoll
    ADD CONSTRAINT abnahmeprotokoll_pkey PRIMARY KEY (id);


--
-- Name: akten_notizen akten_notizen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.akten_notizen
    ADD CONSTRAINT akten_notizen_pkey PRIMARY KEY (id);


--
-- Name: angebot_handwerker angebot_handwerker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebot_handwerker
    ADD CONSTRAINT angebot_handwerker_pkey PRIMARY KEY (id);


--
-- Name: angebot_ki_beispiele angebot_ki_beispiele_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebot_ki_beispiele
    ADD CONSTRAINT angebot_ki_beispiele_pkey PRIMARY KEY (id);


--
-- Name: angebot_vorlagen angebot_vorlagen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebot_vorlagen
    ADD CONSTRAINT angebot_vorlagen_pkey PRIMARY KEY (id);


--
-- Name: angebote angebote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebote
    ADD CONSTRAINT angebote_pkey PRIMARY KEY (id);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: auftraege auftraege_kunden_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftraege
    ADD CONSTRAINT auftraege_kunden_token_key UNIQUE (kunden_token);


--
-- Name: auftraege auftraege_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftraege
    ADD CONSTRAINT auftraege_pkey PRIMARY KEY (id);


--
-- Name: auftrag_abnahmeprotokolle auftrag_abnahmeprotokolle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_abnahmeprotokolle
    ADD CONSTRAINT auftrag_abnahmeprotokolle_pkey PRIMARY KEY (id);


--
-- Name: auftrag_baustellen_dokumente auftrag_baustellen_dokumente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_baustellen_dokumente
    ADD CONSTRAINT auftrag_baustellen_dokumente_pkey PRIMARY KEY (id);


--
-- Name: auftrag_bautagebuch_eintraege auftrag_bautagebuch_eintraege_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_bautagebuch_eintraege
    ADD CONSTRAINT auftrag_bautagebuch_eintraege_pkey PRIMARY KEY (id);


--
-- Name: auftrag_bautagesberichte auftrag_bautagesberichte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_bautagesberichte
    ADD CONSTRAINT auftrag_bautagesberichte_pkey PRIMARY KEY (id);


--
-- Name: auftrag_fachdoku_slots auftrag_fachdoku_slots_auftrag_id_slot_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_fachdoku_slots
    ADD CONSTRAINT auftrag_fachdoku_slots_auftrag_id_slot_code_key UNIQUE (auftrag_id, slot_code);


--
-- Name: auftrag_fachdoku_slots auftrag_fachdoku_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_fachdoku_slots
    ADD CONSTRAINT auftrag_fachdoku_slots_pkey PRIMARY KEY (id);


--
-- Name: auftrag_handwerker auftrag_handwerker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_handwerker
    ADD CONSTRAINT auftrag_handwerker_pkey PRIMARY KEY (id);


--
-- Name: auftrag_milestones auftrag_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_milestones
    ADD CONSTRAINT auftrag_milestones_pkey PRIMARY KEY (id);


--
-- Name: auftrag_position_notizen auftrag_position_notizen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_position_notizen
    ADD CONSTRAINT auftrag_position_notizen_pkey PRIMARY KEY (id);


--
-- Name: auftrag_positionen auftrag_positionen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_positionen
    ADD CONSTRAINT auftrag_positionen_pkey PRIMARY KEY (id);


--
-- Name: auftrag_regiearbeiten auftrag_regiearbeiten_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_regiearbeiten
    ADD CONSTRAINT auftrag_regiearbeiten_pkey PRIMARY KEY (id);


--
-- Name: auftrag_rueckfragen auftrag_rueckfragen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_rueckfragen
    ADD CONSTRAINT auftrag_rueckfragen_pkey PRIMARY KEY (id);


--
-- Name: auftrag_terminslots auftrag_terminslots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_terminslots
    ADD CONSTRAINT auftrag_terminslots_pkey PRIMARY KEY (id);


--
-- Name: auftrag_timeline auftrag_timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_timeline
    ADD CONSTRAINT auftrag_timeline_pkey PRIMARY KEY (id);


--
-- Name: auftrag_wochenberichte auftrag_wochenberichte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_wochenberichte
    ADD CONSTRAINT auftrag_wochenberichte_pkey PRIMARY KEY (id);


--
-- Name: auftrag_zahlungsplaene auftrag_zahlungsplaene_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_zahlungsplaene
    ADD CONSTRAINT auftrag_zahlungsplaene_pkey PRIMARY KEY (id);


--
-- Name: auftrag_zahlungsplan_positionen auftrag_zahlungsplan_positionen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_zahlungsplan_positionen
    ADD CONSTRAINT auftrag_zahlungsplan_positionen_pkey PRIMARY KEY (id);


--
-- Name: baustopps baustopps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baustopps
    ADD CONSTRAINT baustopps_pkey PRIMARY KEY (id);


--
-- Name: bautagebuch bautagebuch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bautagebuch
    ADD CONSTRAINT bautagebuch_pkey PRIMARY KEY (id);


--
-- Name: buergschaften buergschaften_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buergschaften
    ADD CONSTRAINT buergschaften_pkey PRIMARY KEY (id);


--
-- Name: compliance_dokument_typen compliance_dokument_typen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_dokument_typen
    ADD CONSTRAINT compliance_dokument_typen_pkey PRIMARY KEY (id);


--
-- Name: compliance_dokument_typen compliance_dokument_typen_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_dokument_typen
    ADD CONSTRAINT compliance_dokument_typen_slug_key UNIQUE (slug);


--
-- Name: copilot_alerts copilot_alerts_alert_type_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_alerts
    ADD CONSTRAINT copilot_alerts_alert_type_entity_type_entity_id_key UNIQUE (alert_type, entity_type, entity_id);


--
-- Name: copilot_alerts copilot_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_alerts
    ADD CONSTRAINT copilot_alerts_pkey PRIMARY KEY (id);


--
-- Name: copilot_messages copilot_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copilot_messages
    ADD CONSTRAINT copilot_messages_pkey PRIMARY KEY (id);


--
-- Name: crm_impersonation_tokens crm_impersonation_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_impersonation_tokens
    ADD CONSTRAINT crm_impersonation_tokens_pkey PRIMARY KEY (jti);


--
-- Name: crm_notification_reads crm_notification_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_notification_reads
    ADD CONSTRAINT crm_notification_reads_pkey PRIMARY KEY (user_id, source_key);


--
-- Name: crm_push_prefs crm_push_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_push_prefs
    ADD CONSTRAINT crm_push_prefs_pkey PRIMARY KEY (user_id);


--
-- Name: crm_push_subscriptions crm_push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_push_subscriptions
    ADD CONSTRAINT crm_push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: crm_push_subscriptions crm_push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_push_subscriptions
    ADD CONSTRAINT crm_push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: custom_field_definitions custom_field_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_field_definitions
    ADD CONSTRAINT custom_field_definitions_pkey PRIMARY KEY (id);


--
-- Name: custom_field_values custom_field_values_definition_id_objekt_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_field_values
    ADD CONSTRAINT custom_field_values_definition_id_objekt_id_key UNIQUE (definition_id, objekt_id);


--
-- Name: custom_field_values custom_field_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_field_values
    ADD CONSTRAINT custom_field_values_pkey PRIMARY KEY (id);


--
-- Name: datenschutz_anfragen datenschutz_anfragen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datenschutz_anfragen
    ADD CONSTRAINT datenschutz_anfragen_pkey PRIMARY KEY (id);


--
-- Name: datenschutz_fristen datenschutz_fristen_kategorie_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datenschutz_fristen
    ADD CONSTRAINT datenschutz_fristen_kategorie_key UNIQUE (kategorie);


--
-- Name: datenschutz_fristen datenschutz_fristen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datenschutz_fristen
    ADD CONSTRAINT datenschutz_fristen_pkey PRIMARY KEY (id);


--
-- Name: datenschutz_loeschlog datenschutz_loeschlog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datenschutz_loeschlog
    ADD CONSTRAINT datenschutz_loeschlog_pkey PRIMARY KEY (id);


--
-- Name: datenschutz_vvt datenschutz_vvt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datenschutz_vvt
    ADD CONSTRAINT datenschutz_vvt_pkey PRIMARY KEY (id);


--
-- Name: datenschutz_vvt datenschutz_vvt_titel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datenschutz_vvt
    ADD CONSTRAINT datenschutz_vvt_titel_key UNIQUE (titel);


--
-- Name: eigentuemer_objekte eigentuemer_objekte_kunde_id_kunde_objekt_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eigentuemer_objekte
    ADD CONSTRAINT eigentuemer_objekte_kunde_id_kunde_objekt_id_key UNIQUE (kunde_id, kunde_objekt_id);


--
-- Name: eigentuemer_objekte eigentuemer_objekte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eigentuemer_objekte
    ADD CONSTRAINT eigentuemer_objekte_pkey PRIMARY KEY (id);


--
-- Name: einbehalte einbehalte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.einbehalte
    ADD CONSTRAINT einbehalte_pkey PRIMARY KEY (id);


--
-- Name: eingangsrechnungen eingangsrechnungen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eingangsrechnungen
    ADD CONSTRAINT eingangsrechnungen_pkey PRIMARY KEY (id);


--
-- Name: einheit_bewohner einheit_bewohner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.einheit_bewohner
    ADD CONSTRAINT einheit_bewohner_pkey PRIMARY KEY (id);


--
-- Name: einstellungen einstellungen_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.einstellungen
    ADD CONSTRAINT einstellungen_key_key UNIQUE (key);


--
-- Name: einstellungen einstellungen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.einstellungen
    ADD CONSTRAINT einstellungen_pkey PRIMARY KEY (id);


--
-- Name: eintrag_fotos eintrag_fotos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eintrag_fotos
    ADD CONSTRAINT eintrag_fotos_pkey PRIMARY KEY (id);


--
-- Name: email_log email_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: formular_eintraege formular_eintraege_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formular_eintraege
    ADD CONSTRAINT formular_eintraege_pkey PRIMARY KEY (id);


--
-- Name: formular_eintraege formular_eintraege_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formular_eintraege
    ADD CONSTRAINT formular_eintraege_token_key UNIQUE (token);


--
-- Name: formular_templates formular_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formular_templates
    ADD CONSTRAINT formular_templates_pkey PRIMARY KEY (id);


--
-- Name: fremd_vorgaenge fremd_vorgaenge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fremd_vorgaenge
    ADD CONSTRAINT fremd_vorgaenge_pkey PRIMARY KEY (id);


--
-- Name: funnel_portal_otp funnel_portal_otp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funnel_portal_otp
    ADD CONSTRAINT funnel_portal_otp_pkey PRIMARY KEY (email);


--
-- Name: gewaehrleistungen gewaehrleistungen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gewaehrleistungen
    ADD CONSTRAINT gewaehrleistungen_pkey PRIMARY KEY (id);


--
-- Name: gewerke gewerke_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gewerke
    ADD CONSTRAINT gewerke_pkey PRIMARY KEY (id);


--
-- Name: gewerke gewerke_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gewerke
    ADD CONSTRAINT gewerke_slug_key UNIQUE (slug);


--
-- Name: gpt_raum_sessions gpt_raum_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpt_raum_sessions
    ADD CONSTRAINT gpt_raum_sessions_pkey PRIMARY KEY (id);


--
-- Name: handwerker_bewertungen handwerker_bewertungen_handwerker_id_auftrag_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker_bewertungen
    ADD CONSTRAINT handwerker_bewertungen_handwerker_id_auftrag_id_key UNIQUE (handwerker_id, auftrag_id);


--
-- Name: handwerker_bewertungen handwerker_bewertungen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker_bewertungen
    ADD CONSTRAINT handwerker_bewertungen_pkey PRIMARY KEY (id);


--
-- Name: handwerker handwerker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker
    ADD CONSTRAINT handwerker_pkey PRIMARY KEY (id);


--
-- Name: handwerker_vertraege handwerker_vertraege_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker_vertraege
    ADD CONSTRAINT handwerker_vertraege_pkey PRIMARY KEY (id);


--
-- Name: handwerker_vertraege handwerker_vertraege_vertrags_nr_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker_vertraege
    ADD CONSTRAINT handwerker_vertraege_vertrags_nr_key UNIQUE (vertrags_nr);


--
-- Name: hausmeister_objekte hausmeister_objekte_kunde_objekt_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hausmeister_objekte
    ADD CONSTRAINT hausmeister_objekte_kunde_objekt_id_key UNIQUE (kunde_objekt_id);


--
-- Name: hausmeister_objekte hausmeister_objekte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hausmeister_objekte
    ADD CONSTRAINT hausmeister_objekte_pkey PRIMARY KEY (id);


--
-- Name: hv_calendar_feeds hv_calendar_feeds_kunde_id_auth_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hv_calendar_feeds
    ADD CONSTRAINT hv_calendar_feeds_kunde_id_auth_user_id_key UNIQUE (kunde_id, auth_user_id);


--
-- Name: hv_calendar_feeds hv_calendar_feeds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hv_calendar_feeds
    ADD CONSTRAINT hv_calendar_feeds_pkey PRIMARY KEY (id);


--
-- Name: hv_notification_prefs hv_notification_prefs_kunde_id_auth_user_id_kategorie_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hv_notification_prefs
    ADD CONSTRAINT hv_notification_prefs_kunde_id_auth_user_id_kategorie_key UNIQUE (kunde_id, auth_user_id, kategorie);


--
-- Name: hv_notification_prefs hv_notification_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hv_notification_prefs
    ADD CONSTRAINT hv_notification_prefs_pkey PRIMARY KEY (id);


--
-- Name: hv_notifications hv_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hv_notifications
    ADD CONSTRAINT hv_notifications_pkey PRIMARY KEY (id);


--
-- Name: hv_portal_abnahmen hv_portal_abnahmen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hv_portal_abnahmen
    ADD CONSTRAINT hv_portal_abnahmen_pkey PRIMARY KEY (id);


--
-- Name: hw_formular_einreichungen hw_formular_einreichungen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_formular_einreichungen
    ADD CONSTRAINT hw_formular_einreichungen_pkey PRIMARY KEY (id);


--
-- Name: hw_formular_einreichungen hw_formular_einreichungen_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_formular_einreichungen
    ADD CONSTRAINT hw_formular_einreichungen_token_key UNIQUE (token);


--
-- Name: hw_formular_tabs hw_formular_tabs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_formular_tabs
    ADD CONSTRAINT hw_formular_tabs_pkey PRIMARY KEY (id);


--
-- Name: kalender_termine kalender_termine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kalender_termine
    ADD CONSTRAINT kalender_termine_pkey PRIMARY KEY (id);


--
-- Name: katalog_lernsignale katalog_lernsignale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.katalog_lernsignale
    ADD CONSTRAINT katalog_lernsignale_pkey PRIMARY KEY (id);


--
-- Name: katalog_positionen katalog_positionen_gewerk_id_titel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.katalog_positionen
    ADD CONSTRAINT katalog_positionen_gewerk_id_titel_key UNIQUE (gewerk_id, titel);


--
-- Name: katalog_positionen katalog_positionen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.katalog_positionen
    ADD CONSTRAINT katalog_positionen_pkey PRIMARY KEY (id);


--
-- Name: katalog_preise katalog_preise_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.katalog_preise
    ADD CONSTRAINT katalog_preise_pkey PRIMARY KEY (id);


--
-- Name: katalog_produkte katalog_produkte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.katalog_produkte
    ADD CONSTRAINT katalog_produkte_pkey PRIMARY KEY (slug);


--
-- Name: katalog_varianten katalog_varianten_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.katalog_varianten
    ADD CONSTRAINT katalog_varianten_pkey PRIMARY KEY (id);


--
-- Name: katalog_varianten katalog_varianten_position_id_variante_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.katalog_varianten
    ADD CONSTRAINT katalog_varianten_position_id_variante_key UNIQUE (position_id, variante);


--
-- Name: ki_anfragen_log ki_anfragen_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_anfragen_log
    ADD CONSTRAINT ki_anfragen_log_pkey PRIMARY KEY (id);


--
-- Name: ki_cluster_analysen ki_cluster_analysen_bereich_analyse_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_cluster_analysen
    ADD CONSTRAINT ki_cluster_analysen_bereich_analyse_key_key UNIQUE (bereich, analyse_key);


--
-- Name: ki_cluster_analysen ki_cluster_analysen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_cluster_analysen
    ADD CONSTRAINT ki_cluster_analysen_pkey PRIMARY KEY (id);


--
-- Name: ki_content ki_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_content
    ADD CONSTRAINT ki_content_pkey PRIMARY KEY (id);


--
-- Name: ki_empfehlungen ki_empfehlungen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_empfehlungen
    ADD CONSTRAINT ki_empfehlungen_pkey PRIMARY KEY (id);


--
-- Name: ki_historische_positionen ki_historische_positionen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_historische_positionen
    ADD CONSTRAINT ki_historische_positionen_pkey PRIMARY KEY (id);


--
-- Name: ki_historische_vorgaenge ki_historische_vorgaenge_dokument_nr_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_historische_vorgaenge
    ADD CONSTRAINT ki_historische_vorgaenge_dokument_nr_key UNIQUE (dokument_nr);


--
-- Name: ki_historische_vorgaenge ki_historische_vorgaenge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_historische_vorgaenge
    ADD CONSTRAINT ki_historische_vorgaenge_pkey PRIMARY KEY (id);


--
-- Name: ki_produkt_katalog ki_produkt_katalog_hauptmodul_untermodul_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_produkt_katalog
    ADD CONSTRAINT ki_produkt_katalog_hauptmodul_untermodul_key UNIQUE (hauptmodul, untermodul);


--
-- Name: ki_produkt_katalog ki_produkt_katalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_produkt_katalog
    ADD CONSTRAINT ki_produkt_katalog_pkey PRIMARY KEY (id);


--
-- Name: ki_visualisierungen ki_visualisierungen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_visualisierungen
    ADD CONSTRAINT ki_visualisierungen_pkey PRIMARY KEY (id);


--
-- Name: kunden_ansprechpartner kunden_ansprechpartner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden_ansprechpartner
    ADD CONSTRAINT kunden_ansprechpartner_pkey PRIMARY KEY (id);


--
-- Name: kunden_dokumente kunden_dokumente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden_dokumente
    ADD CONSTRAINT kunden_dokumente_pkey PRIMARY KEY (id);


--
-- Name: kunden_mitglieder kunden_mitglieder_kunde_id_auth_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden_mitglieder
    ADD CONSTRAINT kunden_mitglieder_kunde_id_auth_user_id_key UNIQUE (kunde_id, auth_user_id);


--
-- Name: kunden_mitglieder kunden_mitglieder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden_mitglieder
    ADD CONSTRAINT kunden_mitglieder_pkey PRIMARY KEY (id);


--
-- Name: kunden_notizen kunden_notizen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden_notizen
    ADD CONSTRAINT kunden_notizen_pkey PRIMARY KEY (id);


--
-- Name: kunden_objekte kunden_objekte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden_objekte
    ADD CONSTRAINT kunden_objekte_pkey PRIMARY KEY (id);


--
-- Name: kunden kunden_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden
    ADD CONSTRAINT kunden_pkey PRIMARY KEY (id);


--
-- Name: lead_befund_punkte lead_befund_punkte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_befund_punkte
    ADD CONSTRAINT lead_befund_punkte_pkey PRIMARY KEY (id);


--
-- Name: lead_befunde lead_befunde_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_befunde
    ADD CONSTRAINT lead_befunde_pkey PRIMARY KEY (id);


--
-- Name: lead_notizen lead_notizen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_notizen
    ADD CONSTRAINT lead_notizen_pkey PRIMARY KEY (id);


--
-- Name: lead_timeline lead_timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_timeline
    ADD CONSTRAINT lead_timeline_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: leads_status_history leads_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads_status_history
    ADD CONSTRAINT leads_status_history_pkey PRIMARY KEY (id);


--
-- Name: marketing_metrics marketing_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_metrics
    ADD CONSTRAINT marketing_metrics_pkey PRIMARY KEY (id);


--
-- Name: mieter_feedback mieter_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mieter_feedback
    ADD CONSTRAINT mieter_feedback_pkey PRIMARY KEY (id);


--
-- Name: nachtraege nachtraege_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nachtraege
    ADD CONSTRAINT nachtraege_pkey PRIMARY KEY (id);


--
-- Name: nachtraege nachtraege_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nachtraege
    ADD CONSTRAINT nachtraege_token_key UNIQUE (token);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: objekt_abos objekt_abos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objekt_abos
    ADD CONSTRAINT objekt_abos_pkey PRIMARY KEY (id);


--
-- Name: objekt_dokumente objekt_dokumente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objekt_dokumente
    ADD CONSTRAINT objekt_dokumente_pkey PRIMARY KEY (id);


--
-- Name: objekt_einheiten objekt_einheiten_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objekt_einheiten
    ADD CONSTRAINT objekt_einheiten_pkey PRIMARY KEY (id);


--
-- Name: objekt_kontakte objekt_kontakte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objekt_kontakte
    ADD CONSTRAINT objekt_kontakte_pkey PRIMARY KEY (id);


--
-- Name: objekt_pruefpflichten objekt_pruefpflichten_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objekt_pruefpflichten
    ADD CONSTRAINT objekt_pruefpflichten_pkey PRIMARY KEY (id);


--
-- Name: org_freigabe_log org_freigabe_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_freigabe_log
    ADD CONSTRAINT org_freigabe_log_pkey PRIMARY KEY (id);


--
-- Name: org_hausmeister org_hausmeister_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_hausmeister
    ADD CONSTRAINT org_hausmeister_pkey PRIMARY KEY (id);


--
-- Name: partner_bautagebuch_anfragen partner_bautagebuch_anfragen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_bautagebuch_anfragen
    ADD CONSTRAINT partner_bautagebuch_anfragen_pkey PRIMARY KEY (id);


--
-- Name: partner_dokumente partner_dokumente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_dokumente
    ADD CONSTRAINT partner_dokumente_pkey PRIMARY KEY (id);


--
-- Name: partner_handwerker_migration partner_handwerker_migration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_handwerker_migration
    ADD CONSTRAINT partner_handwerker_migration_pkey PRIMARY KEY (partner_id);


--
-- Name: partner_kategorien partner_kategorien_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_kategorien
    ADD CONSTRAINT partner_kategorien_pkey PRIMARY KEY (id);


--
-- Name: partner_kategorien partner_kategorien_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_kategorien
    ADD CONSTRAINT partner_kategorien_slug_key UNIQUE (slug);


--
-- Name: partner partner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_pkey PRIMARY KEY (id);


--
-- Name: partner_positions_anfragen partner_positions_anfragen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_positions_anfragen
    ADD CONSTRAINT partner_positions_anfragen_pkey PRIMARY KEY (id);


--
-- Name: partner_todos partner_todos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_todos
    ADD CONSTRAINT partner_todos_pkey PRIMARY KEY (id);


--
-- Name: portal_einladungen portal_einladungen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_einladungen
    ADD CONSTRAINT portal_einladungen_pkey PRIMARY KEY (id);


--
-- Name: portal_notifications portal_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_notifications
    ADD CONSTRAINT portal_notifications_pkey PRIMARY KEY (id);


--
-- Name: position_eintraege position_eintraege_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_eintraege
    ADD CONSTRAINT position_eintraege_pkey PRIMARY KEY (id);


--
-- Name: position_material position_material_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_material
    ADD CONSTRAINT position_material_pkey PRIMARY KEY (id);


--
-- Name: preislisten preislisten_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preislisten
    ADD CONSTRAINT preislisten_pkey PRIMARY KEY (id);


--
-- Name: punch_list punch_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.punch_list
    ADD CONSTRAINT punch_list_pkey PRIMARY KEY (id);


--
-- Name: push_prefs push_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_prefs
    ADD CONSTRAINT push_prefs_pkey PRIMARY KEY (auth_user_id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: rechnungen rechnungen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rechnungen
    ADD CONSTRAINT rechnungen_pkey PRIMARY KEY (id);


--
-- Name: rechnungen rechnungen_rechnungsnummer_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rechnungen
    ADD CONSTRAINT rechnungen_rechnungsnummer_key UNIQUE (rechnungsnummer);


--
-- Name: sammelrechnung_positionen sammelrechnung_positionen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sammelrechnung_positionen
    ADD CONSTRAINT sammelrechnung_positionen_pkey PRIMARY KEY (id);


--
-- Name: sammelrechnungen sammelrechnungen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sammelrechnungen
    ADD CONSTRAINT sammelrechnungen_pkey PRIMARY KEY (id);


--
-- Name: system_events system_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_events
    ADD CONSTRAINT system_events_pkey PRIMARY KEY (id);


--
-- Name: todos todos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: vor_baubeginn_protokolle vor_baubeginn_protokolle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vor_baubeginn_protokolle
    ADD CONSTRAINT vor_baubeginn_protokolle_pkey PRIMARY KEY (id);


--
-- Name: vorab_formulare vorab_formulare_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vorab_formulare
    ADD CONSTRAINT vorab_formulare_pkey PRIMARY KEY (id);


--
-- Name: vorgang_kommentare vorgang_kommentare_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vorgang_kommentare
    ADD CONSTRAINT vorgang_kommentare_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_04_16 messages_2026_04_16_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_04_16
    ADD CONSTRAINT messages_2026_04_16_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_04_17 messages_2026_04_17_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_04_17
    ADD CONSTRAINT messages_2026_04_17_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_04_18 messages_2026_04_18_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_04_18
    ADD CONSTRAINT messages_2026_04_18_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_04_19 messages_2026_04_19_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_04_19
    ADD CONSTRAINT messages_2026_04_19_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_04_20 messages_2026_04_20_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_04_20
    ADD CONSTRAINT messages_2026_04_20_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_04_21 messages_2026_04_21_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_04_21
    ADD CONSTRAINT messages_2026_04_21_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_04_22 messages_2026_04_22_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_04_22
    ADD CONSTRAINT messages_2026_04_22_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages messages_payload_exclusive; Type: CHECK CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages
    ADD CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL))) NOT VALID;


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: idx_users_created_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_email ON auth.users USING btree (email);


--
-- Name: idx_users_last_sign_in_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC);


--
-- Name: idx_users_name; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: akten_notizen_lead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX akten_notizen_lead_idx ON public.akten_notizen USING btree (lead_id, created_at DESC);


--
-- Name: akten_notizen_objekt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX akten_notizen_objekt_idx ON public.akten_notizen USING btree (kunde_objekt_id, created_at DESC);


--
-- Name: akten_notizen_wiedervorlage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX akten_notizen_wiedervorlage_idx ON public.akten_notizen USING btree (kunde_id, wiedervorlage_am) WHERE ((erledigt_am IS NULL) AND (wiedervorlage_am IS NOT NULL));


--
-- Name: angebot_handwerker_hw_rechnung_eingang_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX angebot_handwerker_hw_rechnung_eingang_idx ON public.angebot_handwerker USING btree (hw_rechnung_eingereicht_at DESC NULLS LAST) WHERE (hw_rechnung_pdf_url IS NOT NULL);


--
-- Name: angebot_handwerker_token_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX angebot_handwerker_token_unique ON public.angebot_handwerker USING btree (token) WHERE (token IS NOT NULL);


--
-- Name: angebote_ersetzt_durch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX angebote_ersetzt_durch_idx ON public.angebote USING btree (ersetzt_durch) WHERE (ersetzt_durch IS NOT NULL);


--
-- Name: angebote_herkunft_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX angebote_herkunft_idx ON public.angebote USING btree (herkunft) WHERE (herkunft IS NOT NULL);


--
-- Name: angebote_korrektur_von_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX angebote_korrektur_von_idx ON public.angebote USING btree (korrektur_von) WHERE (korrektur_von IS NOT NULL);


--
-- Name: angebote_lead_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX angebote_lead_id_idx ON public.angebote USING btree (lead_id);


--
-- Name: angebote_lead_partner_einholung_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX angebote_lead_partner_einholung_idx ON public.angebote USING btree (lead_id) WHERE ist_partner_einholung;


--
-- Name: angebote_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX angebote_status_idx ON public.angebote USING btree (status);


--
-- Name: audit_events_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_events_entity_idx ON public.audit_events USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: audit_events_kunde_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_events_kunde_idx ON public.audit_events USING btree (kunde_id, created_at DESC) WHERE (kunde_id IS NOT NULL);


--
-- Name: auftraege_betreuer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftraege_betreuer_id_idx ON public.auftraege USING btree (betreuer_id) WHERE (betreuer_id IS NOT NULL);


--
-- Name: auftraege_ist_wiederkehrend_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftraege_ist_wiederkehrend_idx ON public.auftraege USING btree (ist_wiederkehrend) WHERE (ist_wiederkehrend = true);


--
-- Name: auftraege_lead_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftraege_lead_id_idx ON public.auftraege USING btree (lead_id);


--
-- Name: auftraege_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftraege_status_idx ON public.auftraege USING btree (status);


--
-- Name: auftrag_abnahmeprotokolle_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_abnahmeprotokolle_auftrag_idx ON public.auftrag_abnahmeprotokolle USING btree (auftrag_id, created_at DESC);


--
-- Name: auftrag_abnahmeprotokolle_hw_freigabe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_abnahmeprotokolle_hw_freigabe_idx ON public.auftrag_abnahmeprotokolle USING btree (auftrag_id, handwerker_id, freigabe_status);


--
-- Name: auftrag_abnahmeprotokolle_zur_freigabe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_abnahmeprotokolle_zur_freigabe_idx ON public.auftrag_abnahmeprotokolle USING btree (freigabe_status, updated_at DESC) WHERE (freigabe_status = 'zur_freigabe'::text);


--
-- Name: auftrag_baustellen_dokumente_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_baustellen_dokumente_auftrag_idx ON public.auftrag_baustellen_dokumente USING btree (auftrag_id, created_at DESC);


--
-- Name: auftrag_bautagebuch_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_bautagebuch_auftrag_idx ON public.auftrag_bautagebuch_eintraege USING btree (auftrag_id, datum DESC, sort_order);


--
-- Name: auftrag_bautagebuch_befund_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_bautagebuch_befund_idx ON public.auftrag_bautagebuch_eintraege USING btree (auftrag_id) WHERE (eintrag_typ = 'befund'::text);


--
-- Name: auftrag_bautagebuch_handwerker_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_bautagebuch_handwerker_idx ON public.auftrag_bautagebuch_eintraege USING btree (handwerker_id) WHERE (handwerker_id IS NOT NULL);


--
-- Name: auftrag_bautagesberichte_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_bautagesberichte_auftrag_idx ON public.auftrag_bautagesberichte USING btree (auftrag_id, datum DESC, tag_nummer DESC);


--
-- Name: auftrag_bautagesberichte_tag_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX auftrag_bautagesberichte_tag_uq ON public.auftrag_bautagesberichte USING btree (auftrag_id, tag_nummer);


--
-- Name: auftrag_fachdoku_slots_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_fachdoku_slots_auftrag_idx ON public.auftrag_fachdoku_slots USING btree (auftrag_id);


--
-- Name: auftrag_fachdoku_slots_offen_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_fachdoku_slots_offen_idx ON public.auftrag_fachdoku_slots USING btree (auftrag_id) WHERE (status = 'offen'::text);


--
-- Name: auftrag_pos_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_pos_idx ON public.auftrag_positionen USING btree (auftrag_id);


--
-- Name: auftrag_pos_notiz_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_pos_notiz_idx ON public.auftrag_position_notizen USING btree (position_id);


--
-- Name: auftrag_regiearbeiten_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_regiearbeiten_auftrag_idx ON public.auftrag_regiearbeiten USING btree (auftrag_id, datum DESC);


--
-- Name: auftrag_rueckfragen_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_rueckfragen_auftrag_idx ON public.auftrag_rueckfragen USING btree (auftrag_id, created_at DESC);


--
-- Name: auftrag_terminslots_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_terminslots_auftrag_idx ON public.auftrag_terminslots USING btree (auftrag_id, slot_beginn);


--
-- Name: auftrag_wochenberichte_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_wochenberichte_auftrag_idx ON public.auftrag_wochenberichte USING btree (auftrag_id, von_datum DESC);


--
-- Name: auftrag_wochenberichte_kw_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX auftrag_wochenberichte_kw_uq ON public.auftrag_wochenberichte USING btree (auftrag_id, kalenderwoche, jahr);


--
-- Name: auftrag_zahlungsplaene_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_zahlungsplaene_auftrag_idx ON public.auftrag_zahlungsplaene USING btree (auftrag_id);


--
-- Name: auftrag_zahlungsplan_positionen_plan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auftrag_zahlungsplan_positionen_plan_idx ON public.auftrag_zahlungsplan_positionen USING btree (zahlungsplan_id);


--
-- Name: crm_impersonation_tokens_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crm_impersonation_tokens_expires_idx ON public.crm_impersonation_tokens USING btree (expires_at);


--
-- Name: eigentuemer_objekte_kunde_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX eigentuemer_objekte_kunde_idx ON public.eigentuemer_objekte USING btree (kunde_id);


--
-- Name: eigentuemer_objekte_objekt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX eigentuemer_objekte_objekt_idx ON public.eigentuemer_objekte USING btree (kunde_objekt_id);


--
-- Name: einbehalte_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX einbehalte_auftrag_idx ON public.einbehalte USING btree (auftrag_id);


--
-- Name: einbehalte_freigabe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX einbehalte_freigabe_idx ON public.einbehalte USING btree (freigabe_datum);


--
-- Name: eingangsrechnungen_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX eingangsrechnungen_auftrag_idx ON public.eingangsrechnungen USING btree (auftrag_id);


--
-- Name: einheit_bewohner_einheit_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX einheit_bewohner_einheit_idx ON public.einheit_bewohner USING btree (objekt_einheit_id) WHERE ((aktiv = true) AND (anonymisiert_am IS NULL));


--
-- Name: einheit_bewohner_portal_kunde_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX einheit_bewohner_portal_kunde_id_idx ON public.einheit_bewohner USING btree (portal_kunde_id) WHERE (portal_kunde_id IS NOT NULL);


--
-- Name: einheit_bewohner_rolle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX einheit_bewohner_rolle_idx ON public.einheit_bewohner USING btree (objekt_einheit_id, rolle) WHERE ((aktiv = true) AND (anonymisiert_am IS NULL));


--
-- Name: einreichungen_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX einreichungen_token_idx ON public.hw_formular_einreichungen USING btree (token);


--
-- Name: eintrag_fotos_eintrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX eintrag_fotos_eintrag_idx ON public.eintrag_fotos USING btree (eintrag_id);


--
-- Name: email_log_kunde_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_log_kunde_idx ON public.email_log USING btree (kunde_id);


--
-- Name: email_log_lead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_log_lead_idx ON public.email_log USING btree (lead_id);


--
-- Name: formular_eintraege_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX formular_eintraege_auftrag_idx ON public.formular_eintraege USING btree (auftrag_id);


--
-- Name: formular_eintraege_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX formular_eintraege_token_idx ON public.formular_eintraege USING btree (token);


--
-- Name: formular_tabs_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX formular_tabs_auftrag_idx ON public.hw_formular_tabs USING btree (auftrag_id);


--
-- Name: fremd_vorgaenge_objekt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fremd_vorgaenge_objekt_idx ON public.fremd_vorgaenge USING btree (kunde_objekt_id, datum DESC);


--
-- Name: funnel_portal_otp_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX funnel_portal_otp_expires_idx ON public.funnel_portal_otp USING btree (expires_at);


--
-- Name: gewaehrleistungen_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gewaehrleistungen_auftrag_idx ON public.gewaehrleistungen USING btree (auftrag_id);


--
-- Name: gewaehrleistungen_frist_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gewaehrleistungen_frist_idx ON public.gewaehrleistungen USING btree (frist_bis);


--
-- Name: gpt_raum_sessions_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gpt_raum_sessions_expires_idx ON public.gpt_raum_sessions USING btree (expires_at);


--
-- Name: gpt_raum_sessions_kunde_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gpt_raum_sessions_kunde_created_idx ON public.gpt_raum_sessions USING btree (kunde_id, created_at DESC) WHERE (kunde_id IS NOT NULL);


--
-- Name: gpt_raum_sessions_visitor_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gpt_raum_sessions_visitor_created_idx ON public.gpt_raum_sessions USING btree (visitor_token, created_at DESC) WHERE (visitor_token IS NOT NULL);


--
-- Name: handwerker_auth_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX handwerker_auth_user_id_idx ON public.handwerker USING btree (auth_user_id);


--
-- Name: handwerker_auth_user_id_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX handwerker_auth_user_id_unique_idx ON public.handwerker USING btree (auth_user_id) WHERE (auth_user_id IS NOT NULL);


--
-- Name: handwerker_bewertungen_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX handwerker_bewertungen_auftrag_idx ON public.handwerker_bewertungen USING btree (auftrag_id);


--
-- Name: handwerker_bewertungen_hw_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX handwerker_bewertungen_hw_idx ON public.handwerker_bewertungen USING btree (handwerker_id, created_at DESC);


--
-- Name: handwerker_portal_gesperrt_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX handwerker_portal_gesperrt_email_idx ON public.handwerker USING btree (lower(email)) WHERE ((ist_portal_gesperrt = true) AND (email IS NOT NULL));


--
-- Name: handwerker_vertraege_auftrag_dokument_art_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX handwerker_vertraege_auftrag_dokument_art_idx ON public.handwerker_vertraege USING btree (auftrag_id, dokument_art);


--
-- Name: handwerker_vertraege_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX handwerker_vertraege_auftrag_idx ON public.handwerker_vertraege USING btree (auftrag_id);


--
-- Name: handwerker_vertraege_handwerker_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX handwerker_vertraege_handwerker_idx ON public.handwerker_vertraege USING btree (handwerker_id, typ);


--
-- Name: handwerker_vertraege_hw_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX handwerker_vertraege_hw_auftrag_idx ON public.handwerker_vertraege USING btree (handwerker_id, auftrag_id) WHERE (typ = 'projekt'::text);


--
-- Name: handwerker_vertraege_parent_vertrag_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX handwerker_vertraege_parent_vertrag_id_idx ON public.handwerker_vertraege USING btree (parent_vertrag_id) WHERE (parent_vertrag_id IS NOT NULL);


--
-- Name: handwerker_vertraege_typ_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX handwerker_vertraege_typ_idx ON public.handwerker_vertraege USING btree (typ, created_at DESC);


--
-- Name: hausmeister_objekte_hm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hausmeister_objekte_hm_idx ON public.hausmeister_objekte USING btree (org_hausmeister_id);


--
-- Name: hv_calendar_feeds_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hv_calendar_feeds_hash_idx ON public.hv_calendar_feeds USING btree (token_hash) WHERE (aktiv = true);


--
-- Name: hv_notifications_kunde_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hv_notifications_kunde_idx ON public.hv_notifications USING btree (kunde_id, created_at DESC);


--
-- Name: hv_portal_abnahmen_auftrag_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX hv_portal_abnahmen_auftrag_id_uidx ON public.hv_portal_abnahmen USING btree (auftrag_id);


--
-- Name: hv_portal_abnahmen_lead_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hv_portal_abnahmen_lead_id_idx ON public.hv_portal_abnahmen USING btree (lead_id);


--
-- Name: idx_angebot_ki_beispiele_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_angebot_ki_beispiele_created ON public.angebot_ki_beispiele USING btree (created_at DESC);


--
-- Name: idx_angebot_ki_beispiele_gewerk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_angebot_ki_beispiele_gewerk ON public.angebot_ki_beispiele USING btree (gewerk_slug);


--
-- Name: idx_angebot_ki_beispiele_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_angebot_ki_beispiele_scope ON public.angebot_ki_beispiele USING btree (scope);


--
-- Name: idx_auftrag_timeline_auftrag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auftrag_timeline_auftrag ON public.auftrag_timeline USING btree (auftrag_id, created_at DESC);


--
-- Name: idx_auftrag_timeline_email_log; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auftrag_timeline_email_log ON public.auftrag_timeline USING btree (email_log_id);


--
-- Name: idx_copilot_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_copilot_messages_created_at ON public.copilot_messages USING btree (created_at DESC);


--
-- Name: idx_crm_notification_reads_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_notification_reads_user ON public.crm_notification_reads USING btree (user_id, read_at DESC);


--
-- Name: idx_crm_push_subscriptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_push_subscriptions_user ON public.crm_push_subscriptions USING btree (user_id);


--
-- Name: idx_custom_field_def_objekt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_field_def_objekt ON public.custom_field_definitions USING btree (objekt_typ, sort_order);


--
-- Name: idx_custom_field_values_objekt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_field_values_objekt ON public.custom_field_values USING btree (objekt_id);


--
-- Name: idx_kalender_termine_auftrag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kalender_termine_auftrag ON public.kalender_termine USING btree (auftrag_id);


--
-- Name: idx_kalender_termine_datum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kalender_termine_datum ON public.kalender_termine USING btree (datum);


--
-- Name: idx_kalender_termine_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kalender_termine_lead ON public.kalender_termine USING btree (lead_id);


--
-- Name: idx_kalender_termine_zugewiesen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kalender_termine_zugewiesen ON public.kalender_termine USING btree (zugewiesen_an);


--
-- Name: idx_ki_cluster_analysen_bereich; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ki_cluster_analysen_bereich ON public.ki_cluster_analysen USING btree (bereich, generiert_am DESC);


--
-- Name: idx_ki_empfehlungen_analyse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ki_empfehlungen_analyse ON public.ki_empfehlungen USING btree (analyse_lauf DESC, prioritaet);


--
-- Name: idx_ki_empfehlungen_offen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ki_empfehlungen_offen ON public.ki_empfehlungen USING btree (umgesetzt, created_at DESC) WHERE (umgesetzt = false);


--
-- Name: idx_ki_hist_pos_dokument; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ki_hist_pos_dokument ON public.ki_historische_positionen USING btree (dokument_nr);


--
-- Name: idx_ki_hist_pos_gewerk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ki_hist_pos_gewerk ON public.ki_historische_positionen USING btree (gewerk);


--
-- Name: idx_ki_hist_vorgaenge_gewerk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ki_hist_vorgaenge_gewerk ON public.ki_historische_vorgaenge USING btree (gewerk);


--
-- Name: idx_ki_hist_vorgaenge_kunde; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ki_hist_vorgaenge_kunde ON public.ki_historische_vorgaenge USING btree (kundennr);


--
-- Name: idx_ki_hist_vorgaenge_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ki_hist_vorgaenge_status ON public.ki_historische_vorgaenge USING btree (status);


--
-- Name: idx_lead_timeline_angebot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_timeline_angebot ON public.lead_timeline USING btree (angebot_id, created_at DESC);


--
-- Name: idx_lead_timeline_email_log; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_timeline_email_log ON public.lead_timeline USING btree (email_log_id);


--
-- Name: idx_lead_timeline_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_timeline_lead ON public.lead_timeline USING btree (lead_id, created_at DESC);


--
-- Name: idx_marketing_metrics_quelle_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_metrics_quelle_created ON public.marketing_metrics USING btree (quelle, created_at DESC);


--
-- Name: idx_nachtraege_auftrag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nachtraege_auftrag ON public.nachtraege USING btree (auftrag_id, created_at DESC);


--
-- Name: idx_partner_dokumente_auftrag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_dokumente_auftrag ON public.partner_dokumente USING btree (auftrag_id) WHERE (auftrag_id IS NOT NULL);


--
-- Name: idx_partner_dokumente_hw_auftrag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_dokumente_hw_auftrag ON public.partner_dokumente USING btree (handwerker_id, auftrag_id);


--
-- Name: idx_punch_list_auftrag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_punch_list_auftrag ON public.punch_list USING btree (auftrag_id, gewerk_id);


--
-- Name: idx_system_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_events_created ON public.system_events USING btree (created_at DESC);


--
-- Name: idx_todos_auftrag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_todos_auftrag ON public.todos USING btree (auftrag_id);


--
-- Name: idx_todos_erledigt_faellig; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_todos_erledigt_faellig ON public.todos USING btree (erledigt, faellig_am);


--
-- Name: idx_todos_handwerker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_todos_handwerker ON public.todos USING btree (handwerker_id);


--
-- Name: idx_todos_kunde; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_todos_kunde ON public.todos USING btree (kunde_id);


--
-- Name: idx_todos_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_todos_lead ON public.todos USING btree (lead_id);


--
-- Name: idx_todos_zugewiesen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_todos_zugewiesen ON public.todos USING btree (zugewiesen_an);


--
-- Name: kalender_datum_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kalender_datum_idx ON public.kalender_termine USING btree (datum);


--
-- Name: katalog_lernsignale_angebot_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX katalog_lernsignale_angebot_idx ON public.katalog_lernsignale USING btree (angebot_id, created_at DESC);


--
-- Name: katalog_lernsignale_gewerk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX katalog_lernsignale_gewerk_idx ON public.katalog_lernsignale USING btree (gewerk_id);


--
-- Name: katalog_positionen_gewerk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX katalog_positionen_gewerk_idx ON public.katalog_positionen USING btree (gewerk_id) WHERE aktiv;


--
-- Name: katalog_preise_produkt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX katalog_preise_produkt_idx ON public.katalog_preise USING btree (produkt_slug);


--
-- Name: katalog_varianten_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX katalog_varianten_position_idx ON public.katalog_varianten USING btree (position_id) WHERE aktiv;


--
-- Name: ki_visualisierungen_angebot_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ki_visualisierungen_angebot_id_idx ON public.ki_visualisierungen USING btree (angebot_id);


--
-- Name: kunden_ansprechpartner_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kunden_ansprechpartner_email_idx ON public.kunden_ansprechpartner USING btree (lower(email)) WHERE (email IS NOT NULL);


--
-- Name: kunden_ansprechpartner_kunde_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kunden_ansprechpartner_kunde_idx ON public.kunden_ansprechpartner USING btree (kunde_id);


--
-- Name: kunden_auth_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kunden_auth_user_id_idx ON public.kunden USING btree (auth_user_id);


--
-- Name: kunden_auth_user_id_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX kunden_auth_user_id_unique_idx ON public.kunden USING btree (auth_user_id) WHERE (auth_user_id IS NOT NULL);


--
-- Name: kunden_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kunden_email_idx ON public.kunden USING btree (email);


--
-- Name: kunden_ist_spam_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kunden_ist_spam_email_idx ON public.kunden USING btree (lower(email)) WHERE ((ist_spam = true) AND (email IS NOT NULL));


--
-- Name: kunden_mitglieder_auth_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kunden_mitglieder_auth_idx ON public.kunden_mitglieder USING btree (auth_user_id) WHERE (aktiv = true);


--
-- Name: kunden_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kunden_name_idx ON public.kunden USING btree (name);


--
-- Name: kunden_notizen_kunde_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kunden_notizen_kunde_idx ON public.kunden_notizen USING btree (kunde_id);


--
-- Name: kunden_objekte_kunde_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kunden_objekte_kunde_idx ON public.kunden_objekte USING btree (kunde_id);


--
-- Name: kunden_objekte_kunde_titel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kunden_objekte_kunde_titel_idx ON public.kunden_objekte USING btree (kunde_id, titel);


--
-- Name: kunden_objekte_melde_slug_per_kunde_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX kunden_objekte_melde_slug_per_kunde_idx ON public.kunden_objekte USING btree (kunde_id, lower(TRIM(BOTH FROM melde_slug))) WHERE ((melde_slug IS NOT NULL) AND (TRIM(BOTH FROM melde_slug) <> ''::text));


--
-- Name: kunden_org_kennung_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX kunden_org_kennung_unique_idx ON public.kunden USING btree (lower(TRIM(BOTH FROM org_kennung))) WHERE ((org_kennung IS NOT NULL) AND (TRIM(BOTH FROM org_kennung) <> ''::text));


--
-- Name: kunden_portal_gesperrt_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kunden_portal_gesperrt_email_idx ON public.kunden USING btree (lower(email)) WHERE ((ist_portal_gesperrt = true) AND (email IS NOT NULL));


--
-- Name: kunden_telefon_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kunden_telefon_idx ON public.kunden USING btree (telefon);


--
-- Name: lead_befund_punkte_befund_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lead_befund_punkte_befund_idx ON public.lead_befund_punkte USING btree (befund_id, sort_order);


--
-- Name: lead_befunde_ergebnis_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lead_befunde_ergebnis_idx ON public.lead_befunde USING btree (ergebnis);


--
-- Name: lead_befunde_lead_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX lead_befunde_lead_id_uidx ON public.lead_befunde USING btree (lead_id);


--
-- Name: lead_notizen_kalender_termin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lead_notizen_kalender_termin_idx ON public.lead_notizen USING btree (kalender_termin_id);


--
-- Name: lead_notizen_lead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lead_notizen_lead_idx ON public.lead_notizen USING btree (lead_id);


--
-- Name: lead_notizen_quelle_notiz_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX lead_notizen_quelle_notiz_uidx ON public.lead_notizen USING btree (quelle_notiz_id) WHERE (quelle_notiz_id IS NOT NULL);


--
-- Name: leads_anlass_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_anlass_idx ON public.leads USING btree (anlass) WHERE (anlass IS NOT NULL);


--
-- Name: leads_auftraggeber_kunde_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_auftraggeber_kunde_id_idx ON public.leads USING btree (auftraggeber_kunde_id) WHERE (auftraggeber_kunde_id IS NOT NULL);


--
-- Name: leads_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_created_at_idx ON public.leads USING btree (created_at DESC);


--
-- Name: leads_einladung_token_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX leads_einladung_token_unique_idx ON public.leads USING btree (einladung_token) WHERE (einladung_token IS NOT NULL);


--
-- Name: leads_geloescht_am_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_geloescht_am_idx ON public.leads USING btree (geloescht_am) WHERE (geloescht_am IS NOT NULL);


--
-- Name: leads_hv_meldung_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_hv_meldung_status_idx ON public.leads USING btree (auftraggeber_kunde_id, hv_meldung_status) WHERE ((anlass = 'meldung'::text) AND (auftraggeber_kunde_id IS NOT NULL));


--
-- Name: leads_ist_wiederkehrend_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_ist_wiederkehrend_idx ON public.leads USING btree (ist_wiederkehrend) WHERE (ist_wiederkehrend = true);


--
-- Name: leads_kanal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_kanal_idx ON public.leads USING btree (kanal);


--
-- Name: leads_kunde_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_kunde_id_idx ON public.leads USING btree (kunde_id);


--
-- Name: leads_leistung_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_leistung_slug_idx ON public.leads USING btree (leistung_slug) WHERE (leistung_slug IS NOT NULL);


--
-- Name: leads_melde_tracking_token_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX leads_melde_tracking_token_uidx ON public.leads USING btree (melde_tracking_token) WHERE (melde_tracking_token IS NOT NULL);


--
-- Name: leads_produkt_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_produkt_slug_idx ON public.leads USING btree (produkt_slug) WHERE (produkt_slug IS NOT NULL);


--
-- Name: leads_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_status_idx ON public.leads USING btree (status);


--
-- Name: leads_zusammengefuehrt_in_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_zusammengefuehrt_in_idx ON public.leads USING btree (zusammengefuehrt_in) WHERE (zusammengefuehrt_in IS NOT NULL);


--
-- Name: mieter_feedback_lead_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mieter_feedback_lead_uidx ON public.mieter_feedback USING btree (lead_id);


--
-- Name: milestones_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX milestones_auftrag_idx ON public.auftrag_milestones USING btree (auftrag_id);


--
-- Name: nachtraege_token_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nachtraege_token_unique ON public.nachtraege USING btree (token);


--
-- Name: notifications_handwerker_unread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_handwerker_unread_idx ON public.notifications USING btree (handwerker_id, gelesen, created_at DESC);


--
-- Name: objekt_dokumente_objekt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX objekt_dokumente_objekt_idx ON public.objekt_dokumente USING btree (kunde_objekt_id, ablauf_datum);


--
-- Name: objekt_einheiten_objekt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX objekt_einheiten_objekt_idx ON public.objekt_einheiten USING btree (kunde_objekt_id);


--
-- Name: objekt_kontakte_objekt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX objekt_kontakte_objekt_idx ON public.objekt_kontakte USING btree (kunde_objekt_id, sort_order);


--
-- Name: objekt_pruefpflichten_objekt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX objekt_pruefpflichten_objekt_idx ON public.objekt_pruefpflichten USING btree (kunde_objekt_id, naechste_faellig);


--
-- Name: org_freigabe_log_lead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_freigabe_log_lead_idx ON public.org_freigabe_log USING btree (lead_id);


--
-- Name: org_hausmeister_org_email_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX org_hausmeister_org_email_uidx ON public.org_hausmeister USING btree (org_kunde_id, lower(email)) WHERE ((email IS NOT NULL) AND (length(TRIM(BOTH FROM email)) > 0));


--
-- Name: org_hausmeister_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_hausmeister_org_idx ON public.org_hausmeister USING btree (org_kunde_id);


--
-- Name: partner_bautagebuch_anfragen_hw_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_bautagebuch_anfragen_hw_idx ON public.partner_bautagebuch_anfragen USING btree (handwerker_id, erledigt_at, created_at DESC);


--
-- Name: partner_bautagebuch_anfragen_offen_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX partner_bautagebuch_anfragen_offen_uq ON public.partner_bautagebuch_anfragen USING btree (auftrag_id, handwerker_id) WHERE (erledigt_at IS NULL);


--
-- Name: partner_dokumente_gueltig_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_dokumente_gueltig_idx ON public.partner_dokumente USING btree (gueltig_bis);


--
-- Name: partner_dokumente_handwerker_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_dokumente_handwerker_idx ON public.partner_dokumente USING btree (handwerker_id);


--
-- Name: partner_dokumente_hw_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_dokumente_hw_auftrag_idx ON public.partner_dokumente USING btree (handwerker_id, auftrag_id);


--
-- Name: partner_dokumente_hw_typ_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_dokumente_hw_typ_idx ON public.partner_dokumente USING btree (handwerker_id, typ);


--
-- Name: partner_dokumente_typ_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_dokumente_typ_idx ON public.partner_dokumente USING btree (typ);


--
-- Name: partner_positions_anfragen_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_positions_anfragen_auftrag_idx ON public.partner_positions_anfragen USING btree (auftrag_id, status);


--
-- Name: partner_positions_anfragen_offen_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_positions_anfragen_offen_idx ON public.partner_positions_anfragen USING btree (created_at DESC) WHERE (status = 'offen'::text);


--
-- Name: partner_todos_handwerker_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_todos_handwerker_sort_idx ON public.partner_todos USING btree (handwerker_id, erledigt, sort_order, created_at DESC);


--
-- Name: portal_einladungen_einheit_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX portal_einladungen_einheit_idx ON public.portal_einladungen USING btree (einheit_id) WHERE (einheit_id IS NOT NULL);


--
-- Name: portal_einladungen_kunde_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX portal_einladungen_kunde_status_idx ON public.portal_einladungen USING btree (kunde_id, status, created_at DESC);


--
-- Name: portal_einladungen_objekt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX portal_einladungen_objekt_idx ON public.portal_einladungen USING btree (objekt_id) WHERE (objekt_id IS NOT NULL);


--
-- Name: portal_einladungen_token_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX portal_einladungen_token_uidx ON public.portal_einladungen USING btree (token);


--
-- Name: portal_notifications_user_unread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX portal_notifications_user_unread_idx ON public.portal_notifications USING btree (empfaenger_user_id, gelesen, created_at DESC);


--
-- Name: portal_notifications_vorgang_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX portal_notifications_vorgang_idx ON public.portal_notifications USING btree (vorgang_ref) WHERE (vorgang_ref IS NOT NULL);


--
-- Name: position_eintraege_auftrag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX position_eintraege_auftrag_idx ON public.position_eintraege USING btree (auftrag_id, created_at) WHERE (auftrag_id IS NOT NULL);


--
-- Name: position_eintraege_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX position_eintraege_position_idx ON public.position_eintraege USING btree (position_id, created_at);


--
-- Name: position_material_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX position_material_position_idx ON public.position_material USING btree (position_id);


--
-- Name: preislisten_gewerk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX preislisten_gewerk_idx ON public.preislisten USING btree (gewerk_id);


--
-- Name: preislisten_gewerk_kategorie_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX preislisten_gewerk_kategorie_idx ON public.preislisten USING btree (gewerk_id, kategorie);


--
-- Name: preislisten_kategorie_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX preislisten_kategorie_idx ON public.preislisten USING btree (kategorie);


--
-- Name: punch_list_abnahme_punkt_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX punch_list_abnahme_punkt_uq ON public.punch_list USING btree (auftrag_id, abnahme_punkt_id) WHERE (abnahme_punkt_id IS NOT NULL);


--
-- Name: push_subscriptions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions USING btree (auth_user_id);


--
-- Name: rechnungen_angebot_handwerker_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX rechnungen_angebot_handwerker_id_uidx ON public.rechnungen USING btree (angebot_handwerker_id) WHERE (angebot_handwerker_id IS NOT NULL);


--
-- Name: rechnungen_ansprechpartner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rechnungen_ansprechpartner_id_idx ON public.rechnungen USING btree (ansprechpartner_id) WHERE (ansprechpartner_id IS NOT NULL);


--
-- Name: rechnungen_ersetzt_durch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rechnungen_ersetzt_durch_idx ON public.rechnungen USING btree (ersetzt_durch) WHERE (ersetzt_durch IS NOT NULL);


--
-- Name: rechnungen_faellig_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rechnungen_faellig_idx ON public.rechnungen USING btree (faellig_am);


--
-- Name: rechnungen_korrektur_von_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rechnungen_korrektur_von_idx ON public.rechnungen USING btree (korrektur_von) WHERE (korrektur_von IS NOT NULL);


--
-- Name: rechnungen_kunde_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rechnungen_kunde_idx ON public.rechnungen USING btree (kunde_id);


--
-- Name: rechnungen_kunde_objekt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rechnungen_kunde_objekt_id_idx ON public.rechnungen USING btree (kunde_objekt_id) WHERE (kunde_objekt_id IS NOT NULL);


--
-- Name: rechnungen_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rechnungen_status_idx ON public.rechnungen USING btree (status);


--
-- Name: sammelrechnungen_kunde_periode_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sammelrechnungen_kunde_periode_uidx ON public.sammelrechnungen USING btree (kunde_id, periode);


--
-- Name: vorgang_kommentare_lead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vorgang_kommentare_lead_idx ON public.vorgang_kommentare USING btree (lead_id, created_at);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_04_16_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_04_16_inserted_at_topic_idx ON realtime.messages_2026_04_16 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_04_17_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_04_17_inserted_at_topic_idx ON realtime.messages_2026_04_17 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_04_18_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_04_18_inserted_at_topic_idx ON realtime.messages_2026_04_18 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_04_19_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_04_19_inserted_at_topic_idx ON realtime.messages_2026_04_19 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_04_20_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_04_20_inserted_at_topic_idx ON realtime.messages_2026_04_20 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_04_21_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_04_21_inserted_at_topic_idx ON realtime.messages_2026_04_21 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_04_22_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_04_22_inserted_at_topic_idx ON realtime.messages_2026_04_22 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_selec; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_selec ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter, COALESCE(selected_columns, '{}'::text[]));


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: messages_2026_04_16_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_16_inserted_at_topic_idx;


--
-- Name: messages_2026_04_16_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_16_pkey;


--
-- Name: messages_2026_04_17_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_17_inserted_at_topic_idx;


--
-- Name: messages_2026_04_17_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_17_pkey;


--
-- Name: messages_2026_04_18_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_18_inserted_at_topic_idx;


--
-- Name: messages_2026_04_18_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_18_pkey;


--
-- Name: messages_2026_04_19_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_19_inserted_at_topic_idx;


--
-- Name: messages_2026_04_19_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_19_pkey;


--
-- Name: messages_2026_04_20_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_20_inserted_at_topic_idx;


--
-- Name: messages_2026_04_20_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_20_pkey;


--
-- Name: messages_2026_04_21_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_21_inserted_at_topic_idx;


--
-- Name: messages_2026_04_21_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_21_pkey;


--
-- Name: messages_2026_04_22_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_22_inserted_at_topic_idx;


--
-- Name: messages_2026_04_22_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_22_pkey;


--
-- Name: angebote angebote_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER angebote_updated_at BEFORE UPDATE ON public.angebote FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: auftraege auftraege_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auftraege_updated_at BEFORE UPDATE ON public.auftraege FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: email_log email_timeline_sync; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER email_timeline_sync AFTER INSERT ON public.email_log FOR EACH ROW EXECUTE FUNCTION public.sync_email_to_timeline();


--
-- Name: formular_eintraege formular_eintraege_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER formular_eintraege_updated_at BEFORE UPDATE ON public.formular_eintraege FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: handwerker_bewertungen handwerker_bewertungen_recalc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handwerker_bewertungen_recalc AFTER INSERT OR DELETE OR UPDATE ON public.handwerker_bewertungen FOR EACH ROW EXECUTE FUNCTION public.trg_handwerker_bewertungen_recalc();


--
-- Name: kunden kunden_kundennummer_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER kunden_kundennummer_trigger BEFORE INSERT ON public.kunden FOR EACH ROW EXECUTE FUNCTION public.set_kundennummer();


--
-- Name: leads leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: partner_todos partner_todos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER partner_todos_updated_at BEFORE UPDATE ON public.partner_todos FOR EACH ROW EXECUTE FUNCTION public.partner_todos_set_updated_at();


--
-- Name: auftrag_positionen trg_auftrag_position_letzte_aktivitaet; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auftrag_position_letzte_aktivitaet AFTER UPDATE OF leistung_status ON public.auftrag_positionen FOR EACH ROW EXECUTE FUNCTION public.touch_auftrag_letzte_aktivitaet_from_position();


--
-- Name: handwerker trg_handwerker_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_handwerker_updated_at BEFORE UPDATE ON public.handwerker FOR EACH ROW EXECUTE FUNCTION public.set_handwerker_updated_at();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: abnahmeprotokoll abnahmeprotokoll_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abnahmeprotokoll
    ADD CONSTRAINT abnahmeprotokoll_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: akten_notizen akten_notizen_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.akten_notizen
    ADD CONSTRAINT akten_notizen_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: akten_notizen akten_notizen_kunde_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.akten_notizen
    ADD CONSTRAINT akten_notizen_kunde_objekt_id_fkey FOREIGN KEY (kunde_objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE CASCADE;


--
-- Name: akten_notizen akten_notizen_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.akten_notizen
    ADD CONSTRAINT akten_notizen_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: angebot_handwerker angebot_handwerker_angebot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebot_handwerker
    ADD CONSTRAINT angebot_handwerker_angebot_id_fkey FOREIGN KEY (angebot_id) REFERENCES public.angebote(id) ON DELETE CASCADE;


--
-- Name: angebot_handwerker angebot_handwerker_gewerk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebot_handwerker
    ADD CONSTRAINT angebot_handwerker_gewerk_id_fkey FOREIGN KEY (gewerk_id) REFERENCES public.gewerke(id) ON DELETE SET NULL;


--
-- Name: angebot_handwerker angebot_handwerker_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebot_handwerker
    ADD CONSTRAINT angebot_handwerker_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE CASCADE;


--
-- Name: angebot_vorlagen angebot_vorlagen_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebot_vorlagen
    ADD CONSTRAINT angebot_vorlagen_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id);


--
-- Name: angebote angebote_ansprechpartner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebote
    ADD CONSTRAINT angebote_ansprechpartner_id_fkey FOREIGN KEY (ansprechpartner_id) REFERENCES public.kunden_ansprechpartner(id) ON DELETE SET NULL;


--
-- Name: angebote angebote_ersetzt_durch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebote
    ADD CONSTRAINT angebote_ersetzt_durch_fkey FOREIGN KEY (ersetzt_durch) REFERENCES public.angebote(id) ON DELETE SET NULL;


--
-- Name: angebote angebote_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebote
    ADD CONSTRAINT angebote_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: angebote angebote_korrektur_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebote
    ADD CONSTRAINT angebote_korrektur_von_fkey FOREIGN KEY (korrektur_von) REFERENCES public.angebote(id) ON DELETE SET NULL;


--
-- Name: angebote angebote_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebote
    ADD CONSTRAINT angebote_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE SET NULL;


--
-- Name: angebote angebote_kunde_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebote
    ADD CONSTRAINT angebote_kunde_objekt_id_fkey FOREIGN KEY (kunde_objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE SET NULL;


--
-- Name: angebote angebote_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.angebote
    ADD CONSTRAINT angebote_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: audit_events audit_events_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE SET NULL;


--
-- Name: auftraege auftraege_angebot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftraege
    ADD CONSTRAINT auftraege_angebot_id_fkey FOREIGN KEY (angebot_id) REFERENCES public.angebote(id) ON DELETE SET NULL;


--
-- Name: auftraege auftraege_betreuer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftraege
    ADD CONSTRAINT auftraege_betreuer_id_fkey FOREIGN KEY (betreuer_id) REFERENCES auth.users(id);


--
-- Name: auftraege auftraege_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftraege
    ADD CONSTRAINT auftraege_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: auftraege auftraege_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftraege
    ADD CONSTRAINT auftraege_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE SET NULL;


--
-- Name: auftraege auftraege_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftraege
    ADD CONSTRAINT auftraege_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: auftrag_abnahmeprotokolle auftrag_abnahmeprotokolle_abgelehnt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_abnahmeprotokolle
    ADD CONSTRAINT auftrag_abnahmeprotokolle_abgelehnt_von_fkey FOREIGN KEY (abgelehnt_von) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: auftrag_abnahmeprotokolle auftrag_abnahmeprotokolle_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_abnahmeprotokolle
    ADD CONSTRAINT auftrag_abnahmeprotokolle_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_abnahmeprotokolle auftrag_abnahmeprotokolle_freigegeben_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_abnahmeprotokolle
    ADD CONSTRAINT auftrag_abnahmeprotokolle_freigegeben_von_fkey FOREIGN KEY (freigegeben_von) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: auftrag_abnahmeprotokolle auftrag_abnahmeprotokolle_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_abnahmeprotokolle
    ADD CONSTRAINT auftrag_abnahmeprotokolle_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE SET NULL;


--
-- Name: auftrag_baustellen_dokumente auftrag_baustellen_dokumente_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_baustellen_dokumente
    ADD CONSTRAINT auftrag_baustellen_dokumente_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_bautagebuch_eintraege auftrag_bautagebuch_eintraege_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_bautagebuch_eintraege
    ADD CONSTRAINT auftrag_bautagebuch_eintraege_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_bautagebuch_eintraege auftrag_bautagebuch_eintraege_gewerk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_bautagebuch_eintraege
    ADD CONSTRAINT auftrag_bautagebuch_eintraege_gewerk_id_fkey FOREIGN KEY (gewerk_id) REFERENCES public.gewerke(id) ON DELETE SET NULL;


--
-- Name: auftrag_bautagebuch_eintraege auftrag_bautagebuch_eintraege_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_bautagebuch_eintraege
    ADD CONSTRAINT auftrag_bautagebuch_eintraege_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE SET NULL;


--
-- Name: auftrag_bautagebuch_eintraege auftrag_bautagebuch_eintraege_timeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_bautagebuch_eintraege
    ADD CONSTRAINT auftrag_bautagebuch_eintraege_timeline_id_fkey FOREIGN KEY (timeline_id) REFERENCES public.auftrag_timeline(id) ON DELETE SET NULL;


--
-- Name: auftrag_bautagesberichte auftrag_bautagesberichte_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_bautagesberichte
    ADD CONSTRAINT auftrag_bautagesberichte_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_bautagesberichte auftrag_bautagesberichte_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_bautagesberichte
    ADD CONSTRAINT auftrag_bautagesberichte_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE SET NULL;


--
-- Name: auftrag_fachdoku_slots auftrag_fachdoku_slots_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_fachdoku_slots
    ADD CONSTRAINT auftrag_fachdoku_slots_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_fachdoku_slots auftrag_fachdoku_slots_uploaded_by_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_fachdoku_slots
    ADD CONSTRAINT auftrag_fachdoku_slots_uploaded_by_handwerker_id_fkey FOREIGN KEY (uploaded_by_handwerker_id) REFERENCES public.handwerker(id) ON DELETE SET NULL;


--
-- Name: auftrag_handwerker auftrag_handwerker_abnahme_protokoll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_handwerker
    ADD CONSTRAINT auftrag_handwerker_abnahme_protokoll_id_fkey FOREIGN KEY (abnahme_protokoll_id) REFERENCES public.auftrag_abnahmeprotokolle(id) ON DELETE SET NULL;


--
-- Name: auftrag_handwerker auftrag_handwerker_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_handwerker
    ADD CONSTRAINT auftrag_handwerker_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_handwerker auftrag_handwerker_gewerk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_handwerker
    ADD CONSTRAINT auftrag_handwerker_gewerk_id_fkey FOREIGN KEY (gewerk_id) REFERENCES public.gewerke(id) ON DELETE SET NULL;


--
-- Name: auftrag_handwerker auftrag_handwerker_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_handwerker
    ADD CONSTRAINT auftrag_handwerker_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE CASCADE;


--
-- Name: auftrag_milestones auftrag_milestones_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_milestones
    ADD CONSTRAINT auftrag_milestones_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_position_notizen auftrag_position_notizen_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_position_notizen
    ADD CONSTRAINT auftrag_position_notizen_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.auftrag_positionen(id) ON DELETE CASCADE;


--
-- Name: auftrag_positionen auftrag_positionen_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_positionen
    ADD CONSTRAINT auftrag_positionen_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_positionen auftrag_positionen_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_positionen
    ADD CONSTRAINT auftrag_positionen_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE SET NULL;


--
-- Name: auftrag_regiearbeiten auftrag_regiearbeiten_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_regiearbeiten
    ADD CONSTRAINT auftrag_regiearbeiten_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_rueckfragen auftrag_rueckfragen_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_rueckfragen
    ADD CONSTRAINT auftrag_rueckfragen_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_rueckfragen auftrag_rueckfragen_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_rueckfragen
    ADD CONSTRAINT auftrag_rueckfragen_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE CASCADE;


--
-- Name: auftrag_terminslots auftrag_terminslots_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_terminslots
    ADD CONSTRAINT auftrag_terminslots_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_terminslots auftrag_terminslots_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_terminslots
    ADD CONSTRAINT auftrag_terminslots_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: auftrag_timeline auftrag_timeline_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_timeline
    ADD CONSTRAINT auftrag_timeline_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_timeline auftrag_timeline_email_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_timeline
    ADD CONSTRAINT auftrag_timeline_email_log_id_fkey FOREIGN KEY (email_log_id) REFERENCES public.email_log(id) ON DELETE SET NULL;


--
-- Name: auftrag_timeline auftrag_timeline_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_timeline
    ADD CONSTRAINT auftrag_timeline_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id);


--
-- Name: auftrag_timeline auftrag_timeline_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_timeline
    ADD CONSTRAINT auftrag_timeline_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id);


--
-- Name: auftrag_wochenberichte auftrag_wochenberichte_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_wochenberichte
    ADD CONSTRAINT auftrag_wochenberichte_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_zahlungsplaene auftrag_zahlungsplaene_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_zahlungsplaene
    ADD CONSTRAINT auftrag_zahlungsplaene_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: auftrag_zahlungsplan_positionen auftrag_zahlungsplan_positionen_rechnung_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_zahlungsplan_positionen
    ADD CONSTRAINT auftrag_zahlungsplan_positionen_rechnung_id_fkey FOREIGN KEY (rechnung_id) REFERENCES public.rechnungen(id) ON DELETE SET NULL;


--
-- Name: auftrag_zahlungsplan_positionen auftrag_zahlungsplan_positionen_zahlungsplan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auftrag_zahlungsplan_positionen
    ADD CONSTRAINT auftrag_zahlungsplan_positionen_zahlungsplan_id_fkey FOREIGN KEY (zahlungsplan_id) REFERENCES public.auftrag_zahlungsplaene(id) ON DELETE CASCADE;


--
-- Name: baustopps baustopps_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baustopps
    ADD CONSTRAINT baustopps_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: baustopps baustopps_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baustopps
    ADD CONSTRAINT baustopps_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id);


--
-- Name: bautagebuch bautagebuch_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bautagebuch
    ADD CONSTRAINT bautagebuch_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: bautagebuch bautagebuch_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bautagebuch
    ADD CONSTRAINT bautagebuch_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id);


--
-- Name: buergschaften buergschaften_einbehalt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buergschaften
    ADD CONSTRAINT buergschaften_einbehalt_id_fkey FOREIGN KEY (einbehalt_id) REFERENCES public.einbehalte(id) ON DELETE CASCADE;


--
-- Name: buergschaften buergschaften_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buergschaften
    ADD CONSTRAINT buergschaften_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id);


--
-- Name: crm_notification_reads crm_notification_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_notification_reads
    ADD CONSTRAINT crm_notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: crm_push_prefs crm_push_prefs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_push_prefs
    ADD CONSTRAINT crm_push_prefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: crm_push_subscriptions crm_push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_push_subscriptions
    ADD CONSTRAINT crm_push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: custom_field_values custom_field_values_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_field_values
    ADD CONSTRAINT custom_field_values_definition_id_fkey FOREIGN KEY (definition_id) REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE;


--
-- Name: datenschutz_loeschlog datenschutz_loeschlog_geloescht_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datenschutz_loeschlog
    ADD CONSTRAINT datenschutz_loeschlog_geloescht_von_fkey FOREIGN KEY (geloescht_von) REFERENCES auth.users(id);


--
-- Name: eigentuemer_objekte eigentuemer_objekte_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eigentuemer_objekte
    ADD CONSTRAINT eigentuemer_objekte_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: eigentuemer_objekte eigentuemer_objekte_kunde_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eigentuemer_objekte
    ADD CONSTRAINT eigentuemer_objekte_kunde_objekt_id_fkey FOREIGN KEY (kunde_objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE CASCADE;


--
-- Name: einbehalte einbehalte_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.einbehalte
    ADD CONSTRAINT einbehalte_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: einbehalte einbehalte_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.einbehalte
    ADD CONSTRAINT einbehalte_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id);


--
-- Name: eingangsrechnungen eingangsrechnungen_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eingangsrechnungen
    ADD CONSTRAINT eingangsrechnungen_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: eingangsrechnungen eingangsrechnungen_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eingangsrechnungen
    ADD CONSTRAINT eingangsrechnungen_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id);


--
-- Name: einheit_bewohner einheit_bewohner_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.einheit_bewohner
    ADD CONSTRAINT einheit_bewohner_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: einheit_bewohner einheit_bewohner_objekt_einheit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.einheit_bewohner
    ADD CONSTRAINT einheit_bewohner_objekt_einheit_id_fkey FOREIGN KEY (objekt_einheit_id) REFERENCES public.objekt_einheiten(id) ON DELETE CASCADE;


--
-- Name: einheit_bewohner einheit_bewohner_portal_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.einheit_bewohner
    ADD CONSTRAINT einheit_bewohner_portal_kunde_id_fkey FOREIGN KEY (portal_kunde_id) REFERENCES public.kunden(id) ON DELETE SET NULL;


--
-- Name: eintrag_fotos eintrag_fotos_eintrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eintrag_fotos
    ADD CONSTRAINT eintrag_fotos_eintrag_id_fkey FOREIGN KEY (eintrag_id) REFERENCES public.position_eintraege(id) ON DELETE CASCADE;


--
-- Name: email_log email_log_angebot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_angebot_id_fkey FOREIGN KEY (angebot_id) REFERENCES public.angebote(id) ON DELETE SET NULL;


--
-- Name: email_log email_log_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE SET NULL;


--
-- Name: email_log email_log_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: email_logs email_logs_angebot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_angebot_id_fkey FOREIGN KEY (angebot_id) REFERENCES public.angebote(id) ON DELETE SET NULL;


--
-- Name: email_logs email_logs_zuweisung_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_zuweisung_id_fkey FOREIGN KEY (zuweisung_id) REFERENCES public.angebot_handwerker(id) ON DELETE SET NULL;


--
-- Name: formular_eintraege formular_eintraege_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formular_eintraege
    ADD CONSTRAINT formular_eintraege_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: formular_eintraege formular_eintraege_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formular_eintraege
    ADD CONSTRAINT formular_eintraege_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE SET NULL;


--
-- Name: formular_eintraege formular_eintraege_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formular_eintraege
    ADD CONSTRAINT formular_eintraege_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.formular_templates(id) ON DELETE CASCADE;


--
-- Name: formular_templates formular_templates_gewerk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formular_templates
    ADD CONSTRAINT formular_templates_gewerk_id_fkey FOREIGN KEY (gewerk_id) REFERENCES public.gewerke(id) ON DELETE SET NULL;


--
-- Name: fremd_vorgaenge fremd_vorgaenge_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fremd_vorgaenge
    ADD CONSTRAINT fremd_vorgaenge_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: fremd_vorgaenge fremd_vorgaenge_kunde_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fremd_vorgaenge
    ADD CONSTRAINT fremd_vorgaenge_kunde_objekt_id_fkey FOREIGN KEY (kunde_objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE CASCADE;


--
-- Name: funnel_portal_otp funnel_portal_otp_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funnel_portal_otp
    ADD CONSTRAINT funnel_portal_otp_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: gewaehrleistungen gewaehrleistungen_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gewaehrleistungen
    ADD CONSTRAINT gewaehrleistungen_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: gewaehrleistungen gewaehrleistungen_mangel_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gewaehrleistungen
    ADD CONSTRAINT gewaehrleistungen_mangel_lead_id_fkey FOREIGN KEY (mangel_lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: gewaehrleistungen gewaehrleistungen_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gewaehrleistungen
    ADD CONSTRAINT gewaehrleistungen_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.handwerker(id) ON DELETE SET NULL;


--
-- Name: gpt_raum_sessions gpt_raum_sessions_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpt_raum_sessions
    ADD CONSTRAINT gpt_raum_sessions_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE SET NULL;


--
-- Name: handwerker handwerker_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker
    ADD CONSTRAINT handwerker_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: handwerker_bewertungen handwerker_bewertungen_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker_bewertungen
    ADD CONSTRAINT handwerker_bewertungen_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: handwerker_bewertungen handwerker_bewertungen_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker_bewertungen
    ADD CONSTRAINT handwerker_bewertungen_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: handwerker_bewertungen handwerker_bewertungen_gewerk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker_bewertungen
    ADD CONSTRAINT handwerker_bewertungen_gewerk_id_fkey FOREIGN KEY (gewerk_id) REFERENCES public.gewerke(id) ON DELETE SET NULL;


--
-- Name: handwerker_bewertungen handwerker_bewertungen_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker_bewertungen
    ADD CONSTRAINT handwerker_bewertungen_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE CASCADE;


--
-- Name: handwerker handwerker_partner_kategorie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker
    ADD CONSTRAINT handwerker_partner_kategorie_id_fkey FOREIGN KEY (partner_kategorie_id) REFERENCES public.partner_kategorien(id);


--
-- Name: handwerker_vertraege handwerker_vertraege_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker_vertraege
    ADD CONSTRAINT handwerker_vertraege_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE SET NULL;


--
-- Name: handwerker_vertraege handwerker_vertraege_gewerk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker_vertraege
    ADD CONSTRAINT handwerker_vertraege_gewerk_id_fkey FOREIGN KEY (gewerk_id) REFERENCES public.gewerke(id) ON DELETE SET NULL;


--
-- Name: handwerker_vertraege handwerker_vertraege_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker_vertraege
    ADD CONSTRAINT handwerker_vertraege_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE RESTRICT;


--
-- Name: handwerker_vertraege handwerker_vertraege_parent_vertrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker_vertraege
    ADD CONSTRAINT handwerker_vertraege_parent_vertrag_id_fkey FOREIGN KEY (parent_vertrag_id) REFERENCES public.handwerker_vertraege(id) ON DELETE SET NULL;


--
-- Name: handwerker_vertraege handwerker_vertraege_portal_akzeptiert_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handwerker_vertraege
    ADD CONSTRAINT handwerker_vertraege_portal_akzeptiert_auth_user_id_fkey FOREIGN KEY (portal_akzeptiert_auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: hausmeister_objekte hausmeister_objekte_kunde_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hausmeister_objekte
    ADD CONSTRAINT hausmeister_objekte_kunde_objekt_id_fkey FOREIGN KEY (kunde_objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE CASCADE;


--
-- Name: hausmeister_objekte hausmeister_objekte_org_hausmeister_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hausmeister_objekte
    ADD CONSTRAINT hausmeister_objekte_org_hausmeister_id_fkey FOREIGN KEY (org_hausmeister_id) REFERENCES public.org_hausmeister(id) ON DELETE CASCADE;


--
-- Name: hv_calendar_feeds hv_calendar_feeds_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hv_calendar_feeds
    ADD CONSTRAINT hv_calendar_feeds_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: hv_notification_prefs hv_notification_prefs_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hv_notification_prefs
    ADD CONSTRAINT hv_notification_prefs_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: hv_notifications hv_notifications_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hv_notifications
    ADD CONSTRAINT hv_notifications_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: hv_portal_abnahmen hv_portal_abnahmen_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hv_portal_abnahmen
    ADD CONSTRAINT hv_portal_abnahmen_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: hv_portal_abnahmen hv_portal_abnahmen_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hv_portal_abnahmen
    ADD CONSTRAINT hv_portal_abnahmen_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE SET NULL;


--
-- Name: hv_portal_abnahmen hv_portal_abnahmen_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hv_portal_abnahmen
    ADD CONSTRAINT hv_portal_abnahmen_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: hw_formular_einreichungen hw_formular_einreichungen_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_formular_einreichungen
    ADD CONSTRAINT hw_formular_einreichungen_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id);


--
-- Name: hw_formular_einreichungen hw_formular_einreichungen_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_formular_einreichungen
    ADD CONSTRAINT hw_formular_einreichungen_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id);


--
-- Name: hw_formular_einreichungen hw_formular_einreichungen_tab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_formular_einreichungen
    ADD CONSTRAINT hw_formular_einreichungen_tab_id_fkey FOREIGN KEY (tab_id) REFERENCES public.hw_formular_tabs(id) ON DELETE CASCADE;


--
-- Name: hw_formular_tabs hw_formular_tabs_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_formular_tabs
    ADD CONSTRAINT hw_formular_tabs_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: hw_formular_tabs hw_formular_tabs_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hw_formular_tabs
    ADD CONSTRAINT hw_formular_tabs_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id);


--
-- Name: kalender_termine kalender_termine_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kalender_termine
    ADD CONSTRAINT kalender_termine_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE SET NULL;


--
-- Name: kalender_termine kalender_termine_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kalender_termine
    ADD CONSTRAINT kalender_termine_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: kalender_termine kalender_termine_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kalender_termine
    ADD CONSTRAINT kalender_termine_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: kalender_termine kalender_termine_zugewiesen_an_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kalender_termine
    ADD CONSTRAINT kalender_termine_zugewiesen_an_fkey FOREIGN KEY (zugewiesen_an) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: katalog_lernsignale katalog_lernsignale_angebot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.katalog_lernsignale
    ADD CONSTRAINT katalog_lernsignale_angebot_id_fkey FOREIGN KEY (angebot_id) REFERENCES public.angebote(id) ON DELETE SET NULL;


--
-- Name: katalog_lernsignale katalog_lernsignale_gewerk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.katalog_lernsignale
    ADD CONSTRAINT katalog_lernsignale_gewerk_id_fkey FOREIGN KEY (gewerk_id) REFERENCES public.gewerke(id) ON DELETE SET NULL;


--
-- Name: katalog_positionen katalog_positionen_gewerk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.katalog_positionen
    ADD CONSTRAINT katalog_positionen_gewerk_id_fkey FOREIGN KEY (gewerk_id) REFERENCES public.gewerke(id);


--
-- Name: katalog_preise katalog_preise_produkt_slug_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.katalog_preise
    ADD CONSTRAINT katalog_preise_produkt_slug_fkey FOREIGN KEY (produkt_slug) REFERENCES public.katalog_produkte(slug) ON DELETE CASCADE;


--
-- Name: katalog_varianten katalog_varianten_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.katalog_varianten
    ADD CONSTRAINT katalog_varianten_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.katalog_positionen(id) ON DELETE CASCADE;


--
-- Name: ki_anfragen_log ki_anfragen_log_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_anfragen_log
    ADD CONSTRAINT ki_anfragen_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: ki_content ki_content_empfehlung_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_content
    ADD CONSTRAINT ki_content_empfehlung_id_fkey FOREIGN KEY (empfehlung_id) REFERENCES public.ki_empfehlungen(id) ON DELETE SET NULL;


--
-- Name: ki_historische_positionen ki_historische_positionen_dokument_nr_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_historische_positionen
    ADD CONSTRAINT ki_historische_positionen_dokument_nr_fkey FOREIGN KEY (dokument_nr) REFERENCES public.ki_historische_vorgaenge(dokument_nr) ON DELETE CASCADE;


--
-- Name: ki_visualisierungen ki_visualisierungen_angebot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ki_visualisierungen
    ADD CONSTRAINT ki_visualisierungen_angebot_id_fkey FOREIGN KEY (angebot_id) REFERENCES public.angebote(id);


--
-- Name: kunden_ansprechpartner kunden_ansprechpartner_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden_ansprechpartner
    ADD CONSTRAINT kunden_ansprechpartner_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: kunden kunden_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden
    ADD CONSTRAINT kunden_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: kunden_dokumente kunden_dokumente_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden_dokumente
    ADD CONSTRAINT kunden_dokumente_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id);


--
-- Name: kunden_dokumente kunden_dokumente_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden_dokumente
    ADD CONSTRAINT kunden_dokumente_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: kunden_mitglieder kunden_mitglieder_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden_mitglieder
    ADD CONSTRAINT kunden_mitglieder_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: kunden_notizen kunden_notizen_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden_notizen
    ADD CONSTRAINT kunden_notizen_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id);


--
-- Name: kunden_notizen kunden_notizen_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden_notizen
    ADD CONSTRAINT kunden_notizen_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: kunden_objekte kunden_objekte_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kunden_objekte
    ADD CONSTRAINT kunden_objekte_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: lead_befund_punkte lead_befund_punkte_befund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_befund_punkte
    ADD CONSTRAINT lead_befund_punkte_befund_id_fkey FOREIGN KEY (befund_id) REFERENCES public.lead_befunde(id) ON DELETE CASCADE;


--
-- Name: lead_befunde lead_befunde_created_by_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_befunde
    ADD CONSTRAINT lead_befunde_created_by_kunde_id_fkey FOREIGN KEY (created_by_kunde_id) REFERENCES public.kunden(id) ON DELETE SET NULL;


--
-- Name: lead_befunde lead_befunde_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_befunde
    ADD CONSTRAINT lead_befunde_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_befunde lead_befunde_objekt_kontakt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_befunde
    ADD CONSTRAINT lead_befunde_objekt_kontakt_id_fkey FOREIGN KEY (objekt_kontakt_id) REFERENCES public.objekt_kontakte(id) ON DELETE SET NULL;


--
-- Name: lead_notizen lead_notizen_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_notizen
    ADD CONSTRAINT lead_notizen_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id);


--
-- Name: lead_notizen lead_notizen_kalender_termin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_notizen
    ADD CONSTRAINT lead_notizen_kalender_termin_id_fkey FOREIGN KEY (kalender_termin_id) REFERENCES public.kalender_termine(id) ON DELETE CASCADE;


--
-- Name: lead_notizen lead_notizen_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_notizen
    ADD CONSTRAINT lead_notizen_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_notizen lead_notizen_quelle_notiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_notizen
    ADD CONSTRAINT lead_notizen_quelle_notiz_id_fkey FOREIGN KEY (quelle_notiz_id) REFERENCES public.lead_notizen(id) ON DELETE CASCADE;


--
-- Name: lead_timeline lead_timeline_angebot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_timeline
    ADD CONSTRAINT lead_timeline_angebot_id_fkey FOREIGN KEY (angebot_id) REFERENCES public.angebote(id) ON DELETE SET NULL;


--
-- Name: lead_timeline lead_timeline_email_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_timeline
    ADD CONSTRAINT lead_timeline_email_log_id_fkey FOREIGN KEY (email_log_id) REFERENCES public.email_log(id) ON DELETE SET NULL;


--
-- Name: lead_timeline lead_timeline_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_timeline
    ADD CONSTRAINT lead_timeline_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: lead_timeline lead_timeline_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_timeline
    ADD CONSTRAINT lead_timeline_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: leads leads_ansprechpartner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_ansprechpartner_id_fkey FOREIGN KEY (ansprechpartner_id) REFERENCES public.kunden_ansprechpartner(id) ON DELETE SET NULL;


--
-- Name: leads leads_auftraggeber_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_auftraggeber_kunde_id_fkey FOREIGN KEY (auftraggeber_kunde_id) REFERENCES public.kunden(id) ON DELETE SET NULL;


--
-- Name: leads leads_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE SET NULL;


--
-- Name: leads leads_kunde_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_kunde_objekt_id_fkey FOREIGN KEY (kunde_objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE SET NULL;


--
-- Name: leads_status_history leads_status_history_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads_status_history
    ADD CONSTRAINT leads_status_history_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: leads_status_history leads_status_history_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads_status_history
    ADD CONSTRAINT leads_status_history_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: leads_status_history leads_status_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads_status_history
    ADD CONSTRAINT leads_status_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_zusammengefuehrt_in_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_zusammengefuehrt_in_fkey FOREIGN KEY (zusammengefuehrt_in) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: mieter_feedback mieter_feedback_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mieter_feedback
    ADD CONSTRAINT mieter_feedback_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE SET NULL;


--
-- Name: mieter_feedback mieter_feedback_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mieter_feedback
    ADD CONSTRAINT mieter_feedback_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: nachtraege nachtraege_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nachtraege
    ADD CONSTRAINT nachtraege_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE CASCADE;


--
-- Name: objekt_abos objekt_abos_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objekt_abos
    ADD CONSTRAINT objekt_abos_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: objekt_abos objekt_abos_kunde_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objekt_abos
    ADD CONSTRAINT objekt_abos_kunde_objekt_id_fkey FOREIGN KEY (kunde_objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE CASCADE;


--
-- Name: objekt_dokumente objekt_dokumente_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objekt_dokumente
    ADD CONSTRAINT objekt_dokumente_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: objekt_dokumente objekt_dokumente_kunde_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objekt_dokumente
    ADD CONSTRAINT objekt_dokumente_kunde_objekt_id_fkey FOREIGN KEY (kunde_objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE CASCADE;


--
-- Name: objekt_einheiten objekt_einheiten_kunde_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objekt_einheiten
    ADD CONSTRAINT objekt_einheiten_kunde_objekt_id_fkey FOREIGN KEY (kunde_objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE CASCADE;


--
-- Name: objekt_kontakte objekt_kontakte_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objekt_kontakte
    ADD CONSTRAINT objekt_kontakte_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: objekt_kontakte objekt_kontakte_kunde_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objekt_kontakte
    ADD CONSTRAINT objekt_kontakte_kunde_objekt_id_fkey FOREIGN KEY (kunde_objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE CASCADE;


--
-- Name: objekt_pruefpflichten objekt_pruefpflichten_kunde_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objekt_pruefpflichten
    ADD CONSTRAINT objekt_pruefpflichten_kunde_objekt_id_fkey FOREIGN KEY (kunde_objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE CASCADE;


--
-- Name: org_freigabe_log org_freigabe_log_angebot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_freigabe_log
    ADD CONSTRAINT org_freigabe_log_angebot_id_fkey FOREIGN KEY (angebot_id) REFERENCES public.angebote(id) ON DELETE SET NULL;


--
-- Name: org_freigabe_log org_freigabe_log_auftraggeber_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_freigabe_log
    ADD CONSTRAINT org_freigabe_log_auftraggeber_kunde_id_fkey FOREIGN KEY (auftraggeber_kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: org_freigabe_log org_freigabe_log_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_freigabe_log
    ADD CONSTRAINT org_freigabe_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: org_hausmeister org_hausmeister_org_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_hausmeister
    ADD CONSTRAINT org_hausmeister_org_kunde_id_fkey FOREIGN KEY (org_kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: org_hausmeister org_hausmeister_portal_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_hausmeister
    ADD CONSTRAINT org_hausmeister_portal_kunde_id_fkey FOREIGN KEY (portal_kunde_id) REFERENCES public.kunden(id) ON DELETE SET NULL;


--
-- Name: partner_bautagebuch_anfragen partner_bautagebuch_anfragen_angefordert_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_bautagebuch_anfragen
    ADD CONSTRAINT partner_bautagebuch_anfragen_angefordert_von_fkey FOREIGN KEY (angefordert_von) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: partner_bautagebuch_anfragen partner_bautagebuch_anfragen_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_bautagebuch_anfragen
    ADD CONSTRAINT partner_bautagebuch_anfragen_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: partner_bautagebuch_anfragen partner_bautagebuch_anfragen_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_bautagebuch_anfragen
    ADD CONSTRAINT partner_bautagebuch_anfragen_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE CASCADE;


--
-- Name: partner_dokumente partner_dokumente_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_dokumente
    ADD CONSTRAINT partner_dokumente_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: partner_dokumente partner_dokumente_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_dokumente
    ADD CONSTRAINT partner_dokumente_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id);


--
-- Name: partner_dokumente partner_dokumente_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_dokumente
    ADD CONSTRAINT partner_dokumente_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE CASCADE;


--
-- Name: partner_handwerker_migration partner_handwerker_migration_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_handwerker_migration
    ADD CONSTRAINT partner_handwerker_migration_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE CASCADE;


--
-- Name: partner_handwerker_migration partner_handwerker_migration_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_handwerker_migration
    ADD CONSTRAINT partner_handwerker_migration_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partner(id) ON DELETE CASCADE;


--
-- Name: partner partner_kategorie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_kategorie_id_fkey FOREIGN KEY (kategorie_id) REFERENCES public.partner_kategorien(id);


--
-- Name: partner_positions_anfragen partner_positions_anfragen_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_positions_anfragen
    ADD CONSTRAINT partner_positions_anfragen_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: partner_positions_anfragen partner_positions_anfragen_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_positions_anfragen
    ADD CONSTRAINT partner_positions_anfragen_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE CASCADE;


--
-- Name: partner_positions_anfragen partner_positions_anfragen_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_positions_anfragen
    ADD CONSTRAINT partner_positions_anfragen_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.auftrag_positionen(id) ON DELETE SET NULL;


--
-- Name: partner_todos partner_todos_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_todos
    ADD CONSTRAINT partner_todos_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE CASCADE;


--
-- Name: portal_einladungen portal_einladungen_bewohner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_einladungen
    ADD CONSTRAINT portal_einladungen_bewohner_id_fkey FOREIGN KEY (bewohner_id) REFERENCES public.einheit_bewohner(id) ON DELETE SET NULL;


--
-- Name: portal_einladungen portal_einladungen_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_einladungen
    ADD CONSTRAINT portal_einladungen_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: portal_einladungen portal_einladungen_einheit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_einladungen
    ADD CONSTRAINT portal_einladungen_einheit_id_fkey FOREIGN KEY (einheit_id) REFERENCES public.objekt_einheiten(id) ON DELETE SET NULL;


--
-- Name: portal_einladungen portal_einladungen_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_einladungen
    ADD CONSTRAINT portal_einladungen_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: portal_einladungen portal_einladungen_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_einladungen
    ADD CONSTRAINT portal_einladungen_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: portal_einladungen portal_einladungen_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_einladungen
    ADD CONSTRAINT portal_einladungen_objekt_id_fkey FOREIGN KEY (objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE SET NULL;


--
-- Name: portal_einladungen portal_einladungen_org_hausmeister_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_einladungen
    ADD CONSTRAINT portal_einladungen_org_hausmeister_id_fkey FOREIGN KEY (org_hausmeister_id) REFERENCES public.org_hausmeister(id) ON DELETE SET NULL;


--
-- Name: portal_einladungen portal_einladungen_portal_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_einladungen
    ADD CONSTRAINT portal_einladungen_portal_kunde_id_fkey FOREIGN KEY (portal_kunde_id) REFERENCES public.kunden(id) ON DELETE SET NULL;


--
-- Name: portal_notifications portal_notifications_empfaenger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_notifications
    ADD CONSTRAINT portal_notifications_empfaenger_user_id_fkey FOREIGN KEY (empfaenger_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: position_eintraege position_eintraege_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_eintraege
    ADD CONSTRAINT position_eintraege_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: position_eintraege position_eintraege_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_eintraege
    ADD CONSTRAINT position_eintraege_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.auftrag_positionen(id) ON DELETE CASCADE;


--
-- Name: position_material position_material_beleg_foto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_material
    ADD CONSTRAINT position_material_beleg_foto_id_fkey FOREIGN KEY (beleg_foto_id) REFERENCES public.eintrag_fotos(id) ON DELETE SET NULL;


--
-- Name: position_material position_material_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_material
    ADD CONSTRAINT position_material_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.auftrag_positionen(id) ON DELETE CASCADE;


--
-- Name: preislisten preislisten_gewerk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preislisten
    ADD CONSTRAINT preislisten_gewerk_id_fkey FOREIGN KEY (gewerk_id) REFERENCES public.gewerke(id) ON DELETE CASCADE;


--
-- Name: punch_list punch_list_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.punch_list
    ADD CONSTRAINT punch_list_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: punch_list punch_list_behoben_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.punch_list
    ADD CONSTRAINT punch_list_behoben_von_fkey FOREIGN KEY (behoben_von) REFERENCES public.handwerker(id) ON DELETE SET NULL;


--
-- Name: punch_list punch_list_gewerk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.punch_list
    ADD CONSTRAINT punch_list_gewerk_id_fkey FOREIGN KEY (gewerk_id) REFERENCES public.gewerke(id) ON DELETE SET NULL;


--
-- Name: punch_list punch_list_protokoll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.punch_list
    ADD CONSTRAINT punch_list_protokoll_id_fkey FOREIGN KEY (protokoll_id) REFERENCES public.auftrag_abnahmeprotokolle(id) ON DELETE SET NULL;


--
-- Name: push_prefs push_prefs_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_prefs
    ADD CONSTRAINT push_prefs_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: rechnungen rechnungen_angebot_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rechnungen
    ADD CONSTRAINT rechnungen_angebot_handwerker_id_fkey FOREIGN KEY (angebot_handwerker_id) REFERENCES public.angebot_handwerker(id) ON DELETE SET NULL;


--
-- Name: rechnungen rechnungen_angebot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rechnungen
    ADD CONSTRAINT rechnungen_angebot_id_fkey FOREIGN KEY (angebot_id) REFERENCES public.angebote(id);


--
-- Name: rechnungen rechnungen_ansprechpartner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rechnungen
    ADD CONSTRAINT rechnungen_ansprechpartner_id_fkey FOREIGN KEY (ansprechpartner_id) REFERENCES public.kunden_ansprechpartner(id) ON DELETE SET NULL;


--
-- Name: rechnungen rechnungen_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rechnungen
    ADD CONSTRAINT rechnungen_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id);


--
-- Name: rechnungen rechnungen_bezug_rechnung_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rechnungen
    ADD CONSTRAINT rechnungen_bezug_rechnung_id_fkey FOREIGN KEY (bezug_rechnung_id) REFERENCES public.rechnungen(id) ON DELETE SET NULL;


--
-- Name: rechnungen rechnungen_ersetzt_durch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rechnungen
    ADD CONSTRAINT rechnungen_ersetzt_durch_fkey FOREIGN KEY (ersetzt_durch) REFERENCES public.rechnungen(id) ON DELETE SET NULL;


--
-- Name: rechnungen rechnungen_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rechnungen
    ADD CONSTRAINT rechnungen_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id);


--
-- Name: rechnungen rechnungen_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rechnungen
    ADD CONSTRAINT rechnungen_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE SET NULL;


--
-- Name: rechnungen rechnungen_korrektur_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rechnungen
    ADD CONSTRAINT rechnungen_korrektur_von_fkey FOREIGN KEY (korrektur_von) REFERENCES public.rechnungen(id) ON DELETE SET NULL;


--
-- Name: rechnungen rechnungen_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rechnungen
    ADD CONSTRAINT rechnungen_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id);


--
-- Name: rechnungen rechnungen_kunde_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rechnungen
    ADD CONSTRAINT rechnungen_kunde_objekt_id_fkey FOREIGN KEY (kunde_objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE SET NULL;


--
-- Name: sammelrechnung_positionen sammelrechnung_positionen_kunde_objekt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sammelrechnung_positionen
    ADD CONSTRAINT sammelrechnung_positionen_kunde_objekt_id_fkey FOREIGN KEY (kunde_objekt_id) REFERENCES public.kunden_objekte(id) ON DELETE SET NULL;


--
-- Name: sammelrechnung_positionen sammelrechnung_positionen_objekt_abo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sammelrechnung_positionen
    ADD CONSTRAINT sammelrechnung_positionen_objekt_abo_id_fkey FOREIGN KEY (objekt_abo_id) REFERENCES public.objekt_abos(id) ON DELETE SET NULL;


--
-- Name: sammelrechnung_positionen sammelrechnung_positionen_sammelrechnung_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sammelrechnung_positionen
    ADD CONSTRAINT sammelrechnung_positionen_sammelrechnung_id_fkey FOREIGN KEY (sammelrechnung_id) REFERENCES public.sammelrechnungen(id) ON DELETE CASCADE;


--
-- Name: sammelrechnungen sammelrechnungen_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sammelrechnungen
    ADD CONSTRAINT sammelrechnungen_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE CASCADE;


--
-- Name: todos todos_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE SET NULL;


--
-- Name: todos todos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: todos todos_handwerker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_handwerker_id_fkey FOREIGN KEY (handwerker_id) REFERENCES public.handwerker(id) ON DELETE SET NULL;


--
-- Name: todos todos_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE SET NULL;


--
-- Name: todos todos_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: todos todos_zugewiesen_an_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_zugewiesen_an_fkey FOREIGN KEY (zugewiesen_an) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: user_profiles user_profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vor_baubeginn_protokolle vor_baubeginn_protokolle_auftrag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vor_baubeginn_protokolle
    ADD CONSTRAINT vor_baubeginn_protokolle_auftrag_id_fkey FOREIGN KEY (auftrag_id) REFERENCES public.auftraege(id) ON DELETE CASCADE;


--
-- Name: vor_baubeginn_protokolle vor_baubeginn_protokolle_erstellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vor_baubeginn_protokolle
    ADD CONSTRAINT vor_baubeginn_protokolle_erstellt_von_fkey FOREIGN KEY (erstellt_von) REFERENCES auth.users(id);


--
-- Name: vorab_formulare vorab_formulare_ausgefuellt_von_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vorab_formulare
    ADD CONSTRAINT vorab_formulare_ausgefuellt_von_fkey FOREIGN KEY (ausgefuellt_von) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: vorab_formulare vorab_formulare_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vorab_formulare
    ADD CONSTRAINT vorab_formulare_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: vorgang_kommentare vorgang_kommentare_kunde_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vorgang_kommentare
    ADD CONSTRAINT vorgang_kommentare_kunde_id_fkey FOREIGN KEY (kunde_id) REFERENCES public.kunden(id) ON DELETE SET NULL;


--
-- Name: vorgang_kommentare vorgang_kommentare_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vorgang_kommentare
    ADD CONSTRAINT vorgang_kommentare_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: abnahmeprotokoll; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.abnahmeprotokoll ENABLE ROW LEVEL SECURITY;

--
-- Name: akten_notizen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.akten_notizen ENABLE ROW LEVEL SECURITY;

--
-- Name: akten_notizen akten_notizen_crm_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY akten_notizen_crm_select ON public.akten_notizen FOR SELECT TO authenticated USING (public.is_crm_staff());


--
-- Name: akten_notizen akten_notizen_org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY akten_notizen_org_select ON public.akten_notizen FOR SELECT TO authenticated USING ((kunde_id = public.portal_kunde_id()));


--
-- Name: akten_notizen akten_notizen_org_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY akten_notizen_org_write ON public.akten_notizen TO authenticated USING (((kunde_id = public.portal_kunde_id()) AND public.portal_org_can_write())) WITH CHECK (((kunde_id = public.portal_kunde_id()) AND public.portal_org_can_write()));


--
-- Name: akten_notizen akten_notizen_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY akten_notizen_service ON public.akten_notizen TO service_role USING (true) WITH CHECK (true);


--
-- Name: angebot_handwerker; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.angebot_handwerker ENABLE ROW LEVEL SECURITY;

--
-- Name: angebot_handwerker angebot_handwerker_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY angebot_handwerker_crm_staff_all ON public.angebot_handwerker TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: angebot_handwerker angebot_handwerker_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY angebot_handwerker_portal_select ON public.angebot_handwerker FOR SELECT TO authenticated USING (((handwerker_id = public.portal_handwerker_id()) AND (gesendet_at IS NOT NULL)));


--
-- Name: angebot_handwerker angebot_handwerker_portal_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY angebot_handwerker_portal_update ON public.angebot_handwerker FOR UPDATE TO authenticated USING (((NOT public.is_crm_staff()) AND (handwerker_id = public.portal_handwerker_id()) AND (gesendet_at IS NOT NULL))) WITH CHECK (((NOT public.is_crm_staff()) AND (handwerker_id = public.portal_handwerker_id()) AND (gesendet_at IS NOT NULL)));


--
-- Name: angebot_ki_beispiele; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.angebot_ki_beispiele ENABLE ROW LEVEL SECURITY;

--
-- Name: angebot_ki_beispiele angebot_ki_beispiele_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY angebot_ki_beispiele_auth_all ON public.angebot_ki_beispiele USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: angebot_vorlagen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.angebot_vorlagen ENABLE ROW LEVEL SECURITY;

--
-- Name: angebote; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.angebote ENABLE ROW LEVEL SECURITY;

--
-- Name: angebote angebote_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY angebote_crm_staff_all ON public.angebote TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: angebote angebote_portal_handwerker_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY angebote_portal_handwerker_select ON public.angebote FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (id IN ( SELECT public.portal_handwerker_angebot_ids() AS portal_handwerker_angebot_ids))));


--
-- Name: angebote angebote_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY angebote_portal_select ON public.angebote FOR SELECT TO authenticated USING (((NOT public.is_crm_staff()) AND (lead_id IN ( SELECT public.portal_kunde_lead_ids() AS portal_kunde_lead_ids)) AND ((gesendet_kunde_at IS NOT NULL) OR (gesendet_am IS NOT NULL) OR (status_einfach = ANY (ARRAY['gesendet'::text, 'angenommen'::text, 'abgelehnt'::text, 'abgelaufen'::text])) OR ((status)::text = ANY (ARRAY['gesendet_kunde'::text, 'kunde_akzeptiert'::text, 'kunde_abgelehnt'::text, 'angenommen'::text, 'abgelehnt'::text])))));


--
-- Name: audit_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_events audit_events_org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_events_org_select ON public.audit_events FOR SELECT TO authenticated USING ((kunde_id = public.portal_kunde_id()));


--
-- Name: audit_events audit_events_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_events_service ON public.audit_events TO service_role USING (true) WITH CHECK (true);


--
-- Name: auftraege; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftraege ENABLE ROW LEVEL SECURITY;

--
-- Name: auftraege auftraege_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftraege_crm_staff_all ON public.auftraege TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: auftraege auftraege_portal_handwerker_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftraege_portal_handwerker_select ON public.auftraege FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (id IN ( SELECT ah.auftrag_id
   FROM public.auftrag_handwerker ah
  WHERE ((ah.handwerker_id = public.portal_handwerker_id()) AND (lower(COALESCE(ah.status, ''::text)) <> ALL (ARRAY['ersetzt'::text, 'abgelehnt'::text])))
UNION
 SELECT ap.auftrag_id
   FROM public.auftrag_positionen ap
  WHERE (ap.handwerker_id = public.portal_handwerker_id())))));


--
-- Name: auftraege auftraege_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftraege_portal_select ON public.auftraege FOR SELECT TO authenticated USING (((kunde_id = public.portal_kunde_id()) OR (lead_id IN ( SELECT public.portal_kunde_lead_ids() AS portal_kunde_lead_ids))));


--
-- Name: auftrag_abnahmeprotokolle; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_abnahmeprotokolle ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_baustellen_dokumente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_baustellen_dokumente ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_baustellen_dokumente auftrag_baustellen_dokumente_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_baustellen_dokumente_auth_all ON public.auftrag_baustellen_dokumente USING ((auth.role() = 'authenticated'::text));


--
-- Name: auftrag_bautagebuch_eintraege auftrag_bautagebuch_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_bautagebuch_crm_staff_all ON public.auftrag_bautagebuch_eintraege TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: auftrag_bautagebuch_eintraege; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_bautagebuch_eintraege ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_bautagebuch_eintraege auftrag_bautagebuch_portal_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_bautagebuch_portal_insert ON public.auftrag_bautagebuch_eintraege FOR INSERT TO authenticated WITH CHECK ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id()) AND (auftrag_id IN ( SELECT ah.auftrag_id
   FROM public.auftrag_handwerker ah
  WHERE ((ah.handwerker_id = public.portal_handwerker_id()) AND (lower(COALESCE(ah.status, ''::text)) <> ALL (ARRAY['ersetzt'::text, 'abgelehnt'::text])))
UNION
 SELECT ap.auftrag_id
   FROM public.auftrag_positionen ap
  WHERE (ap.handwerker_id = public.portal_handwerker_id())))));


--
-- Name: auftrag_bautagebuch_eintraege auftrag_bautagebuch_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_bautagebuch_portal_select ON public.auftrag_bautagebuch_eintraege FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND ((handwerker_id = public.portal_handwerker_id()) OR (auftrag_id IN ( SELECT ah.auftrag_id
   FROM public.auftrag_handwerker ah
  WHERE ((ah.handwerker_id = public.portal_handwerker_id()) AND (lower(COALESCE(ah.status, ''::text)) <> ALL (ARRAY['ersetzt'::text, 'abgelehnt'::text])))
UNION
 SELECT ap.auftrag_id
   FROM public.auftrag_positionen ap
  WHERE (ap.handwerker_id = public.portal_handwerker_id()))))));


--
-- Name: auftrag_bautagebuch_eintraege auftrag_bautagebuch_portal_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_bautagebuch_portal_update ON public.auftrag_bautagebuch_eintraege FOR UPDATE TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id()))) WITH CHECK ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: auftrag_bautagesberichte; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_bautagesberichte ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_bautagesberichte auftrag_bautagesberichte_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_bautagesberichte_auth_all ON public.auftrag_bautagesberichte USING ((auth.role() = 'authenticated'::text));


--
-- Name: auftrag_fachdoku_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_fachdoku_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_fachdoku_slots auftrag_fachdoku_slots_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_fachdoku_slots_crm_staff_all ON public.auftrag_fachdoku_slots TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: auftrag_fachdoku_slots auftrag_fachdoku_slots_portal_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_fachdoku_slots_portal_insert ON public.auftrag_fachdoku_slots FOR INSERT TO authenticated WITH CHECK ((public.is_crm_staff() OR (public.is_portal_handwerker() AND (EXISTS ( SELECT 1
   FROM public.auftrag_handwerker ah
  WHERE ((ah.auftrag_id = auftrag_fachdoku_slots.auftrag_id) AND (ah.handwerker_id = public.portal_handwerker_id())))))));


--
-- Name: auftrag_fachdoku_slots auftrag_fachdoku_slots_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_fachdoku_slots_portal_select ON public.auftrag_fachdoku_slots FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (EXISTS ( SELECT 1
   FROM public.auftrag_handwerker ah
  WHERE ((ah.auftrag_id = auftrag_fachdoku_slots.auftrag_id) AND (ah.handwerker_id = public.portal_handwerker_id()))))));


--
-- Name: auftrag_fachdoku_slots auftrag_fachdoku_slots_portal_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_fachdoku_slots_portal_update ON public.auftrag_fachdoku_slots FOR UPDATE TO authenticated USING ((public.is_portal_handwerker() AND (EXISTS ( SELECT 1
   FROM public.auftrag_handwerker ah
  WHERE ((ah.auftrag_id = auftrag_fachdoku_slots.auftrag_id) AND (ah.handwerker_id = public.portal_handwerker_id())))))) WITH CHECK ((public.is_portal_handwerker() AND (EXISTS ( SELECT 1
   FROM public.auftrag_handwerker ah
  WHERE ((ah.auftrag_id = auftrag_fachdoku_slots.auftrag_id) AND (ah.handwerker_id = public.portal_handwerker_id()))))));


--
-- Name: auftrag_handwerker; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_handwerker ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_handwerker auftrag_handwerker_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_handwerker_crm_staff_all ON public.auftrag_handwerker TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: auftrag_handwerker auftrag_handwerker_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_handwerker_portal_select ON public.auftrag_handwerker FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: auftrag_handwerker auftrag_handwerker_portal_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_handwerker_portal_update ON public.auftrag_handwerker FOR UPDATE TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id()) AND (lower(COALESCE(status, ''::text)) <> ALL (ARRAY['ersetzt'::text, 'abgelehnt'::text])))) WITH CHECK ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id()) AND (lower(COALESCE(status, ''::text)) <> ALL (ARRAY['ersetzt'::text, 'abgelehnt'::text]))));


--
-- Name: auftrag_handwerker auftrag_handwerker_portal_vertrag_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_handwerker_portal_vertrag_update ON public.auftrag_handwerker FOR UPDATE TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id()) AND (lower(COALESCE(status, ''::text)) <> ALL (ARRAY['ersetzt'::text, 'abgelehnt'::text])))) WITH CHECK ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id()) AND (lower(COALESCE(status, ''::text)) <> ALL (ARRAY['ersetzt'::text, 'abgelehnt'::text]))));


--
-- Name: auftrag_milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_position_notizen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_position_notizen ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_positionen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_positionen ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_positionen auftrag_positionen_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_positionen_crm_staff_all ON public.auftrag_positionen TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: auftrag_positionen auftrag_positionen_portal_handwerker_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_positionen_portal_handwerker_select ON public.auftrag_positionen FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: auftrag_positionen auftrag_positionen_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_positionen_portal_select ON public.auftrag_positionen FOR SELECT TO authenticated USING (((fuer_kunde_sichtbar = true) AND (auftrag_id IN ( SELECT a.id
   FROM public.auftraege a
  WHERE ((a.kunde_id = public.portal_kunde_id()) OR (a.lead_id IN ( SELECT public.portal_kunde_lead_ids() AS portal_kunde_lead_ids)))))));


--
-- Name: auftrag_regiearbeiten; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_regiearbeiten ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_regiearbeiten auftrag_regiearbeiten_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_regiearbeiten_auth_all ON public.auftrag_regiearbeiten USING ((auth.role() = 'authenticated'::text));


--
-- Name: auftrag_rueckfragen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_rueckfragen ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_rueckfragen auftrag_rueckfragen_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_rueckfragen_service ON public.auftrag_rueckfragen TO service_role USING (true) WITH CHECK (true);


--
-- Name: auftrag_terminslots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_terminslots ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_terminslots auftrag_terminslots_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_terminslots_service ON public.auftrag_terminslots TO service_role USING (true) WITH CHECK (true);


--
-- Name: auftrag_timeline; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_timeline ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_timeline auftrag_timeline_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_timeline_auth_all ON public.auftrag_timeline USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: auftrag_timeline auftrag_timeline_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_timeline_portal_select ON public.auftrag_timeline FOR SELECT TO authenticated USING (((fuer_kunde_freigegeben = true) AND (auftrag_id IN ( SELECT a.id
   FROM public.auftraege a
  WHERE ((a.kunde_id = public.portal_kunde_id()) OR (a.lead_id IN ( SELECT public.portal_kunde_lead_ids() AS portal_kunde_lead_ids)))))));


--
-- Name: auftrag_wochenberichte; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_wochenberichte ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_wochenberichte auftrag_wochenberichte_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auftrag_wochenberichte_auth_all ON public.auftrag_wochenberichte USING ((auth.role() = 'authenticated'::text));


--
-- Name: auftrag_zahlungsplaene; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_zahlungsplaene ENABLE ROW LEVEL SECURITY;

--
-- Name: auftrag_zahlungsplan_positionen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auftrag_zahlungsplan_positionen ENABLE ROW LEVEL SECURITY;

--
-- Name: angebot_handwerker auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.angebot_handwerker USING ((auth.role() = 'authenticated'::text));


--
-- Name: angebot_vorlagen auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.angebot_vorlagen USING ((auth.role() = 'authenticated'::text));


--
-- Name: angebote auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.angebote USING ((auth.role() = 'authenticated'::text));


--
-- Name: auftraege auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.auftraege USING ((auth.role() = 'authenticated'::text));


--
-- Name: auftrag_abnahmeprotokolle auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.auftrag_abnahmeprotokolle USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: auftrag_handwerker auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.auftrag_handwerker USING ((auth.role() = 'authenticated'::text));


--
-- Name: auftrag_milestones auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.auftrag_milestones USING ((auth.role() = 'authenticated'::text));


--
-- Name: auftrag_position_notizen auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.auftrag_position_notizen USING ((auth.role() = 'authenticated'::text));


--
-- Name: auftrag_positionen auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.auftrag_positionen USING ((auth.role() = 'authenticated'::text));


--
-- Name: auftrag_timeline auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.auftrag_timeline USING ((auth.role() = 'authenticated'::text));


--
-- Name: baustopps auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.baustopps USING ((auth.role() = 'authenticated'::text));


--
-- Name: buergschaften auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.buergschaften USING ((auth.role() = 'authenticated'::text));


--
-- Name: datenschutz_anfragen auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.datenschutz_anfragen USING ((auth.role() = 'authenticated'::text));


--
-- Name: datenschutz_fristen auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.datenschutz_fristen USING ((auth.role() = 'authenticated'::text));


--
-- Name: datenschutz_loeschlog auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.datenschutz_loeschlog USING ((auth.role() = 'authenticated'::text));


--
-- Name: einbehalte auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.einbehalte USING ((auth.role() = 'authenticated'::text));


--
-- Name: eingangsrechnungen auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.eingangsrechnungen USING ((auth.role() = 'authenticated'::text));


--
-- Name: email_log auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.email_log USING ((auth.role() = 'authenticated'::text));


--
-- Name: formular_eintraege auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.formular_eintraege USING ((auth.role() = 'authenticated'::text));


--
-- Name: formular_templates auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.formular_templates USING ((auth.role() = 'authenticated'::text));


--
-- Name: gewerke auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.gewerke USING ((auth.role() = 'authenticated'::text));


--
-- Name: handwerker auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.handwerker USING ((auth.role() = 'authenticated'::text));


--
-- Name: hw_formular_einreichungen auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.hw_formular_einreichungen USING ((auth.role() = 'authenticated'::text));


--
-- Name: hw_formular_tabs auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.hw_formular_tabs USING ((auth.role() = 'authenticated'::text));


--
-- Name: kalender_termine auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.kalender_termine USING ((auth.role() = 'authenticated'::text));


--
-- Name: kunden auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.kunden USING ((auth.role() = 'authenticated'::text));


--
-- Name: kunden_dokumente auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.kunden_dokumente USING ((auth.role() = 'authenticated'::text));


--
-- Name: kunden_notizen auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.kunden_notizen USING ((auth.role() = 'authenticated'::text));


--
-- Name: lead_notizen auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.lead_notizen USING ((auth.role() = 'authenticated'::text));


--
-- Name: leads auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.leads USING ((auth.role() = 'authenticated'::text));


--
-- Name: leads_status_history auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.leads_status_history USING ((auth.role() = 'authenticated'::text));


--
-- Name: nachtraege auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.nachtraege USING ((auth.role() = 'authenticated'::text));


--
-- Name: partner auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.partner USING ((auth.role() = 'authenticated'::text));


--
-- Name: partner_dokumente auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.partner_dokumente USING ((auth.role() = 'authenticated'::text));


--
-- Name: preislisten auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.preislisten USING ((auth.role() = 'authenticated'::text));


--
-- Name: rechnungen auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.rechnungen USING ((auth.role() = 'authenticated'::text));


--
-- Name: user_profiles auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.user_profiles USING ((auth.role() = 'authenticated'::text));


--
-- Name: vor_baubeginn_protokolle auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.vor_baubeginn_protokolle USING ((auth.role() = 'authenticated'::text));


--
-- Name: vorab_formulare auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_all ON public.vorab_formulare USING ((auth.role() = 'authenticated'::text));


--
-- Name: baustopps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.baustopps ENABLE ROW LEVEL SECURITY;

--
-- Name: bautagebuch; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bautagebuch ENABLE ROW LEVEL SECURITY;

--
-- Name: bautagebuch bautagebuch_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bautagebuch_portal_select ON public.bautagebuch FOR SELECT TO authenticated USING (((NOT public.is_crm_staff()) AND (fuer_kunde_sichtbar = true) AND (auftrag_id IN ( SELECT a.id
   FROM public.auftraege a
  WHERE ((a.kunde_id = public.portal_kunde_id()) OR (a.lead_id IN ( SELECT public.portal_kunde_lead_ids() AS portal_kunde_lead_ids)))))));


--
-- Name: buergschaften; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.buergschaften ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_dokument_typen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_dokument_typen ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_dokument_typen compliance_dokument_typen_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY compliance_dokument_typen_crm_staff_all ON public.compliance_dokument_typen TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: compliance_dokument_typen compliance_dokument_typen_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY compliance_dokument_typen_portal_select ON public.compliance_dokument_typen FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (aktiv = true) AND (scope = ANY (ARRAY['bauprojekt'::text, 'gewerk'::text, 'stamm'::text]))));


--
-- Name: copilot_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.copilot_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: copilot_alerts copilot_alerts_deny_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY copilot_alerts_deny_all ON public.copilot_alerts USING (false) WITH CHECK (false);


--
-- Name: copilot_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: copilot_messages copilot_messages_deny_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY copilot_messages_deny_all ON public.copilot_messages TO authenticated USING (false) WITH CHECK (false);


--
-- Name: angebote crm_angebote_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crm_angebote_all ON public.angebote USING ((auth.role() = 'authenticated'::text));


--
-- Name: auftraege crm_auftraege_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crm_auftraege_all ON public.auftraege USING ((auth.role() = 'authenticated'::text));


--
-- Name: bautagebuch crm_bautagebuch_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crm_bautagebuch_all ON public.bautagebuch USING ((auth.role() = 'authenticated'::text));


--
-- Name: crm_impersonation_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crm_impersonation_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: kunden crm_kunden_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crm_kunden_all ON public.kunden USING ((auth.role() = 'authenticated'::text));


--
-- Name: leads crm_leads_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crm_leads_all ON public.leads USING ((auth.role() = 'authenticated'::text));


--
-- Name: crm_notification_reads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crm_notification_reads ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_notification_reads crm_notification_reads_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crm_notification_reads_own ON public.crm_notification_reads TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: auftrag_positionen crm_positionen_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crm_positionen_all ON public.auftrag_positionen USING ((auth.role() = 'authenticated'::text));


--
-- Name: crm_push_prefs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crm_push_prefs ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_push_prefs crm_push_prefs_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crm_push_prefs_own ON public.crm_push_prefs TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: crm_push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crm_push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_push_subscriptions crm_push_subscriptions_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crm_push_subscriptions_own ON public.crm_push_subscriptions TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: custom_field_definitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_field_definitions custom_field_definitions_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY custom_field_definitions_auth_all ON public.custom_field_definitions USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: custom_field_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_field_values custom_field_values_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY custom_field_values_auth_all ON public.custom_field_values USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: datenschutz_anfragen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.datenschutz_anfragen ENABLE ROW LEVEL SECURITY;

--
-- Name: datenschutz_fristen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.datenschutz_fristen ENABLE ROW LEVEL SECURITY;

--
-- Name: datenschutz_loeschlog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.datenschutz_loeschlog ENABLE ROW LEVEL SECURITY;

--
-- Name: datenschutz_vvt; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.datenschutz_vvt ENABLE ROW LEVEL SECURITY;

--
-- Name: datenschutz_vvt datenschutz_vvt_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY datenschutz_vvt_auth_all ON public.datenschutz_vvt USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: eigentuemer_objekte; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.eigentuemer_objekte ENABLE ROW LEVEL SECURITY;

--
-- Name: eigentuemer_objekte eigentuemer_objekte_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY eigentuemer_objekte_select_own ON public.eigentuemer_objekte FOR SELECT TO authenticated USING ((kunde_id IN ( SELECT kunden.id
   FROM public.kunden
  WHERE (kunden.auth_user_id = auth.uid()))));


--
-- Name: eigentuemer_objekte eigentuemer_objekte_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY eigentuemer_objekte_service ON public.eigentuemer_objekte TO service_role USING (true) WITH CHECK (true);


--
-- Name: einbehalte; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.einbehalte ENABLE ROW LEVEL SECURITY;

--
-- Name: eingangsrechnungen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.eingangsrechnungen ENABLE ROW LEVEL SECURITY;

--
-- Name: einheit_bewohner; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.einheit_bewohner ENABLE ROW LEVEL SECURITY;

--
-- Name: einheit_bewohner einheit_bewohner_crm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY einheit_bewohner_crm ON public.einheit_bewohner TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: einheit_bewohner einheit_bewohner_org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY einheit_bewohner_org_select ON public.einheit_bewohner FOR SELECT TO authenticated USING ((kunde_id = public.portal_kunde_id()));


--
-- Name: einheit_bewohner einheit_bewohner_org_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY einheit_bewohner_org_write ON public.einheit_bewohner TO authenticated USING (((kunde_id = public.portal_kunde_id()) AND public.portal_org_can_write())) WITH CHECK (((kunde_id = public.portal_kunde_id()) AND public.portal_org_can_write()));


--
-- Name: einheit_bewohner einheit_bewohner_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY einheit_bewohner_service ON public.einheit_bewohner TO service_role USING (true) WITH CHECK (true);


--
-- Name: einstellungen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.einstellungen ENABLE ROW LEVEL SECURITY;

--
-- Name: einstellungen einstellungen_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY einstellungen_auth_all ON public.einstellungen USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: eintrag_fotos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.eintrag_fotos ENABLE ROW LEVEL SECURITY;

--
-- Name: eintrag_fotos eintrag_fotos_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY eintrag_fotos_crm_staff_all ON public.eintrag_fotos TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: eintrag_fotos eintrag_fotos_portal_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY eintrag_fotos_portal_insert ON public.eintrag_fotos FOR INSERT TO authenticated WITH CHECK ((public.is_portal_handwerker() AND (eintrag_id IN ( SELECT pe.id
   FROM (public.position_eintraege pe
     JOIN public.auftrag_positionen ap ON ((ap.id = pe.position_id)))
  WHERE (ap.handwerker_id = public.portal_handwerker_id())))));


--
-- Name: eintrag_fotos eintrag_fotos_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY eintrag_fotos_portal_select ON public.eintrag_fotos FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (eintrag_id IN ( SELECT pe.id
   FROM (public.position_eintraege pe
     JOIN public.auftrag_positionen ap ON ((ap.id = pe.position_id)))
  WHERE (ap.handwerker_id = public.portal_handwerker_id())))));


--
-- Name: email_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

--
-- Name: email_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: email_logs email_logs_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY email_logs_auth_all ON public.email_logs USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: formular_eintraege; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.formular_eintraege ENABLE ROW LEVEL SECURITY;

--
-- Name: formular_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.formular_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: fremd_vorgaenge; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fremd_vorgaenge ENABLE ROW LEVEL SECURITY;

--
-- Name: fremd_vorgaenge fremd_vorgaenge_crm_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fremd_vorgaenge_crm_select ON public.fremd_vorgaenge FOR SELECT TO authenticated USING (public.is_crm_staff());


--
-- Name: fremd_vorgaenge fremd_vorgaenge_org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fremd_vorgaenge_org_select ON public.fremd_vorgaenge FOR SELECT TO authenticated USING ((kunde_id = public.portal_kunde_id()));


--
-- Name: fremd_vorgaenge fremd_vorgaenge_org_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fremd_vorgaenge_org_write ON public.fremd_vorgaenge TO authenticated USING (((kunde_id = public.portal_kunde_id()) AND public.portal_org_can_write())) WITH CHECK (((kunde_id = public.portal_kunde_id()) AND public.portal_org_can_write()));


--
-- Name: fremd_vorgaenge fremd_vorgaenge_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fremd_vorgaenge_service ON public.fremd_vorgaenge TO service_role USING (true) WITH CHECK (true);


--
-- Name: funnel_portal_otp; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.funnel_portal_otp ENABLE ROW LEVEL SECURITY;

--
-- Name: gewaehrleistungen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gewaehrleistungen ENABLE ROW LEVEL SECURITY;

--
-- Name: gewerke; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gewerke ENABLE ROW LEVEL SECURITY;

--
-- Name: gewerke gewerke_portal_handwerker_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gewerke_portal_handwerker_select ON public.gewerke FOR SELECT TO authenticated USING ((public.is_portal_handwerker() OR public.is_crm_staff()));


--
-- Name: gpt_raum_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gpt_raum_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: gpt_raum_sessions gpt_raum_sessions_service_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gpt_raum_sessions_service_all ON public.gpt_raum_sessions TO service_role USING (true) WITH CHECK (true);


--
-- Name: handwerker; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.handwerker ENABLE ROW LEVEL SECURITY;

--
-- Name: handwerker_bewertungen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.handwerker_bewertungen ENABLE ROW LEVEL SECURITY;

--
-- Name: handwerker_bewertungen handwerker_bewertungen_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY handwerker_bewertungen_auth_all ON public.handwerker_bewertungen USING ((auth.role() = 'authenticated'::text));


--
-- Name: handwerker handwerker_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY handwerker_crm_staff_all ON public.handwerker TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: handwerker handwerker_portal_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY handwerker_portal_select_own ON public.handwerker FOR SELECT TO authenticated USING ((auth_user_id = auth.uid()));


--
-- Name: handwerker handwerker_portal_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY handwerker_portal_update_own ON public.handwerker FOR UPDATE TO authenticated USING ((auth_user_id = auth.uid())) WITH CHECK ((auth_user_id = auth.uid()));


--
-- Name: handwerker_vertraege; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.handwerker_vertraege ENABLE ROW LEVEL SECURITY;

--
-- Name: handwerker_vertraege handwerker_vertraege_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY handwerker_vertraege_auth_all ON public.handwerker_vertraege USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: handwerker_vertraege handwerker_vertraege_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY handwerker_vertraege_crm_staff_all ON public.handwerker_vertraege TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: handwerker_vertraege handwerker_vertraege_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY handwerker_vertraege_portal_select ON public.handwerker_vertraege FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: hausmeister_objekte; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hausmeister_objekte ENABLE ROW LEVEL SECURITY;

--
-- Name: hausmeister_objekte hausmeister_objekte_hm_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hausmeister_objekte_hm_select ON public.hausmeister_objekte FOR SELECT TO authenticated USING ((org_hausmeister_id IN ( SELECT hm.id
   FROM public.org_hausmeister hm
  WHERE (hm.portal_kunde_id IN ( SELECT kunden.id
           FROM public.kunden
          WHERE (kunden.auth_user_id = auth.uid()))))));


--
-- Name: hausmeister_objekte hausmeister_objekte_org_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hausmeister_objekte_org_all ON public.hausmeister_objekte TO authenticated USING ((org_hausmeister_id IN ( SELECT org_hausmeister.id
   FROM public.org_hausmeister
  WHERE (org_hausmeister.org_kunde_id IN ( SELECT kunden.id
           FROM public.kunden
          WHERE (kunden.auth_user_id = auth.uid())
        UNION
         SELECT kunden_mitglieder.kunde_id
           FROM public.kunden_mitglieder
          WHERE (kunden_mitglieder.auth_user_id = auth.uid())))))) WITH CHECK ((org_hausmeister_id IN ( SELECT org_hausmeister.id
   FROM public.org_hausmeister
  WHERE (org_hausmeister.org_kunde_id IN ( SELECT kunden.id
           FROM public.kunden
          WHERE (kunden.auth_user_id = auth.uid())
        UNION
         SELECT kunden_mitglieder.kunde_id
           FROM public.kunden_mitglieder
          WHERE (kunden_mitglieder.auth_user_id = auth.uid()))))));


--
-- Name: hausmeister_objekte hausmeister_objekte_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hausmeister_objekte_service ON public.hausmeister_objekte TO service_role USING (true) WITH CHECK (true);


--
-- Name: hv_calendar_feeds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hv_calendar_feeds ENABLE ROW LEVEL SECURITY;

--
-- Name: hv_calendar_feeds hv_calendar_feeds_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hv_calendar_feeds_org ON public.hv_calendar_feeds TO authenticated USING (((kunde_id = public.portal_kunde_id()) AND (auth_user_id = auth.uid()))) WITH CHECK (((kunde_id = public.portal_kunde_id()) AND (auth_user_id = auth.uid())));


--
-- Name: hv_calendar_feeds hv_calendar_feeds_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hv_calendar_feeds_service ON public.hv_calendar_feeds TO service_role USING (true) WITH CHECK (true);


--
-- Name: hv_notification_prefs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hv_notification_prefs ENABLE ROW LEVEL SECURITY;

--
-- Name: hv_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hv_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: hv_notifications hv_notifications_org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hv_notifications_org_select ON public.hv_notifications FOR SELECT TO authenticated USING ((kunde_id = public.portal_kunde_id()));


--
-- Name: hv_notifications hv_notifications_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hv_notifications_service ON public.hv_notifications TO service_role USING (true) WITH CHECK (true);


--
-- Name: hv_portal_abnahmen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hv_portal_abnahmen ENABLE ROW LEVEL SECURITY;

--
-- Name: hw_formular_einreichungen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hw_formular_einreichungen ENABLE ROW LEVEL SECURITY;

--
-- Name: hw_formular_tabs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hw_formular_tabs ENABLE ROW LEVEL SECURITY;

--
-- Name: kalender_termine; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kalender_termine ENABLE ROW LEVEL SECURITY;

--
-- Name: kalender_termine kalender_termine_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kalender_termine_auth_all ON public.kalender_termine USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: katalog_lernsignale; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.katalog_lernsignale ENABLE ROW LEVEL SECURITY;

--
-- Name: katalog_lernsignale katalog_lernsignale_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY katalog_lernsignale_crm_staff_all ON public.katalog_lernsignale TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: katalog_positionen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.katalog_positionen ENABLE ROW LEVEL SECURITY;

--
-- Name: katalog_positionen katalog_positionen_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY katalog_positionen_crm_staff_all ON public.katalog_positionen TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: katalog_preise; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.katalog_preise ENABLE ROW LEVEL SECURITY;

--
-- Name: katalog_preise katalog_preise_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY katalog_preise_read ON public.katalog_preise FOR SELECT TO authenticated USING ((aktiv = true));


--
-- Name: katalog_preise katalog_preise_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY katalog_preise_service ON public.katalog_preise TO service_role USING (true) WITH CHECK (true);


--
-- Name: katalog_produkte; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.katalog_produkte ENABLE ROW LEVEL SECURITY;

--
-- Name: katalog_produkte katalog_produkte_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY katalog_produkte_read ON public.katalog_produkte FOR SELECT TO authenticated USING ((aktiv = true));


--
-- Name: katalog_produkte katalog_produkte_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY katalog_produkte_service ON public.katalog_produkte TO service_role USING (true) WITH CHECK (true);


--
-- Name: katalog_varianten; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.katalog_varianten ENABLE ROW LEVEL SECURITY;

--
-- Name: katalog_varianten katalog_varianten_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY katalog_varianten_crm_staff_all ON public.katalog_varianten TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: ki_anfragen_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ki_anfragen_log ENABLE ROW LEVEL SECURITY;

--
-- Name: ki_cluster_analysen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ki_cluster_analysen ENABLE ROW LEVEL SECURITY;

--
-- Name: ki_cluster_analysen ki_cluster_analysen_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ki_cluster_analysen_auth_all ON public.ki_cluster_analysen TO authenticated USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: ki_cluster_analysen ki_cluster_analysen_auth_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ki_cluster_analysen_auth_select ON public.ki_cluster_analysen FOR SELECT TO authenticated USING ((auth.role() = 'authenticated'::text));


--
-- Name: ki_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ki_content ENABLE ROW LEVEL SECURITY;

--
-- Name: ki_content ki_content_auth_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ki_content_auth_select ON public.ki_content FOR SELECT TO authenticated USING (true);


--
-- Name: ki_empfehlungen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ki_empfehlungen ENABLE ROW LEVEL SECURITY;

--
-- Name: ki_empfehlungen ki_empfehlungen_auth_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ki_empfehlungen_auth_select ON public.ki_empfehlungen FOR SELECT TO authenticated USING (true);


--
-- Name: ki_empfehlungen ki_empfehlungen_auth_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ki_empfehlungen_auth_update ON public.ki_empfehlungen FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: ki_historische_positionen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ki_historische_positionen ENABLE ROW LEVEL SECURITY;

--
-- Name: ki_historische_positionen ki_historische_positionen_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ki_historische_positionen_auth_all ON public.ki_historische_positionen USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: ki_historische_vorgaenge; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ki_historische_vorgaenge ENABLE ROW LEVEL SECURITY;

--
-- Name: ki_historische_vorgaenge ki_historische_vorgaenge_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ki_historische_vorgaenge_auth_all ON public.ki_historische_vorgaenge USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: ki_produkt_katalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ki_produkt_katalog ENABLE ROW LEVEL SECURITY;

--
-- Name: ki_produkt_katalog ki_produkt_katalog_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ki_produkt_katalog_auth_all ON public.ki_produkt_katalog USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: ki_visualisierungen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ki_visualisierungen ENABLE ROW LEVEL SECURITY;

--
-- Name: ki_visualisierungen ki_visualisierungen_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ki_visualisierungen_crm_staff_all ON public.ki_visualisierungen TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: kunden; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kunden ENABLE ROW LEVEL SECURITY;

--
-- Name: kunden_ansprechpartner; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kunden_ansprechpartner ENABLE ROW LEVEL SECURITY;

--
-- Name: kunden_ansprechpartner kunden_ansprechpartner_authenticated_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kunden_ansprechpartner_authenticated_all ON public.kunden_ansprechpartner TO authenticated USING (true) WITH CHECK (true);


--
-- Name: kunden kunden_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kunden_crm_staff_all ON public.kunden TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: kunden_dokumente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kunden_dokumente ENABLE ROW LEVEL SECURITY;

--
-- Name: kunden_mitglieder; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kunden_mitglieder ENABLE ROW LEVEL SECURITY;

--
-- Name: kunden_mitglieder kunden_mitglieder_org_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kunden_mitglieder_org_admin ON public.kunden_mitglieder FOR SELECT TO authenticated USING ((kunde_id = public.portal_kunde_id()));


--
-- Name: kunden_mitglieder kunden_mitglieder_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kunden_mitglieder_service ON public.kunden_mitglieder TO service_role USING (true) WITH CHECK (true);


--
-- Name: kunden_notizen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kunden_notizen ENABLE ROW LEVEL SECURITY;

--
-- Name: kunden_objekte; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kunden_objekte ENABLE ROW LEVEL SECURITY;

--
-- Name: kunden_objekte kunden_objekte_authenticated_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kunden_objekte_authenticated_all ON public.kunden_objekte TO authenticated USING (true) WITH CHECK (true);


--
-- Name: kunden_objekte kunden_objekte_portal_organisation_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kunden_objekte_portal_organisation_insert ON public.kunden_objekte FOR INSERT TO authenticated WITH CHECK (((kunde_id = public.portal_kunde_id()) AND public.portal_is_organisation()));


--
-- Name: kunden_objekte kunden_objekte_portal_organisation_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kunden_objekte_portal_organisation_select ON public.kunden_objekte FOR SELECT TO authenticated USING (((kunde_id = public.portal_kunde_id()) AND public.portal_is_organisation()));


--
-- Name: kunden_objekte kunden_objekte_portal_organisation_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kunden_objekte_portal_organisation_update ON public.kunden_objekte FOR UPDATE TO authenticated USING (((kunde_id = public.portal_kunde_id()) AND public.portal_is_organisation())) WITH CHECK (((kunde_id = public.portal_kunde_id()) AND public.portal_is_organisation()));


--
-- Name: kunden kunden_portal_handwerker_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kunden_portal_handwerker_select ON public.kunden FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (id IN ( SELECT public.portal_handwerker_kunde_ids() AS portal_handwerker_kunde_ids))));


--
-- Name: kunden kunden_portal_organisation_update_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kunden_portal_organisation_update_settings ON public.kunden FOR UPDATE TO authenticated USING (((auth_user_id = auth.uid()) AND (portal_modus = 'organisation'::text))) WITH CHECK (((auth_user_id = auth.uid()) AND (portal_modus = 'organisation'::text)));


--
-- Name: kunden kunden_portal_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kunden_portal_select_own ON public.kunden FOR SELECT TO authenticated USING ((auth_user_id = auth.uid()));


--
-- Name: kunden kunden_portal_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY kunden_portal_update_own ON public.kunden FOR UPDATE TO authenticated USING ((auth_user_id = auth.uid())) WITH CHECK ((auth_user_id = auth.uid()));


--
-- Name: lead_befund_punkte; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_befund_punkte ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_befund_punkte lead_befund_punkte_crm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lead_befund_punkte_crm ON public.lead_befund_punkte TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: lead_befund_punkte lead_befund_punkte_org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lead_befund_punkte_org_select ON public.lead_befund_punkte FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.lead_befunde b
     JOIN public.leads l ON ((l.id = b.lead_id)))
  WHERE ((b.id = lead_befund_punkte.befund_id) AND (l.auftraggeber_kunde_id = public.portal_kunde_id())))));


--
-- Name: lead_befund_punkte lead_befund_punkte_org_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lead_befund_punkte_org_write ON public.lead_befund_punkte TO authenticated USING ((public.portal_org_can_write() AND (EXISTS ( SELECT 1
   FROM (public.lead_befunde b
     JOIN public.leads l ON ((l.id = b.lead_id)))
  WHERE ((b.id = lead_befund_punkte.befund_id) AND (l.auftraggeber_kunde_id = public.portal_kunde_id())))))) WITH CHECK ((public.portal_org_can_write() AND (EXISTS ( SELECT 1
   FROM (public.lead_befunde b
     JOIN public.leads l ON ((l.id = b.lead_id)))
  WHERE ((b.id = lead_befund_punkte.befund_id) AND (l.auftraggeber_kunde_id = public.portal_kunde_id()))))));


--
-- Name: lead_befund_punkte lead_befund_punkte_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lead_befund_punkte_service ON public.lead_befund_punkte TO service_role USING (true) WITH CHECK (true);


--
-- Name: lead_befunde; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_befunde ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_befunde lead_befunde_crm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lead_befunde_crm ON public.lead_befunde TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: lead_befunde lead_befunde_org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lead_befunde_org_select ON public.lead_befunde FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_befunde.lead_id) AND (l.auftraggeber_kunde_id = public.portal_kunde_id())))));


--
-- Name: lead_befunde lead_befunde_org_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lead_befunde_org_write ON public.lead_befunde TO authenticated USING ((public.portal_org_can_write() AND (EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_befunde.lead_id) AND (l.auftraggeber_kunde_id = public.portal_kunde_id())))))) WITH CHECK ((public.portal_org_can_write() AND (EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_befunde.lead_id) AND (l.auftraggeber_kunde_id = public.portal_kunde_id()))))));


--
-- Name: lead_befunde lead_befunde_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lead_befunde_service ON public.lead_befunde TO service_role USING (true) WITH CHECK (true);


--
-- Name: lead_notizen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_notizen ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_notizen lead_notizen_authenticated_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lead_notizen_authenticated_all ON public.lead_notizen TO authenticated USING (true) WITH CHECK (true);


--
-- Name: lead_timeline; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_timeline ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_timeline lead_timeline_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lead_timeline_auth_all ON public.lead_timeline USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: leads leads_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leads_crm_staff_all ON public.leads TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: leads leads_portal_handwerker_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leads_portal_handwerker_select ON public.leads FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (id IN ( SELECT public.portal_handwerker_lead_ids() AS portal_handwerker_lead_ids))));


--
-- Name: leads leads_portal_organisation_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leads_portal_organisation_select ON public.leads FOR SELECT TO authenticated USING ((public.portal_is_organisation() AND ((kunde_id = public.portal_kunde_id()) OR (auftraggeber_kunde_id = public.portal_kunde_id()) OR (kunde_objekt_id IN ( SELECT public.portal_organisation_objekt_ids() AS portal_organisation_objekt_ids)))));


--
-- Name: leads leads_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leads_portal_select ON public.leads FOR SELECT TO authenticated USING ((kunde_id = public.portal_kunde_id()));


--
-- Name: leads_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_metrics marketing_metrics_auth_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY marketing_metrics_auth_select ON public.marketing_metrics FOR SELECT TO authenticated USING (true);


--
-- Name: mieter_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mieter_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: nachtraege; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nachtraege ENABLE ROW LEVEL SECURITY;

--
-- Name: nachtraege nachtraege_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nachtraege_auth_all ON public.nachtraege USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_crm_staff_all ON public.notifications TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: notifications notifications_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_portal_select ON public.notifications FOR SELECT TO authenticated USING ((handwerker_id = public.portal_handwerker_id()));


--
-- Name: notifications notifications_portal_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_portal_update ON public.notifications FOR UPDATE TO authenticated USING ((handwerker_id = public.portal_handwerker_id())) WITH CHECK ((handwerker_id = public.portal_handwerker_id()));


--
-- Name: objekt_abos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objekt_abos ENABLE ROW LEVEL SECURITY;

--
-- Name: objekt_abos objekt_abos_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY objekt_abos_org ON public.objekt_abos TO authenticated USING ((kunde_id = public.portal_kunde_id())) WITH CHECK ((kunde_id = public.portal_kunde_id()));


--
-- Name: objekt_abos objekt_abos_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY objekt_abos_service ON public.objekt_abos TO service_role USING (true) WITH CHECK (true);


--
-- Name: objekt_dokumente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objekt_dokumente ENABLE ROW LEVEL SECURITY;

--
-- Name: objekt_dokumente objekt_dokumente_crm_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY objekt_dokumente_crm_select ON public.objekt_dokumente FOR SELECT TO authenticated USING (public.is_crm_staff());


--
-- Name: objekt_dokumente objekt_dokumente_org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY objekt_dokumente_org_select ON public.objekt_dokumente FOR SELECT TO authenticated USING ((kunde_id = public.portal_kunde_id()));


--
-- Name: objekt_dokumente objekt_dokumente_org_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY objekt_dokumente_org_write ON public.objekt_dokumente TO authenticated USING (((kunde_id = public.portal_kunde_id()) AND public.portal_org_can_write())) WITH CHECK (((kunde_id = public.portal_kunde_id()) AND public.portal_org_can_write()));


--
-- Name: objekt_dokumente objekt_dokumente_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY objekt_dokumente_service ON public.objekt_dokumente TO service_role USING (true) WITH CHECK (true);


--
-- Name: objekt_einheiten; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objekt_einheiten ENABLE ROW LEVEL SECURITY;

--
-- Name: objekt_einheiten objekt_einheiten_crm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY objekt_einheiten_crm ON public.objekt_einheiten TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: objekt_einheiten objekt_einheiten_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY objekt_einheiten_org ON public.objekt_einheiten TO authenticated USING ((kunde_objekt_id IN ( SELECT public.portal_organisation_objekt_ids() AS portal_organisation_objekt_ids))) WITH CHECK ((kunde_objekt_id IN ( SELECT public.portal_organisation_objekt_ids() AS portal_organisation_objekt_ids)));


--
-- Name: objekt_einheiten objekt_einheiten_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY objekt_einheiten_service ON public.objekt_einheiten TO service_role USING (true) WITH CHECK (true);


--
-- Name: objekt_kontakte; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objekt_kontakte ENABLE ROW LEVEL SECURITY;

--
-- Name: objekt_kontakte objekt_kontakte_crm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY objekt_kontakte_crm ON public.objekt_kontakte TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: objekt_kontakte objekt_kontakte_org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY objekt_kontakte_org_select ON public.objekt_kontakte FOR SELECT TO authenticated USING ((kunde_id = public.portal_kunde_id()));


--
-- Name: objekt_kontakte objekt_kontakte_org_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY objekt_kontakte_org_write ON public.objekt_kontakte TO authenticated USING (((kunde_id = public.portal_kunde_id()) AND public.portal_org_can_write())) WITH CHECK (((kunde_id = public.portal_kunde_id()) AND public.portal_org_can_write()));


--
-- Name: objekt_kontakte objekt_kontakte_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY objekt_kontakte_service ON public.objekt_kontakte TO service_role USING (true) WITH CHECK (true);


--
-- Name: objekt_pruefpflichten; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objekt_pruefpflichten ENABLE ROW LEVEL SECURITY;

--
-- Name: org_freigabe_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_freigabe_log ENABLE ROW LEVEL SECURITY;

--
-- Name: org_freigabe_log org_freigabe_log_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_freigabe_log_portal_select ON public.org_freigabe_log FOR SELECT TO authenticated USING ((auftraggeber_kunde_id = public.portal_kunde_id()));


--
-- Name: org_hausmeister; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_hausmeister ENABLE ROW LEVEL SECURITY;

--
-- Name: org_hausmeister org_hausmeister_org_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_hausmeister_org_all ON public.org_hausmeister TO authenticated USING ((org_kunde_id IN ( SELECT kunden.id
   FROM public.kunden
  WHERE (kunden.auth_user_id = auth.uid())
UNION
 SELECT kunden_mitglieder.kunde_id
   FROM public.kunden_mitglieder
  WHERE (kunden_mitglieder.auth_user_id = auth.uid())))) WITH CHECK ((org_kunde_id IN ( SELECT kunden.id
   FROM public.kunden
  WHERE (kunden.auth_user_id = auth.uid())
UNION
 SELECT kunden_mitglieder.kunde_id
   FROM public.kunden_mitglieder
  WHERE (kunden_mitglieder.auth_user_id = auth.uid()))));


--
-- Name: org_hausmeister org_hausmeister_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_hausmeister_service ON public.org_hausmeister TO service_role USING (true) WITH CHECK (true);


--
-- Name: partner; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_bautagebuch_anfragen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_bautagebuch_anfragen ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_bautagebuch_anfragen partner_bautagebuch_anfragen_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_bautagebuch_anfragen_crm_staff_all ON public.partner_bautagebuch_anfragen TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: partner_bautagebuch_anfragen partner_bautagebuch_anfragen_portal_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_bautagebuch_anfragen_portal_select_own ON public.partner_bautagebuch_anfragen FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: partner_bautagebuch_anfragen partner_bautagebuch_anfragen_portal_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_bautagebuch_anfragen_portal_update_own ON public.partner_bautagebuch_anfragen FOR UPDATE TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id()))) WITH CHECK ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: partner_dokumente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_dokumente ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_dokumente partner_dokumente_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_dokumente_crm_staff_all ON public.partner_dokumente TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: partner_dokumente partner_dokumente_portal_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_dokumente_portal_insert ON public.partner_dokumente FOR INSERT TO authenticated WITH CHECK ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id()) AND ((auftrag_id IS NULL) OR (auftrag_id IN ( SELECT ah.auftrag_id
   FROM public.auftrag_handwerker ah
  WHERE (ah.handwerker_id = public.portal_handwerker_id())
UNION
 SELECT ap.auftrag_id
   FROM public.auftrag_positionen ap
  WHERE (ap.handwerker_id = public.portal_handwerker_id()))))));


--
-- Name: partner_dokumente partner_dokumente_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_dokumente_portal_select ON public.partner_dokumente FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: partner_dokumente partner_dokumente_portal_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_dokumente_portal_update ON public.partner_dokumente FOR UPDATE TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id()))) WITH CHECK ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: partner_handwerker_migration; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_handwerker_migration ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_handwerker_migration partner_hw_migration_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_hw_migration_auth_all ON public.partner_handwerker_migration TO authenticated USING (true) WITH CHECK (true);


--
-- Name: partner_kategorien; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_kategorien ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_positions_anfragen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_positions_anfragen ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_positions_anfragen partner_positions_anfragen_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_positions_anfragen_crm_staff_all ON public.partner_positions_anfragen TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: partner_positions_anfragen partner_positions_anfragen_portal_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_positions_anfragen_portal_insert_own ON public.partner_positions_anfragen FOR INSERT TO authenticated WITH CHECK ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: partner_positions_anfragen partner_positions_anfragen_portal_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_positions_anfragen_portal_select_own ON public.partner_positions_anfragen FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: partner_todos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_todos ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_todos partner_todos_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_todos_crm_staff_all ON public.partner_todos TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: partner_todos partner_todos_portal_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_todos_portal_delete_own ON public.partner_todos FOR DELETE TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: partner_todos partner_todos_portal_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_todos_portal_insert_own ON public.partner_todos FOR INSERT TO authenticated WITH CHECK ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: partner_todos partner_todos_portal_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_todos_portal_select_own ON public.partner_todos FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: partner_todos partner_todos_portal_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_todos_portal_update_own ON public.partner_todos FOR UPDATE TO authenticated USING ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id()))) WITH CHECK ((public.is_portal_handwerker() AND (handwerker_id = public.portal_handwerker_id())));


--
-- Name: portal_einladungen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portal_einladungen ENABLE ROW LEVEL SECURITY;

--
-- Name: portal_einladungen portal_einladungen_org_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portal_einladungen_org_insert ON public.portal_einladungen FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.kunden_mitglieder m
  WHERE ((m.kunde_id = portal_einladungen.kunde_id) AND (m.auth_user_id = auth.uid()) AND (m.aktiv = true)))));


--
-- Name: portal_einladungen portal_einladungen_org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portal_einladungen_org_select ON public.portal_einladungen FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.kunden_mitglieder m
  WHERE ((m.kunde_id = portal_einladungen.kunde_id) AND (m.auth_user_id = auth.uid()) AND (m.aktiv = true)))));


--
-- Name: portal_einladungen portal_einladungen_org_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portal_einladungen_org_update ON public.portal_einladungen FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.kunden_mitglieder m
  WHERE ((m.kunde_id = portal_einladungen.kunde_id) AND (m.auth_user_id = auth.uid()) AND (m.aktiv = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.kunden_mitglieder m
  WHERE ((m.kunde_id = portal_einladungen.kunde_id) AND (m.auth_user_id = auth.uid()) AND (m.aktiv = true)))));


--
-- Name: portal_einladungen portal_einladungen_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portal_einladungen_service ON public.portal_einladungen TO service_role USING (true) WITH CHECK (true);


--
-- Name: portal_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portal_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: portal_notifications portal_notifications_crm_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portal_notifications_crm_insert ON public.portal_notifications FOR INSERT TO authenticated WITH CHECK (public.is_crm_staff());


--
-- Name: portal_notifications portal_notifications_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portal_notifications_select_own ON public.portal_notifications FOR SELECT TO authenticated USING ((empfaenger_user_id = auth.uid()));


--
-- Name: portal_notifications portal_notifications_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portal_notifications_service ON public.portal_notifications TO service_role USING (true) WITH CHECK (true);


--
-- Name: portal_notifications portal_notifications_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY portal_notifications_update_own ON public.portal_notifications FOR UPDATE TO authenticated USING ((empfaenger_user_id = auth.uid())) WITH CHECK ((empfaenger_user_id = auth.uid()));


--
-- Name: position_eintraege; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.position_eintraege ENABLE ROW LEVEL SECURITY;

--
-- Name: position_eintraege position_eintraege_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY position_eintraege_crm_staff_all ON public.position_eintraege TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: position_eintraege position_eintraege_portal_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY position_eintraege_portal_insert ON public.position_eintraege FOR INSERT TO authenticated WITH CHECK ((public.is_portal_handwerker() AND (erfasst_von = ANY (ARRAY['partner_app'::text, 'eigenbetrieb_app'::text])) AND (position_id IN ( SELECT ap.id
   FROM public.auftrag_positionen ap
  WHERE (ap.handwerker_id = public.portal_handwerker_id())))));


--
-- Name: position_eintraege position_eintraege_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY position_eintraege_portal_select ON public.position_eintraege FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (position_id IN ( SELECT ap.id
   FROM public.auftrag_positionen ap
  WHERE (ap.handwerker_id = public.portal_handwerker_id())))));


--
-- Name: position_eintraege position_eintraege_portal_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY position_eintraege_portal_update ON public.position_eintraege FOR UPDATE TO authenticated USING ((public.is_portal_handwerker() AND (position_id IN ( SELECT ap.id
   FROM public.auftrag_positionen ap
  WHERE (ap.handwerker_id = public.portal_handwerker_id()))))) WITH CHECK ((public.is_portal_handwerker() AND (position_id IN ( SELECT ap.id
   FROM public.auftrag_positionen ap
  WHERE (ap.handwerker_id = public.portal_handwerker_id())))));


--
-- Name: position_material; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.position_material ENABLE ROW LEVEL SECURITY;

--
-- Name: position_material position_material_crm_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY position_material_crm_staff_all ON public.position_material TO authenticated USING (public.is_crm_staff()) WITH CHECK (public.is_crm_staff());


--
-- Name: position_material position_material_portal_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY position_material_portal_insert ON public.position_material FOR INSERT TO authenticated WITH CHECK ((public.is_portal_handwerker() AND (position_id IN ( SELECT ap.id
   FROM public.auftrag_positionen ap
  WHERE (ap.handwerker_id = public.portal_handwerker_id())))));


--
-- Name: position_material position_material_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY position_material_portal_select ON public.position_material FOR SELECT TO authenticated USING ((public.is_portal_handwerker() AND (position_id IN ( SELECT ap.id
   FROM public.auftrag_positionen ap
  WHERE (ap.handwerker_id = public.portal_handwerker_id())))));


--
-- Name: preislisten; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.preislisten ENABLE ROW LEVEL SECURITY;

--
-- Name: punch_list; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.punch_list ENABLE ROW LEVEL SECURITY;

--
-- Name: punch_list punch_list_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY punch_list_auth_all ON public.punch_list USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: push_prefs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_prefs ENABLE ROW LEVEL SECURITY;

--
-- Name: push_prefs push_prefs_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY push_prefs_select_own ON public.push_prefs FOR SELECT TO authenticated USING ((auth.uid() = auth_user_id));


--
-- Name: push_prefs push_prefs_upsert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY push_prefs_upsert_own ON public.push_prefs TO authenticated USING ((auth.uid() = auth_user_id)) WITH CHECK ((auth.uid() = auth_user_id));


--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions push_subscriptions_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions FOR DELETE TO authenticated USING ((auth.uid() = auth_user_id));


--
-- Name: push_subscriptions push_subscriptions_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = auth_user_id));


--
-- Name: push_subscriptions push_subscriptions_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions FOR SELECT TO authenticated USING ((auth.uid() = auth_user_id));


--
-- Name: push_subscriptions push_subscriptions_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY push_subscriptions_update_own ON public.push_subscriptions FOR UPDATE TO authenticated USING ((auth.uid() = auth_user_id)) WITH CHECK ((auth.uid() = auth_user_id));


--
-- Name: rechnungen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rechnungen ENABLE ROW LEVEL SECURITY;

--
-- Name: rechnungen rechnungen_portal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rechnungen_portal_select ON public.rechnungen FOR SELECT TO authenticated USING (((status = 'gesendet'::text) AND (auftrag_id IN ( SELECT a.id
   FROM public.auftraege a
  WHERE ((a.kunde_id = public.portal_kunde_id()) OR (a.lead_id IN ( SELECT public.portal_kunde_lead_ids() AS portal_kunde_lead_ids)))))));


--
-- Name: sammelrechnung_positionen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sammelrechnung_positionen ENABLE ROW LEVEL SECURITY;

--
-- Name: sammelrechnungen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sammelrechnungen ENABLE ROW LEVEL SECURITY;

--
-- Name: system_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

--
-- Name: system_events system_events_auth_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_events_auth_select ON public.system_events FOR SELECT TO authenticated USING (true);


--
-- Name: auftrag_timeline timeline_token_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY timeline_token_read ON public.auftrag_timeline FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.auftraege a
  WHERE ((a.id = auftrag_timeline.auftrag_id) AND (a.kunden_token IS NOT NULL)))));


--
-- Name: todos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

--
-- Name: todos todos_auth_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY todos_auth_all ON public.todos USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: formular_eintraege token_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY token_insert ON public.formular_eintraege FOR INSERT WITH CHECK ((token IS NOT NULL));


--
-- Name: formular_eintraege token_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY token_read ON public.formular_eintraege FOR SELECT USING ((token IS NOT NULL));


--
-- Name: hw_formular_einreichungen token_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY token_read ON public.hw_formular_einreichungen FOR SELECT USING ((token IS NOT NULL));


--
-- Name: nachtraege token_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY token_read ON public.nachtraege FOR SELECT USING ((token IS NOT NULL));


--
-- Name: formular_eintraege token_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY token_update ON public.formular_eintraege FOR UPDATE USING ((token IS NOT NULL));


--
-- Name: hw_formular_einreichungen token_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY token_update ON public.hw_formular_einreichungen FOR UPDATE USING ((token IS NOT NULL));


--
-- Name: nachtraege token_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY token_update ON public.nachtraege FOR UPDATE USING ((token IS NOT NULL));


--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: vor_baubeginn_protokolle; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vor_baubeginn_protokolle ENABLE ROW LEVEL SECURITY;

--
-- Name: vorab_formulare; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vorab_formulare ENABLE ROW LEVEL SECURITY;

--
-- Name: vorgang_kommentare; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vorgang_kommentare ENABLE ROW LEVEL SECURITY;

--
-- Name: vorgang_kommentare vorgang_kommentare_org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vorgang_kommentare_org_select ON public.vorgang_kommentare FOR SELECT TO authenticated USING ((kunde_id = public.portal_kunde_id()));


--
-- Name: vorgang_kommentare vorgang_kommentare_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vorgang_kommentare_service ON public.vorgang_kommentare TO service_role USING (true) WITH CHECK (true);


--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: objects angebote_pdfs_authenticated_insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY angebote_pdfs_authenticated_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'angebote-pdfs'::text));


--
-- Name: objects angebote_pdfs_authenticated_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY angebote_pdfs_authenticated_update ON storage.objects FOR UPDATE TO authenticated USING ((bucket_id = 'angebote-pdfs'::text));


--
-- Name: objects angebote_pdfs_public_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY angebote_pdfs_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'angebote-pdfs'::text));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: objects buergschaften_objects_delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY buergschaften_objects_delete ON storage.objects FOR DELETE TO authenticated USING ((bucket_id = 'buergschaften'::text));


--
-- Name: objects buergschaften_objects_insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY buergschaften_objects_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'buergschaften'::text));


--
-- Name: objects buergschaften_objects_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY buergschaften_objects_read ON storage.objects FOR SELECT TO authenticated USING ((bucket_id = 'buergschaften'::text));


--
-- Name: objects buergschaften_objects_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY buergschaften_objects_update ON storage.objects FOR UPDATE TO authenticated USING ((bucket_id = 'buergschaften'::text));


--
-- Name: objects eingangsrechnungen_objects_delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY eingangsrechnungen_objects_delete ON storage.objects FOR DELETE TO authenticated USING ((bucket_id = 'eingangsrechnungen'::text));


--
-- Name: objects eingangsrechnungen_objects_insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY eingangsrechnungen_objects_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'eingangsrechnungen'::text));


--
-- Name: objects eingangsrechnungen_objects_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY eingangsrechnungen_objects_read ON storage.objects FOR SELECT TO authenticated USING ((bucket_id = 'eingangsrechnungen'::text));


--
-- Name: objects eingangsrechnungen_objects_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY eingangsrechnungen_objects_update ON storage.objects FOR UPDATE TO authenticated USING ((bucket_id = 'eingangsrechnungen'::text));


--
-- Name: objects gpt_visualisierungen_public_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY gpt_visualisierungen_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'gpt-visualisierungen'::text));


--
-- Name: objects gpt_visualisierungen_service_write; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY gpt_visualisierungen_service_write ON storage.objects TO service_role USING ((bucket_id = 'gpt-visualisierungen'::text)) WITH CHECK ((bucket_id = 'gpt-visualisierungen'::text));


--
-- Name: objects handwerker_uploads_crm_staff_all; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY handwerker_uploads_crm_staff_all ON storage.objects TO authenticated USING (((bucket_id = 'handwerker-uploads'::text) AND public.is_crm_staff())) WITH CHECK (((bucket_id = 'handwerker-uploads'::text) AND public.is_crm_staff()));


--
-- Name: objects handwerker_uploads_portal_delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY handwerker_uploads_portal_delete ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'handwerker-uploads'::text) AND public.is_portal_handwerker() AND ((storage.foldername(name))[1] = (public.portal_handwerker_id())::text)));


--
-- Name: objects handwerker_uploads_portal_insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY handwerker_uploads_portal_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'handwerker-uploads'::text) AND public.is_portal_handwerker() AND ((storage.foldername(name))[1] = (public.portal_handwerker_id())::text)));


--
-- Name: objects handwerker_uploads_portal_select; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY handwerker_uploads_portal_select ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'handwerker-uploads'::text) AND public.is_portal_handwerker() AND ((storage.foldername(name))[1] = (public.portal_handwerker_id())::text)));


--
-- Name: objects handwerker_uploads_portal_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY handwerker_uploads_portal_update ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'handwerker-uploads'::text) AND public.is_portal_handwerker() AND ((storage.foldername(name))[1] = (public.portal_handwerker_id())::text))) WITH CHECK (((bucket_id = 'handwerker-uploads'::text) AND public.is_portal_handwerker() AND ((storage.foldername(name))[1] = (public.portal_handwerker_id())::text)));


--
-- Name: objects hw_formular_fotos_authenticated_insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY hw_formular_fotos_authenticated_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'hw-formular-fotos'::text));


--
-- Name: objects hw_formular_fotos_public_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY hw_formular_fotos_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'hw-formular-fotos'::text));


--
-- Name: objects ki_content_public_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY ki_content_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'ki-content'::text));


--
-- Name: objects ki_content_service_upload; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY ki_content_service_upload ON storage.objects FOR INSERT WITH CHECK ((bucket_id = 'ki-content'::text));


--
-- Name: objects lead_notiz_fotos_public_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY lead_notiz_fotos_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'lead-notizen-fotos'::text));


--
-- Name: objects logos_authenticated_delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY logos_authenticated_delete ON storage.objects FOR DELETE TO authenticated USING ((bucket_id = 'logos'::text));


--
-- Name: objects logos_authenticated_insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY logos_authenticated_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'logos'::text));


--
-- Name: objects logos_authenticated_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY logos_authenticated_update ON storage.objects FOR UPDATE TO authenticated USING ((bucket_id = 'logos'::text));


--
-- Name: objects logos_public_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY logos_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'logos'::text));


--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: objects partner_dokumente_objects_delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY partner_dokumente_objects_delete ON storage.objects FOR DELETE TO authenticated USING ((bucket_id = 'partner-dokumente'::text));


--
-- Name: objects partner_dokumente_objects_insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY partner_dokumente_objects_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'partner-dokumente'::text));


--
-- Name: objects partner_dokumente_objects_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY partner_dokumente_objects_read ON storage.objects FOR SELECT TO authenticated USING ((bucket_id = 'partner-dokumente'::text));


--
-- Name: objects partner_dokumente_objects_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY partner_dokumente_objects_update ON storage.objects FOR UPDATE TO authenticated USING ((bucket_id = 'partner-dokumente'::text));


--
-- Name: objects protokolle_authenticated_delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY protokolle_authenticated_delete ON storage.objects FOR DELETE TO authenticated USING ((bucket_id = 'protokolle'::text));


--
-- Name: objects protokolle_authenticated_insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY protokolle_authenticated_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'protokolle'::text));


--
-- Name: objects protokolle_authenticated_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY protokolle_authenticated_update ON storage.objects FOR UPDATE TO authenticated USING ((bucket_id = 'protokolle'::text));


--
-- Name: objects protokolle_public_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY protokolle_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'protokolle'::text));


--
-- Name: objects rechnungen_pdfs_authenticated_insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY rechnungen_pdfs_authenticated_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'rechnungen-pdfs'::text));


--
-- Name: objects rechnungen_pdfs_authenticated_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY rechnungen_pdfs_authenticated_update ON storage.objects FOR UPDATE TO authenticated USING ((bucket_id = 'rechnungen-pdfs'::text));


--
-- Name: objects rechnungen_pdfs_public_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY rechnungen_pdfs_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'rechnungen-pdfs'::text));


--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: objects vertraege_pdfs_authenticated_insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY vertraege_pdfs_authenticated_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'vertraege-pdfs'::text));


--
-- Name: objects vertraege_pdfs_authenticated_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY vertraege_pdfs_authenticated_update ON storage.objects FOR UPDATE TO authenticated USING ((bucket_id = 'vertraege-pdfs'::text));


--
-- Name: objects vertraege_pdfs_public_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY vertraege_pdfs_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'vertraege-pdfs'::text));


--
-- Name: objects visualisierungen_crm_delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY visualisierungen_crm_delete ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'visualisierungen'::text) AND public.is_crm_staff()));


--
-- Name: objects visualisierungen_crm_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY visualisierungen_crm_update ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'visualisierungen'::text) AND public.is_crm_staff()));


--
-- Name: objects visualisierungen_crm_upload; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY visualisierungen_crm_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'visualisierungen'::text) AND public.is_crm_staff()));


--
-- Name: objects visualisierungen_public_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY visualisierungen_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'visualisierungen'::text));


--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: supabase_migrations; Owner: -
--

ALTER TABLE supabase_migrations.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: -
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: ensure_rls; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
         WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
   EXECUTE FUNCTION public.rls_auto_enable();


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict fEGSXBM4KTO9vmZJQwBoypTz8YhoJUlqb5IjVsAuuDmJvrJjzgBKSvlk3ej4hVa

