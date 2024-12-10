import WhatsappCloudAPI from "whatsappcloudapi_wrapper";
import { createClient } from "@supabase/supabase-js";

import dotenv from "dotenv";

dotenv.config();

const options = {
  db: {
    schema: "public",
  },
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: true,
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PRIVATE,
  options
);

const wt = new WhatsappCloudAPI({
  accessToken: process.env.CLOUD_API_ACCESS_TOKEN,
  senderPhoneNumberId: process.env.WA_PHONE_NUMBER_ID,
  WABA_ID: process.env.BUSINESS_ID,
});

export { wt, supabase };
