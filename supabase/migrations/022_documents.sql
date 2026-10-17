-- ==============================================================================
-- 022: คลัง "เอกสาร/ใบงาน" (Dev อัปโหลด PDF/Word ผู้ใช้ดูตัวอย่างมีลายน้ำ สมาชิกดาวน์โหลดได้)
--   * ตาราง documents  ทุกคนอ่านรายการ Public ได้ / Dev อ่าน-เขียนได้ทั้งหมด
--   * bucket documents     (ส่วนตัว) ไฟล์ต้นฉบับ  เข้าถึงได้เฉพาะ Dev  สมาชิกดาวน์โหลดผ่านลิงก์ชั่วคราวจาก API
--   * bucket doc-previews  (สาธารณะ) รูปตัวอย่างแต่ละหน้าที่ฝังลายน้ำแล้ว
--   * RPC นับยอดดู/ดาวน์โหลด เรียกได้เฉพาะฝั่งเซิร์ฟเวอร์
-- รันซ้ำได้ปลอดภัย
-- ==============================================================================

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text check (description is null or char_length(description) <= 2000),
  subject text not null check (subject in ('คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ')),
  grade_level text[] not null default '{}',
  doc_type text not null check (doc_type in ('เอกสาร', 'ใบงาน')),
  is_public boolean not null default true,
  -- [{ id, kind: 'pdf'|'word', name, size, path, pages, preview: [path ใน doc-previews] }]
  files jsonb not null default '[]'::jsonb check (jsonb_typeof(files) = 'array'),
  cover_path text,
  page_count integer not null default 0,
  view_count integer not null default 0,
  download_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_created on public.documents(created_at desc);

alter table public.documents enable row level security;

drop policy if exists "Anyone can read public documents" on public.documents;
create policy "Anyone can read public documents"
  on public.documents for select
  using (is_public or public.is_dev());

drop policy if exists "Devs can insert documents" on public.documents;
create policy "Devs can insert documents"
  on public.documents for insert
  to authenticated
  with check (public.is_dev());

drop policy if exists "Devs can update documents" on public.documents;
create policy "Devs can update documents"
  on public.documents for update
  to authenticated
  using (public.is_dev())
  with check (public.is_dev());

drop policy if exists "Devs can delete documents" on public.documents;
create policy "Devs can delete documents"
  on public.documents for delete
  to authenticated
  using (public.is_dev());

-- นับยอด (เรียกจาก API ฝั่งเซิร์ฟเวอร์เท่านั้น)
create or replace function public.increment_document_count(p_id uuid, p_download boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.documents
     set view_count = view_count + (case when p_download then 0 else 1 end),
         download_count = download_count + (case when p_download then 1 else 0 end)
   where id = p_id;
$$;
revoke all on function public.increment_document_count(uuid, boolean) from public, anon, authenticated;
grant execute on function public.increment_document_count(uuid, boolean) to service_role;

-- ------------------------------------------------------------------------------
-- Storage
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('doc-previews', 'doc-previews', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ไฟล์ต้นฉบับ: เฉพาะ Dev (คนอื่นได้ลิงก์ชั่วคราวจากเซิร์ฟเวอร์เมื่อเป็นสมาชิก)
drop policy if exists "Devs manage documents files" on storage.objects;
create policy "Devs manage documents files"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'documents' and public.is_dev())
  with check (bucket_id = 'documents' and public.is_dev());

-- รูปตัวอย่าง: ทุกคนดูได้ทางลิงก์สาธารณะ เขียน/ลบได้เฉพาะ Dev
drop policy if exists "Devs manage doc previews" on storage.objects;
create policy "Devs manage doc previews"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'doc-previews' and public.is_dev())
  with check (bucket_id = 'doc-previews' and public.is_dev());
