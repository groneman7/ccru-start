import type { Client } from 'pg';

// Structural metadata only: never reads application rows. Column order and object
// owners are irrelevant; defaults, constraints, indexes and visibility rules are not.
export async function readCatalog(client: Client) {
  const { rows } = await client.query(`
    WITH relations AS (
      SELECT c.*, n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public','authz','better-auth','calendar')
        AND c.relkind IN ('r','p','v','m','f','S')
        AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e')
    )
    SELECT jsonb_build_object(
      'relations', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',nspname,'name',relname,'kind',relkind,'rls',relrowsecurity,'force_rls',relforcerowsecurity) ORDER BY nspname,relname),'[]') FROM relations),
      'columns', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',r.nspname,'table',r.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated,'collation',a.attcollation::regcollation::text) ORDER BY r.nspname,r.relname,a.attname),'[]') FROM relations r JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped LEFT JOIN pg_attrdef d ON d.adrelid=r.oid AND d.adnum=a.attnum),
      'constraints', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',r.nspname,'table',r.relname,'name',c.conname,'definition',pg_get_constraintdef(c.oid),'validated',c.convalidated,'enforcement_triggers',(SELECT jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'function',t.tgfoid::regproc::text,'type',t.tgtype,'enabled',t.tgenabled,'deferrable',t.tgdeferrable,'initially_deferred',t.tginitdeferred) ORDER BY t.tgrelid::regclass::text,t.tgfoid::regproc::text,t.tgtype,t.tgenabled) FROM pg_trigger t WHERE t.tgconstraint=c.oid AND t.tgisinternal)) ORDER BY r.nspname,r.relname,c.conname),'[]') FROM relations r JOIN pg_constraint c ON c.conrelid=r.oid),
      'indexes', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',r.nspname,'table',r.relname,'definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready) ORDER BY r.nspname,r.relname,pg_get_indexdef(i.indexrelid)),'[]') FROM relations r JOIN pg_index i ON i.indrelid=r.oid),
      'types', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',t.typname,'kind',t.typtype,'labels',(SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid=t.oid)) ORDER BY n.nspname,t.typname),'[]') FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname IN ('public','authz','better-auth','calendar') AND t.typtype IN ('e','d','r','m') AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.classid='pg_type'::regclass AND d.objid=t.oid AND d.deptype='e')),
      'triggers', (SELECT coalesce(jsonb_agg(pg_get_triggerdef(t.oid) ORDER BY r.nspname,r.relname,t.tgname),'[]') FROM relations r JOIN pg_trigger t ON t.tgrelid=r.oid WHERE NOT t.tgisinternal),
      'policies', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',r.nspname,'table',r.relname,'name',p.polname,'command',p.polcmd,'roles',p.polroles::text,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY r.nspname,r.relname,p.polname),'[]') FROM relations r JOIN pg_policy p ON p.polrelid=r.oid)
    ) AS catalog
  `);
  return rows[0].catalog as Record<string, unknown[]>;
}
