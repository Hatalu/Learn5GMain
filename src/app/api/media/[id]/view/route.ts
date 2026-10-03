import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mediaId = params.id;
    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Call atomic Postgres RPC function
    const { error: rpcError } = await supabase.rpc('increment_media_view', {
      p_media_id: mediaId,
    });

    if (rpcError) {
      // Fallback in case RPC is missing in migration
      const { data: current } = await supabase
        .from('media')
        .select('view_count')
        .eq('id', mediaId)
        .single();

      if (current) {
        await supabase
          .from('media')
          .update({ view_count: (current.view_count || 0) + 1 })
          .eq('id', mediaId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error incrementing view';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
