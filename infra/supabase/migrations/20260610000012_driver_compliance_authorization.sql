-- Driver-submitted documents are untrusted until reviewed by an operator admin.
drop policy if exists driver_documents_self on public.driver_documents;

create policy driver_documents_driver_read on public.driver_documents
  for select to authenticated
  using (driver_id = auth.uid());

create policy driver_documents_driver_submit on public.driver_documents
  for insert to authenticated
  with check (
    driver_id = auth.uid()
    and operator_id = public.auth_operator()
    and status = 'pending'
    and reviewer_id is null
    and review_notes is null
  );

create policy driver_documents_driver_renew on public.driver_documents
  for update to authenticated
  using (
    driver_id = auth.uid()
    and operator_id = public.auth_operator()
    and status in ('pending', 'rejected', 'expired')
  )
  with check (
    driver_id = auth.uid()
    and operator_id = public.auth_operator()
    and status = 'pending'
    and reviewer_id is null
    and review_notes is null
  );

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
      new.updated_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_driver_document_writes
  before insert or update on public.driver_documents
  for each row execute function public.guard_driver_document_writes();

create or replace function public.submit_driver_document(
  p_doc_type public.driver_doc_type,
  p_storage_path text,
  p_issued_on date default null,
  p_expires_on date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid := auth.uid();
  v_operator_id uuid;
  v_document_id uuid;
begin
  if v_driver_id is null or public.auth_role() <> 'driver' then
    raise exception 'Only an authenticated driver can submit documents' using errcode = '42501';
  end if;
  if nullif(trim(p_storage_path), '') is null then
    raise exception 'A document storage path is required' using errcode = '22023';
  end if;

  select operator_id into v_operator_id
  from public.driver_profiles
  where user_id = v_driver_id;
  if v_operator_id is null then
    raise exception 'Driver profile or operator not found' using errcode = '23503';
  end if;

  select id into v_document_id
  from public.driver_documents
  where driver_id = v_driver_id
    and doc_type = p_doc_type
    and status = 'pending'
  order by updated_at desc
  limit 1
  for update;

  if v_document_id is null then
    insert into public.driver_documents (
      driver_id, operator_id, doc_type, storage_path, issued_on, expires_on,
      status, reviewer_id, review_notes
    ) values (
      v_driver_id, v_operator_id, p_doc_type, trim(p_storage_path), p_issued_on, p_expires_on,
      'pending', null, null
    ) returning id into v_document_id;
  else
    update public.driver_documents
    set storage_path = trim(p_storage_path),
        issued_on = p_issued_on,
        expires_on = p_expires_on,
        status = 'pending',
        reviewer_id = null,
        review_notes = null
    where id = v_document_id;
  end if;

  return v_document_id;
end;
$$;

revoke all on function public.submit_driver_document(
  public.driver_doc_type, text, date, date
) from public, anon;
grant execute on function public.submit_driver_document(
  public.driver_doc_type, text, date, date
) to authenticated;

create or replace function public.review_driver_document(
  p_document_id uuid,
  p_status public.document_status,
  p_review_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only an operator admin can review driver documents' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'Review status must be approved or rejected' using errcode = '22023';
  end if;

  update public.driver_documents
  set status = p_status,
      reviewer_id = auth.uid(),
      review_notes = p_review_notes,
      updated_at = now()
  where id = p_document_id
    and operator_id = public.auth_operator()
    and status = 'pending'
  returning id into v_document_id;

  if v_document_id is null then
    raise exception 'Pending document not found for this operator' using errcode = 'P0002';
  end if;
  return v_document_id;
end;
$$;

revoke all on function public.review_driver_document(
  uuid, public.document_status, text
) from public, anon;
grant execute on function public.review_driver_document(
  uuid, public.document_status, text
) to authenticated;

-- Null means this operator has no effective required rules configured for the
-- requested subject type. Authorization callers must accept only TRUE.
create or replace function public.subject_documents_compliant(p_applies_to text, p_subject_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_operator_id uuid;
  v_country text;
  v_state text;
  v_rule record;
  v_has_required_rule boolean := false;
begin
  if p_applies_to = 'driver' then
    select d.operator_id, o.country, o.state
    into v_operator_id, v_country, v_state
    from public.driver_profiles d
    join public.operators o on o.id = d.operator_id
    where d.user_id = p_subject_id;
  elsif p_applies_to = 'vehicle' then
    select v.operator_id, o.country, o.state
    into v_operator_id, v_country, v_state
    from public.vehicles v
    join public.operators o on o.id = v.operator_id
    where v.id = p_subject_id;
  else
    return false;
  end if;
  if v_operator_id is null or v_country is null then
    return false;
  end if;

  for v_rule in
    select effective_rules.doc_type
    from (
      select distinct on (r.doc_type) r.doc_type, r.is_required
      from public.compliance_rules r
      where r.operator_id = v_operator_id
        and r.country = v_country
        and r.applies_to = 'driver'
        and (r.state is null or r.state = v_state)
      order by r.doc_type, (r.state is not null) desc, r.updated_at desc, r.id desc
    ) effective_rules
    where effective_rules.is_required
  loop
    v_has_required_rule := true;
    if p_applies_to = 'driver' and not exists (
      select 1 from public.driver_documents dd
      where dd.driver_id = p_subject_id
        and dd.doc_type::text = v_rule.doc_type
        and dd.status = 'approved'
        and (dd.expires_on is null or dd.expires_on >= current_date)
    ) then
      return false;
    end if;
    if p_applies_to = 'vehicle' and not exists (
      select 1 from public.vehicle_documents vd
      where vd.vehicle_id = p_subject_id
        and vd.doc_type::text = v_rule.doc_type
        and vd.status = 'approved'
        and (vd.expires_on is null or vd.expires_on >= current_date)
    ) then
      return false;
    end if;
  end loop;

  if not v_has_required_rule then
    return null;
  end if;
  return true;
end;
$$;

revoke all on function public.subject_documents_compliant(text, uuid) from public, anon, authenticated;
grant execute on function public.subject_documents_compliant(text, uuid) to service_role;

create or replace function public.driver_documents_compliant(p_driver_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and auth.role() <> 'service_role'
     and p_driver_id is distinct from auth.uid() then
    raise exception 'Drivers may only check their own compliance' using errcode = '42501';
  end if;
  return public.subject_documents_compliant('driver', p_driver_id);
end;
$$;

create or replace function public.vehicle_documents_compliant(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.subject_documents_compliant('vehicle', p_vehicle_id)
$$;

revoke all on function public.driver_documents_compliant(uuid) from public, anon;
grant execute on function public.driver_documents_compliant(uuid) to authenticated, service_role;
revoke all on function public.vehicle_documents_compliant(uuid) from public, anon, authenticated;
grant execute on function public.vehicle_documents_compliant(uuid) to service_role;

-- Keep the existing automatic dispatch eligibility rules, adding the same
-- configured driver-document policy used by online and offer acceptance.
create or replace function public.dispatch_candidates(p_trip_id uuid)
returns table (driver_id uuid, vehicle_id uuid, distance_m double precision, pickup_eta_s integer)
language sql
stable
security definer
set search_path = public
as $$
  with t as (
    select tr.*, bk.vehicle_type_requested
    from public.trips tr
    join public.bookings bk on bk.id = tr.booking_id
    where tr.id = p_trip_id and tr.status = 'requested'
  )
  select
    d.user_id as driver_id,
    ds.vehicle_id,
    st_distance(dll.point, t.pickup_point) as distance_m,
    (st_distance(dll.point, t.pickup_point) / 11)::int as pickup_eta_s
  from t
  join public.driver_profiles d
    on d.status = 'approved'
   and d.operator_id = t.operator_id
   and (d.fatigue_locked_until is null or d.fatigue_locked_until < now())
  join public.driver_status ds
    on ds.driver_id = d.user_id and ds.ended_at is null and ds.status = 'online'
  join public.driver_location_latest dll
    on dll.driver_id = d.user_id and dll.recorded_at > now() - interval '120 seconds'
  join public.vehicles v
    on v.id = ds.vehicle_id and v.status = 'active'
   and v.vehicle_type = t.vehicle_type_requested
  where st_dwithin(dll.point, t.pickup_point, 10000)
    and public.driver_documents_compliant(d.user_id) is true
    and public.vehicle_documents_compliant(v.id) is true
    and not exists (
      select 1 from public.trips ot
      where ot.driver_id = d.user_id
        and ot.status in ('assigned', 'driver_en_route', 'arrived_at_pickup', 'in_progress')
    )
    and not exists (
      select 1 from public.trip_offers o where o.trip_id = t.id and o.driver_id = d.user_id
    )
    and exists (
      select 1 from public.vehicle_inspections vi
      where vi.vehicle_id = v.id and vi.result = 'pass'
        and (vi.next_due_on is null or vi.next_due_on >= current_date)
    )
  order by distance_m asc
  limit 10
$$;

-- Use the same jurisdiction-aware driver-document predicate in the existing
-- expiry enforcement job. Unconfigured operators are blocked at authorization
-- boundaries but are not mass-suspended by this scheduled job.
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
      and public.driver_documents_compliant(d.user_id) is false;

  update public.vehicles v
    set status = 'out_of_service'
    where v.status = 'active'
      and exists (
        select 1 from public.compliance_rules r
        where r.operator_id = v.operator_id
          and r.applies_to = 'vehicle' and r.is_required
          and not exists (
            select 1 from public.vehicle_documents vd
            where vd.vehicle_id = v.id
              and vd.doc_type::text = r.doc_type
              and vd.status = 'approved'
              and (vd.expires_on is null or vd.expires_on >= current_date)
          )
      );
end;
$$;