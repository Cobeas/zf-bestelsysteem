import { z } from "zod";

export const setSystemSettingsSchema = z.object({
    user_password: z.string().optional(),
    admin_password: z.string().optional(),
    live: z.boolean().default(false).optional(),
    system_name: z.string().optional(),
    id: z.string().optional(),
});