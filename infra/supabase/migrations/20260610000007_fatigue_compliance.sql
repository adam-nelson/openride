-- Fatigue accumulation + lockout, and compliance enforcement.

-- ============================================================================
-- Fatigue: accumulate drive time when a trip completes and lock the driver out
-- once cumulative drive time in the trailing 24h reaches the configured cap.
-- ============================================================================
create or replace function public.accumulate_fatigue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_drive_s integer;
  v_total_s integer;
  v_cap_s integer;
  v_rest_s integer;
begin
  if new.driver_id is null or new.started_at is null or new.completed_at is null then
    return new;
  end if;

  v_drive_s := greatest(0, extract(epoch from (new.completed_at - new.started_at))::int);
  v_cap_s := coalesce((select value::text::int from public.app_config where key = 'fatigue.max_drive_time_s'), 43200);
  v_rest_s := coalesce((select value::text::int from public.app_config where key = 'fatigue.rest_after_lockout_s'), 36000);

  -- Add to the driver's open session (open one if needed).
  select id into v_session_id
  from public.fatigue_sessions
  where driver_id = new.driver_id and ended_at is null
  order by started_at desc
  limit 1;

  if v_session_id is null then
    insert into public.fatigue_sessions (driver_id, drive_time_s)
    values (new.driver_id, v_drive_s)
    returning id into v_session_id;
  else
    update public.fatigue_sessions
      set drive_time_s = drive_time_s + v_drive_s
      where id = v_session_id;
  end if;

  -- Rolling 24h cumulative drive time.
  select coalesce(sum(drive_time_s), 0) into v_total_s
  from public.fatigue_sessions
  where driver_id = new.driver_id and started_at > now() - interval '24 hours';

  if v_total_s >= v_cap_s then
    update public.driver_profiles
      set fatigue_locked_until = now() + make_interval(secs => v_rest_s)
      where user_id = new.driver_id;
    update public.fatigue_sessions
      set enforced_lockout = true, lockout_until = now() + make_interval(secs => v_rest_s), ended_at = now()
      where id = v_session_id;
    -- Force offline.
    update public.driver_status
      set status = 'offline', ended_at = now()
      where driver_id = new.driver_id and ended_at is null;
  end if;

  return new;
end;
$$;

create trigger trg_accumulate_fatigue
  after update on public.trips
  for each row
  when (new.status = 'completed' and old.status is distinct from 'completed')
  execute function public.accumulate_fatigue();

-- ============================================================================
-- enforce_compliance(): expire documents past their date and suspend drivers /
-- take vehicles out of service that are missing a required, current document.
-- Reactivation (once docs are renewed) is a manual admin action.
-- ============================================================================
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
      and exists (
        select 1 from public.compliance_rules r
        where r.applies_to = 'driver' and r.is_required
          and not exists (
            select 1 from public.driver_documents dd
            where dd.driver_id = d.user_id
              and dd.doc_type = r.doc_type::public.driver_doc_type
              and dd.status = 'approved'
              and (dd.expires_on is null or dd.expires_on >= current_date)
          )
      );

  update public.vehicles v
    set status = 'out_of_service'
    where v.status = 'active'
      and exists (
        select 1 from public.compliance_rules r
        where r.applies_to = 'vehicle' and r.is_required
          and not exists (
            select 1 from public.vehicle_documents vd
            where vd.vehicle_id = v.id
              and vd.doc_type = r.doc_type::public.vehicle_doc_type
              and vd.status = 'approved'
              and (vd.expires_on is null or vd.expires_on >= current_date)
          )
      );
end;
$$;

-- Best-effort daily cron (pg_cron may be unavailable; the function is callable
-- by any scheduler otherwise).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('openride-enforce-compliance', '0 2 * * *', 'select public.enforce_compliance()');
exception
  when others then
    raise notice 'pg_cron unavailable; enforce_compliance not scheduled: %', sqlerrm;
end $$;
