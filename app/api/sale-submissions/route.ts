import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import { checkRateLimit } from "../../../lib/rate-limit";
import { blockIfMaintenance } from "../../../lib/site-settings";
import {
  cleanMultiline,
  cleanText,
  formatContact,
  getImageExtension,
  isValidCentPrice,
  isValidItemPrice,
  normalizeCentPrice,
  validateImage,
  validateImageSignature,
  verifyTurnstile,
} from "../../../lib/public-submit";

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const rateLimit = checkRateLimit(request, "sale-submissions", 4);

  if (!rateLimit.ok) {
    return Response.json(
      { error: `Too many requests. Try again in ${rateLimit.retryAfter}s.` },
      { status: 429 }
    );
  }

  const maintenanceResponse = await blockIfMaintenance(supabaseAdmin);

  if (maintenanceResponse) return maintenanceResponse;

  const formData = await request.formData();
  const captcha = await verifyTurnstile(
    cleanText(formData.get("captcha"), 2000),
    request
  );

  if (!captcha.ok) {
    return Response.json({ error: captcha.error }, { status: 403 });
  }

  const type = cleanText(formData.get("type"), 20);
  const title = cleanText(formData.get("title"), type === "Wons" ? 6 : 25);
  const description = cleanMultiline(formData.get("description"), 200);
  const server = cleanText(formData.get("server"), 40);
  const sellerExpectedPrice = cleanText(
    formData.get("seller_expected_price"),
    type === "Wons" ? 4 : 5
  );
  const sellerContactMethod = cleanText(formData.get("seller_contact_method"), 20);
  const sellerContact = cleanText(formData.get("seller_contact"), 50);
  const images = formData
    .getAll("images")
    .filter((item): item is File => item instanceof File && item.size > 0);
  const fallbackImage = formData.get("image");
  const imageFiles =
    images.length > 0
      ? images
      : fallbackImage instanceof File && fallbackImage.size > 0
        ? [fallbackImage]
        : [];
  const maxImages = type === "Conta" ? 8 : 1;

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

  const validPrice =
    type === "Wons"
      ? isValidCentPrice(sellerExpectedPrice)
      : isValidItemPrice(sellerExpectedPrice);

  if (!validPrice) {
    return Response.json(
      {
        error:
          "For Wons use 0.01 to 0.99. For items/accounts use up to 5 digits.",
      },
      { status: 400 }
    );
  }

  if ((type === "Item" || type === "Conta") && imageFiles.length === 0) {
    return Response.json({ error: "Image is required." }, { status: 400 });
  }

  if (imageFiles.length > maxImages) {
    return Response.json(
      {
        error:
          type === "Conta"
            ? "Accounts allow up to 8 images."
            : "Only one image is allowed.",
      },
      { status: 400 }
    );
  }

  for (const imageFile of imageFiles) {
    const imageError = validateImage(imageFile);

    if (imageError) {
      return Response.json({ error: imageError }, { status: 400 });
    }
  }

  let imageUrl: string | null = null;
  const imageUrls: string[] = [];

  for (const imageFile of imageFiles) {
    const imageBytes = await imageFile.arrayBuffer();
    const signatureError = validateImageSignature(imageFile, imageBytes);

    if (signatureError) {
      return Response.json({ error: signatureError }, { status: 400 });
    }

    const fileExt = getImageExtension(imageFile);
    const filePath = `submissions/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("listing-images")
      .upload(filePath, imageBytes, {
        contentType: imageFile.type,
      });

    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage
      .from("listing-images")
      .getPublicUrl(filePath);

    imageUrl = data.publicUrl;
    imageUrls.push(data.publicUrl);
  }

  const { error } = await supabaseAdmin.from("sale_submissions").insert({
    title,
    description,
    server,
    type,
    seller_expected_price: `${
      type === "Wons" ? normalizeCentPrice(sellerExpectedPrice) : sellerExpectedPrice
    }€`,
    seller_contact: formatContact(sellerContactMethod, sellerContact),
    image_url: imageUrl,
    image_urls: imageUrls,
    status: "Pendente",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
