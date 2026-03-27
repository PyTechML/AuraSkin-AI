-- =============================================================================
-- AuraSkin AI — Role/profile consistency observability safeguards
-- Non-destructive: adds diagnostics view + helper function (no hard constraints).
-- =============================================================================

-- Detect active+approved role rows that do not have a matching role profile row.
create or replace view public.role_profile_consistency_issues as
with eligible as (
  select
    p.id,
    p.email,
    lower(coalesce(p.role, '')) as role,
    lower(coalesce(p.status, 'approved')) as status,
    coalesce(p.is_active, true) as is_active
  from public.profiles p
)
select
  e.id as profile_id,
  e.email,
  e.role,
  case
    when e.role = 'store' and sp.id is null then 'missing_store_profile'
    when e.role = 'dermatologist' and dp.id is null then 'missing_dermatologist_profile'
    else null
  end as issue_type
from eligible e
left join public.store_profiles sp on sp.id = e.id and lower(coalesce(sp.approval_status, 'approved')) = 'approved'
left join public.dermatologist_profiles dp on dp.id = e.id
where e.status = 'approved'
  and e.is_active = true
  and e.role in ('store', 'dermatologist')
  and (
    (e.role = 'store' and sp.id is null)
    or (e.role = 'dermatologist' and dp.id is null)
  );

comment on view public.role_profile_consistency_issues is
  'Diagnostics: active approved partner-role profiles missing matching public role-profile rows.';

-- Helper function used by smoke tooling/admin checks.
create or replace function public.role_profile_consistency_issue_count()
returns integer
language sql
stable
as $$
  select count(*)::int from public.role_profile_consistency_issues;
$$;

comment on function public.role_profile_consistency_issue_count() is
  'Returns count of role/profile consistency issues for active approved store/dermatologist accounts.';
