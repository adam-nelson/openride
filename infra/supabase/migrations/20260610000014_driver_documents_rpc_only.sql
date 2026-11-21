-- Require all driver submissions and renewals to use submit_driver_document().
-- The SECURITY DEFINER RPC creates/updates only pending records; callers cannot
-- directly write authoritative or submission fields through PostgREST.
drop policy if exists driver_documents_driver_submit on public.driver_documents;
drop policy if exists driver_documents_driver_renew on public.driver_documents;
