import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from("uploads")
      .list("", {
        limit: 20,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.error("Supabase list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const files = (data || []).map((file) => {
      const { data: urlData } = supabaseAdmin.storage
        .from("uploads")
        .getPublicUrl(file.name);
      return {
        name: file.name,
        size: file.metadata?.size ?? 0,
        createdAt: file.created_at,
        publicUrl: urlData.publicUrl,
      };
    });

    return NextResponse.json({ files });
  } catch (err) {
    console.error("Files route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
