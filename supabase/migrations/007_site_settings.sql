-- ==============================================================================
-- 007: ตั้งค่าเว็บ (site_settings) เช่น เปิด/ปิดมาสคอตน้องไฟว์จี
-- ทุกคนอ่านได้ (หน้าแรกต้องใช้) เขียนได้เฉพาะ Dev  รันซ้ำได้ปลอดภัย
-- ==============================================================================

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Devs insert site settings" on public.site_settings;
create policy "Devs insert site settings"
  on public.site_settings for insert
  to authenticated
  with check (public.is_dev());

drop policy if exists "Devs update site settings" on public.site_settings;
create policy "Devs update site settings"
  on public.site_settings for update
  to authenticated
  using (public.is_dev())
  with check (public.is_dev());

insert into public.site_settings (key, value)
values ('mascot_enabled', 'true'::jsonb)
on conflict (key) do nothing;
