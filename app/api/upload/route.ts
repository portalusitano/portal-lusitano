import { NextRequest, NextResponse } from "next/server";
// O cliente partilhado, em vez de um segundo construído aqui com `!` nas
// variáveis de ambiente: sem elas, aquele rebentava à cabeça do módulo e
// levava o build atrás.
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifySession } from "@/lib/auth";
import { strictLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Rate limit: 5 requests per minute per IP
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    try {
      await strictLimiter.check(5, ip);
    } catch {
      return NextResponse.json(
        { error: "Demasiados pedidos. Tente novamente em breve." },
        { status: 429 }
      );
    }
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const rawFolder = (formData.get("folder") as string) || "uploads";

    // Sanitize folder — only allow alphanumeric, hyphens, and underscores
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, "");

    if (!file) {
      return NextResponse.json({ error: "Ficheiro nao fornecido" }, { status: 400 });
    }

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de ficheiro nao permitido. Use JPEG, PNG, WebP ou GIF." },
        { status: 400 }
      );
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ficheiro demasiado grande. Maximo 5MB." },
        { status: 400 }
      );
    }

    // Gerar nome unico — derive extension from validated MIME type, not filename
    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const timestamp = Date.now();
    const extension = MIME_TO_EXT[file.type] || "jpg";
    const fileName = `${folder}/${timestamp}-${crypto.randomUUID().replace(/-/g, "").substring(0, 8)}.${extension}`;

    // Converter File para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload para Supabase Storage
    const { data, error } = await supabaseAdmin.storage.from("images").upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      logger.error("Erro no upload:", error);
      return NextResponse.json({ error: "Erro ao fazer upload da imagem" }, { status: 500 });
    }

    // Obter URL publica
    const { data: urlData } = supabaseAdmin.storage.from("images").getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    });
  } catch (error) {
    logger.error("Erro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// DELETE - Remover imagem
export async function DELETE(request: NextRequest) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Rate limit: 5 requests per minute per IP
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    try {
      await strictLimiter.check(5, ip);
    } catch {
      return NextResponse.json(
        { error: "Demasiados pedidos. Tente novamente em breve." },
        { status: 429 }
      );
    }
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Path da imagem nao fornecido" }, { status: 400 });
    }

    // Prevent path traversal attacks
    if (path.includes("..") || path.startsWith("/") || path.startsWith("\\")) {
      return NextResponse.json({ error: "Path inválido" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.storage.from("images").remove([path]);

    if (error) {
      logger.error("Erro ao remover:", error);
      return NextResponse.json({ error: "Erro ao remover imagem" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Erro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
