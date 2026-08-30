"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EventCreatorShell } from "./EventCreatorShell";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { EventHeaderFields } from "./sections/EventHeaderFields";
import { EventWhenWhere } from "./sections/EventWhenWhere";
import { EventDescription } from "./sections/EventDescription";
import { EventMediaExtras } from "./sections/EventMediaExtras";
import { EventTicketsSection } from "./sections/EventTicketsSection";
import { EventPublishToggle } from "./sections/EventPublishToggle";
import {
  buildCreateEventPayload,
  buildUpdateEventPayload,
  createInitialFormData,
  firstErrorSectionId,
  mapApiEventToFormData,
  validateAll,
  type EventFormData,
  type EventFormMode,
  type OrganizationOption,
} from "./types";

interface EventFormWizardProps {
  mode: EventFormMode;
  /** When set, wizard loads the event and PATCHes instead of creating */
  eventId?: string;
  organizations?: OrganizationOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EventFormWizard({
  mode,
  eventId,
  organizations: organizationsProp = [],
  onClose,
  onSuccess,
}: EventFormWizardProps) {
  const isEdit = Boolean(eventId);
  const [organizations, setOrganizations] =
    useState<OrganizationOption[]>(organizationsProp);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EventFormData>(() =>
    createInitialFormData(organizationsProp)
  );
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(
    isEdit ? null : JSON.stringify(createInitialFormData(organizationsProp))
  );

  useEffect(() => {
    setOrganizations(organizationsProp);
  }, [organizationsProp]);

  // Admin edit from EventsTable may not pass orgs — load them once.
  useEffect(() => {
    if (organizationsProp.length > 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/organizations", { credentials: "include" });
        const json = await res.json();
        if (!cancelled && res.ok) {
          setOrganizations(
            (json.data || []).map((o: { id: string; name: string }) => ({
              id: o.id,
              name: o.name,
            }))
          );
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationsProp.length]);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    void (async () => {
      setIsFetching(true);
      setError(null);
      try {
        const res = await fetch(`/api/events/${eventId}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Could not load event");
        }
        if (cancelled) return;
        const mapped = mapApiEventToFormData(json.data);
        setData(mapped);
        setInitialSnapshot(JSON.stringify(mapped));
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Could not load event";
        toast.error(message);
        onClose();
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, onClose]);

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return JSON.stringify(data) !== initialSnapshot;
  }, [data, initialSnapshot]);

  const patch = (partial: Partial<EventFormData>) => {
    setError(null);
    setData((prev) => ({ ...prev, ...partial }));
  };

  const handleClose = () => {
    if (
      isDirty &&
      !window.confirm(
        isEdit
          ? "Discard changes? Unsaved edits will be lost."
          : "Discard this event? Unsaved changes will be lost."
      )
    ) {
      return;
    }
    onClose();
  };

  const handleSubmit = async () => {
    const errors = validateAll(data, mode, { isEdit });
    if (errors.length > 0) {
      setError(errors.join(" · "));
      const sectionId = firstErrorSectionId(errors);
      if (sectionId) {
        document
          .getElementById(sectionId)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isEdit && eventId) {
        const response = await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(buildUpdateEventPayload(data, mode)),
        });
        const json = await response.json();
        if (!response.ok) {
          const detailMsg = Array.isArray(json.details)
            ? json.details
                .map((d: { message?: string }) => d.message)
                .filter(Boolean)
                .join(" · ")
            : "";
          throw new Error(detailMsg || json.error || "Could not update event");
        }
        toast.success("Event updated");
        onSuccess();
        return;
      }

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildCreateEventPayload(data, mode)),
      });

      const json = await response.json();
      if (!response.ok) {
        if (json.code === "STRIPE_REQUIRED" || json.code === "ORG_REQUIRED") {
          toast.error(json.error);
          onClose();
          return;
        }
        const detailMsg = Array.isArray(json.details)
          ? json.details
              .map((d: { message?: string }) => d.message)
              .filter(Boolean)
              .join(" · ")
          : "";
        throw new Error(detailMsg || json.error || "Could not create event");
      }

      toast.success("Event created");
      onSuccess();
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : isEdit
            ? "Could not update event"
            : "Could not create event";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <EventCreatorShell
      title={isEdit ? "Edit event" : "Create event"}
      onClose={handleClose}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel={isEdit ? "Save changes" : "Create event"}
      submittingLabel={isEdit ? "Saving…" : "Publishing…"}
      error={error}
      isLoading={isFetching}
      flyer={
        <ImageUploadField
          variant="flyer"
          value={data.imageUrl}
          onChange={(url) => patch({ imageUrl: url })}
          framing={{
            posX: data.imagePosX,
            posY: data.imagePosY,
            zoom: data.imageZoom,
          }}
          onFramingChange={(f) =>
            patch({
              imagePosX: f.posX,
              imagePosY: f.posY,
              imageZoom: f.zoom,
            })
          }
          className="h-full"
        />
      }
    >
      <div id="section-basics">
        <EventHeaderFields
          data={data}
          mode={mode}
          organizations={organizations}
          onChange={patch}
        />
      </div>

      <EventWhenWhere data={data} onChange={patch} />

      <EventDescription data={data} onChange={patch} />

      <EventMediaExtras data={data} onChange={patch} />

      <EventTicketsSection data={data} onChange={patch} isEdit={isEdit} />

      <EventPublishToggle data={data} onChange={patch} />
    </EventCreatorShell>
  );
}
