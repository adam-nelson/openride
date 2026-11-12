-- Freeze submission timestamps on driver-controlled renewals and use the
-- configured jurisdiction-aware policy for scheduled enforcement too.
create or replace function public.guard_driver_document_writes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and public.auth_role() = 'driver' then
    if tg_op = 'INSERT' then
      if new.driver_id is distinct from auth.uid()
         or new.operator_id is distinct from public.auth_operator()
         or new.status <> 'pending'
         or new.reviewer_id is not null
         or new.review_notes is not null then
        raise exception 'Driver submissions must be their own pending records' using errcode = '42501';
      end if;
      new.created_at := now();
      new.updated_at := now();
    elsif tg_op = 'UPDATE' then
      if old.driver_id is distinct from auth.uid()
         or old.status not in ('pending', 'rejected', 'expired')
         or new.driver_id is distinct from old.driver_id
         or new.operator_id is distinct from old.operator_id
         or new.doc_type is distinct from old.doc_type
         or new.status <> 'pending'
         or new.reviewer_id is not null
         or new.review_notes is not null then
        raise exception 'Drivers may only renew their own unapproved documents as pending' using errcode = '42501';
      end if;
      new.created_at := old.created_at;
      new.updated_at := now();
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_compliance()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.driver_documents
    set status = 'expired'
    where status = 'approved' and expires_on is not null and expires_on < current_date;
  update public.vehicle_documents
    set status = 'expired'
    where status = 'approved' and expires_on is not null and expires_on < current_date;

  update public.driver_profiles d
    set status = 'suspended'
    where d.status = 'approved'
      and public.subject_documents_compliant('driver', d.user_id) is false;

  update public.vehicles v
    set status = 'out_of_service'
    where v.status = 'active'
      and public.subject_documents_compliant('vehicle', v.id) is false;
end;
$$;
