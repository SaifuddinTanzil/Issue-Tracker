"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { VENDOR_ALLOWED_STATUS_OPTIONS, type VendorAllowedStatus } from "@/lib/vendor";

type VendorStatusSelectProps = {
  issueId: string;
  initialStatus: VendorAllowedStatus;
};

export function VendorStatusSelect({ issueId, initialStatus }: VendorStatusSelectProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [status, setStatus] = useState<VendorAllowedStatus>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = async () => {
    setIsSaving(true);

    const { error } = await supabase
      .from("issues")
      .update({ status })
      .eq("id", issueId);

    if (error) {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    toast({
      title: "Status updated",
      description: "The issue has been sent back to BRAC with your latest status.",
    });

    setIsSaving(false);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <Select value={status} onValueChange={(value) => setStatus(value as VendorAllowedStatus)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VENDOR_ALLOWED_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="button" className="w-full" onClick={handleUpdate} disabled={isSaving}>
        {isSaving ? "Updating..." : "Update Status"}
      </Button>
    </div>
  );
}