# Supabase del prototipo

El prototipo conserva el acceso libre de administrador y chofer. Vercel mantiene la interfaz y las validaciones; Supabase guarda la data sintética compartida.

Proyecto: cqfdatgpwjofamikzcly. Tablas propias: public.agro_prototype_state y public.agro_prototype_access. Las tablas del otro sistema no se modificaron.

Variables de servidor en Vercel: SHARED_STORAGE=supabase, SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_PROTOTYPE_TOKEN. La última es secreta y limitada a las funciones de este prototipo. Ninguna credencial de administración de todo el proyecto se entrega al navegador.

Las lecturas con la misma revisión consultan solo metadatos. Las escrituras usan comparación atómica de revisión y conservan el reintento e idempotencia del API. La data inicial se insertó una sola vez; una lectura fallida no crea ni reemplaza registros.

El navegador separa los cambios pendientes y respaldos por almacenamiento. Los registros del antiguo Blob no se importan automáticamente.

La migración está en migrations/202610230001_prototype_state.sql. Aplicar en una base nueva e insertar la data sintética inicial antes de habilitar SHARED_STORAGE. No ejecutar un reinicio de la base para volver a desplegar la aplicación.

Pruebas: node tests/test-supabase-api.cjs y node tests/test-supabase-engine.cjs. Se mantienen las pruebas de finanzas y UIT.

Revisión de seguridad: RLS sin políticas en estas dos tablas es deliberado: no hay acceso directo desde anon/authenticated. Las dos funciones públicas SECURITY DEFINER verifican primero el token secreto limitado al prototipo y tienen search_path vacío. Los avisos de funciones/tablas del sistema anterior no se modificaron. Referencia del verificador: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable


## Boletas del acuerdo de transporte

`agro_prototype_documents` stores only small prototype PDF/JPEG/PNG attachments (2 MB each), separately from the shared polling snapshot. `/api/prototype-document` validates the size and file signature and serves binary inline content. No base64 or server credentials are stored in frontend state. The table has RLS and no direct grants. Its two narrowly scoped RPCs require the existing server-only prototype token before reading/writing; definer + anon execute advisor notices are intentional, protected by that token. Existing filename-only documents require re-upload; no binary is invented for those records. New synthetic boletas may be explicitly labeled as test documents.

## Flete por carga

Coordination reserves a freight amount per scheduled delivery, inherited by its load. Existing loads can assign freight under campaign → Entregas → Flete de la carga or Transportistas → Fletes por carga. Reservations deduplicate delivery/load and may not exceed their campaign agreement minus actual historical payments. Expenses are additional and do not consume freight. Old campaign-wide documents and movements remain read-only history; only their actual payments reserve the agreement. New payments belong to exact load settlements. Server revalidates caps on every merged concurrent write, preventing oversubscription across devices. Once liquidated, load freight and agreement terms are immutable; receipt replacements remain allowed.
