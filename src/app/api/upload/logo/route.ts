import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getProfile } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      return NextResponse.json({ error: 'Formato inválido. Aceito apenas JPG ou PNG' }, { status: 400 });
    }

    if (file.size > 2097152) { // 2MB
      return NextResponse.json({ error: 'A imagem deve ter no máximo 2MB' }, { status: 400 });
    }

    const bucketName = 'logos';

    // Tentar criar o bucket silenciosamente caso não exista
    try {
      await supabaseAdmin.storage.createBucket(bucketName, { public: true, fileSizeLimit: 2097152, allowedMimeTypes: ['image/jpeg', 'image/png'] });
    } catch (e) {
      // Já existe ou erro seguro
    }

    const buffer = await file.arrayBuffer();
    const fileName = `${profile.id}-${Date.now()}`;
    const filePath = `custom/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Erro no upload do bucket logos:', uploadError);
      return NextResponse.json({ error: 'Falha ao salvar a imagem no servidor' }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrlData.publicUrl, ok: true });

  } catch (error: any) {
    console.error('Erro na rota de upload:', error);
    return NextResponse.json({ error: 'Ocorreu um erro interno' }, { status: 500 });
  }
}
