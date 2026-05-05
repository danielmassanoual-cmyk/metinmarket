import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import {
  cleanMultiline,
  cleanText,
  formatContact,
  isPositiveNumber,
  validateImage,
  verifyTurnstile,
} from "../../../lib/public-submit";

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const formData = await request.formData();
  const captcha = await verifyTurnstile(cleanText(formData.get("captcha"), 2000));

  if (!captcha.ok) {
    return Response.json({ error: captcha.error }, { status: 403 });
  }

  const type = cleanText(formData.get("type"), 20);
  const title = cleanText(formData.get("title"), type === "Wons" ? 6 : 25);
  const description = cleanMultiline(formData.get("description"), 200);
  const server = cleanText(formData.get("server"), 40);
  const sellerExpectedPrice = cleanText(formData.get("seller_expected_price"), 4);
  const sellerContactMethod = cleanText(formData.get("seller_contact_method"), 20);
  const sellerContact = cleanText(formData.get("seller_contact"), 50);
  const image = formData.get("image");
  const imageFile = image instanceof File ? image : null;

  if (
    !title ||
    !server ||
    !type ||
    !sellerExpectedPrice ||
    !sellerContactMethod ||
    !sellerContact
  ) {
    return Response.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!isPositiveNumber(sellerExpectedPrice)) {
    return Response.json({ error: "Invalid price." }, { status: 400 });
  }

  if ((type === "Item" || type === "Conta") && !imageFile) {
    return Response.json({ error: "Image is required." }, { status: 400 });
  }

  const imageError = validateImage(imageFile);

  if (imageError) {
    return Response.json({ error: imageError }, { status: 400 });
  }

  let imageUrl: string | null = null;

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split(".").pop() || "webp";
    const filePath = `submissions/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("listing-images")
      .upload(filePath, await imageFile.arrayBuffer(), {
        contentType: imageFile.type,
      });

    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage
      .from("listing-images")
      .getPublicUrl(filePath);

    imageUrl = data.publicUrl;
  }

  const { error } = await supabaseAdmin.from("sale_submissions").insert({
    title,
    description,
    server,
    type,
    seller_expected_price: `${sellerExpectedPrice}€`,
    seller_contact: formatContact(sellerContactMethod, sellerContact),
    image_url: imageUrl,
    status: "Pendente",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
