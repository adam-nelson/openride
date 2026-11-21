-- Honor the requested subject type when resolving configured rules.
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
        and r.applies_to = p_applies_to
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
