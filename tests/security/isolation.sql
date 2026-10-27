create function public.cap_test_assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
select public.cap_test_assert((public.cap_apply('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','task','task-a',0,
 '{"id":"task-a","title":"Privé A","area":"Moi","due":"","duration":25,"urgent":false,"important":true,"done":false}',false)->>'conflict')::boolean=false,'A crée sa tâche');
select public.cap_test_assert((public.cap_apply('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','idea','idea-a',0,
 '{"id":"idea-a","text":"Idée privée A","category":"Non classée","status":"À explorer","reviewAt":"","version":1,"createdAt":"2026-10-27T12:00:00Z","updatedAt":"2026-10-27T12:00:00Z"}',false)->>'conflict')::boolean=false,'A crée son idée');
select public.cap_test_assert((select count(*)=2 from public.cap_records),'A lit ses deux objets');
select public.cap_test_assert((public.cap_apply('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','task','task-a',0,
 '{"id":"task-a","title":"Privé A","area":"Moi","due":"","duration":25,"urgent":false,"important":true,"done":false}',false)->'record'->>'version')::int=1,'Rejeu sans doublon');
select public.cap_test_assert((select count(*)=2 from public.cap_changes),'Journal sans doublon après rejeu');
do $$ begin
 perform public.cap_apply('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','task','task-a',0,
 '{"id":"task-a","title":"Différent","area":"Moi","due":"","duration":25,"urgent":false,"important":true,"done":false}',false);
 raise exception 'FAIL: réutilisation acceptée';
exception when invalid_parameter_value then raise notice 'PASS: identifiant opération non réutilisable avec autre contenu'; end $$;
select public.cap_test_assert((public.cap_apply('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','task','task-a',0,
 '{"id":"task-a","title":"Ancienne version","area":"Moi","due":"","duration":25,"urgent":false,"important":true,"done":false}',false)->>'conflict')::boolean,'Version périmée refusée');
do $$ begin
 update public.cap_records set owner='22222222-2222-4222-8222-222222222222';
 raise exception 'FAIL: changement de propriétaire accepté';
exception when insufficient_privilege then raise notice 'PASS: écriture directe et changement de propriétaire interdits'; end $$;
do $$ begin
 perform public.cap_apply('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','idea','bad',0,
 '{"id":"bad","text":"X","category":"Moi","status":"invalide","reviewAt":"","createdAt":"2026-10-27","updatedAt":"2026-10-27"}',false);
 raise exception 'FAIL: données invalides acceptées';
exception when invalid_parameter_value then raise notice 'PASS: données invalides refusées'; end $$;

set local request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
select public.cap_test_assert((select count(*)=0 from public.cap_records),'B ne lit aucun objet de A');
select public.cap_test_assert((select count(*)=0 from public.cap_changes),'B ne lit aucun changement de A');
select public.cap_test_assert((public.cap_apply('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','task','task-a',1,
 '{"id":"task-a","title":"Tentative B","area":"Moi","due":"","duration":25,"urgent":false,"important":true,"done":false}',true)->>'conflict')::boolean,'B ne supprime pas la tâche de A');
select public.cap_test_assert(public.cap_apply('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','task','task-a',1,
 '{"id":"task-a","title":"Tentative B","area":"Moi","due":"","duration":25,"urgent":false,"important":true,"done":false}',true)->'record'='null'::jsonb,'Conflit B ne révèle pas la version A');
do $$ begin
 perform * from public.cap_operations;
 raise exception 'FAIL: opérations internes lisibles';
exception when insufficient_privilege then raise notice 'PASS: opérations internes interdites au client'; end $$;
select public.cap_test_assert((public.cap_apply('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','task','task-b',0,
 '{"id":"task-b","title":"Privé B","area":"Moi","due":"","duration":25,"urgent":false,"important":true,"done":false}',false)->>'conflict')::boolean=false,'B crée sa propre tâche');

set local request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
select public.cap_test_assert((select data->>'title'='Privé A' from public.cap_records where kind='task' and id='task-a'),'Contenu A intact après tentative B');
select public.cap_test_assert((select count(*)=2 from public.cap_records),'A ne voit pas la tâche B');
select public.cap_apply('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5','task','task-a',1,
 '{"id":"task-a","title":"Privé A","area":"Moi","due":"","duration":25,"urgent":false,"important":true,"done":false}',true);
select public.cap_test_assert((public.cap_apply('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6','task','task-a',0,
 '{"id":"task-a","title":"Ressusciter","area":"Moi","due":"","duration":25,"urgent":false,"important":true,"done":false}',false)->>'conflict')::boolean,'Ancien appareil ne ressuscite pas une suppression');

set local role anon;
set local request.jwt.claim.sub='';
do $$ begin
 perform * from public.cap_records;
 raise exception 'FAIL: lecture anonyme autorisée';
exception when insufficient_privilege then raise notice 'PASS: lecture anonyme interdite'; end $$;
do $$ begin
 perform public.cap_apply('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7','task','x',0,'{}',false);
 raise exception 'FAIL: RPC anonyme autorisé';
exception when insufficient_privilege then raise notice 'PASS: RPC anonyme interdit'; end $$;
rollback;
