"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { ProfileActionState } from "@/actions/profile-state";
import { auth } from "@/lib/auth";
import { changePasswordWithAuth, updateNameWithAuth } from "@/lib/profile";
import { requireSession } from "@/lib/session";

export async function updateNameAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  await requireSession();
  const result = await updateNameWithAuth(auth, await headers(), Object.fromEntries(formData));
  if (result.status === "success") revalidatePath("/", "layout");
  return result;
}

export async function changePasswordAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  await requireSession();
  return changePasswordWithAuth(auth, await headers(), Object.fromEntries(formData));
}
