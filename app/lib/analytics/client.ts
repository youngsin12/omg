import { createClient } from "../supabase/client";

export type ProductEventName =
  | "photo_saved"
  | "photo_download_clicked"
  | "photo_share_clicked"
  | "style_regenerated"
  | "dashboard_visited";

export async function trackProductEvent(
  eventName: ProductEventName,
  generationJobId?: string | null
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("product_events").insert({
      user_id: user.id,
      generation_job_id: generationJobId ?? null,
      event_name: eventName,
    });

    if (error) {
      console.warn("Product event was not recorded:", {
        eventName,
        code: error.code,
      });
    }
  } catch (error) {
    console.warn("Product analytics is unavailable:", {
      eventName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
