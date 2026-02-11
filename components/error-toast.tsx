"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ErrorToast({ errors }: { errors: string[] }) {
  useEffect(() => {
    errors.forEach((error) => toast.error(error));
  }, [errors]);

  return null;
}
