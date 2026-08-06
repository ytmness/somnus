"use client";

import { useState } from "react";
import { toast } from "sonner";

const fieldClass =
  "w-full px-0 py-3 bg-transparent border-0 border-b border-white/40 text-white placeholder-white/55 outline-none transition-colors focus-visible:border-[#7BA3E8] focus-visible:shadow-[0_1px_0_0_#7BA3E8]";

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    agreedToTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsError, setTermsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreedToTerms) {
      setTermsError(true);
      toast.error("Please accept the privacy policy and terms of use");
      return;
    }
    setTermsError(false);

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not send message");
      }

      toast.success(data.message || "Thanks! We will be in touch soon.");
      setFormData({
        name: "",
        lastName: "",
        email: "",
        phone: "",
        country: "",
        city: "",
        agreedToTerms: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not send message";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate={false}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contact-name" className="sr-only">
            First name
          </label>
          <input
            id="contact-name"
            name="given-name"
            type="text"
            autoComplete="given-name"
            required
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            placeholder="First name…"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="contact-lastName" className="sr-only">
            Last name
          </label>
          <input
            id="contact-lastName"
            name="family-name"
            type="text"
            autoComplete="family-name"
            required
            value={formData.lastName}
            onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
            placeholder="Last name…"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-email" className="sr-only">
          Email
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          required
          value={formData.email}
          onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
          placeholder="Email…"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="contact-phone" className="sr-only">
          Phone
        </label>
        <input
          id="contact-phone"
          name="tel"
          type="tel"
          autoComplete="tel"
          value={formData.phone}
          onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
          placeholder="Phone…"
          className={fieldClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contact-country" className="sr-only">
            Country
          </label>
          <input
            id="contact-country"
            name="country"
            type="text"
            autoComplete="country-name"
            value={formData.country}
            onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
            placeholder="Country…"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="contact-city" className="sr-only">
            City
          </label>
          <input
            id="contact-city"
            name="city"
            type="text"
            autoComplete="address-level2"
            value={formData.city}
            onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
            placeholder="City…"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <input
          id="contact-terms"
          name="terms"
          type="checkbox"
          required
          checked={formData.agreedToTerms}
          aria-invalid={termsError || undefined}
          aria-describedby={termsError ? "contact-terms-error" : undefined}
          onChange={(e) => {
            setFormData((p) => ({ ...p, agreedToTerms: e.target.checked }));
            if (e.target.checked) setTermsError(false);
          }}
          className="mt-1 w-4 h-4 rounded border-white/40 bg-white/5 text-[#5B8DEF] focus-visible:ring-2 focus-visible:ring-[#7BA3E8]"
        />
        <label htmlFor="contact-terms" className="text-white/75 text-sm cursor-pointer">
          I have read and accept the privacy policy and terms of use.
        </label>
      </div>
      {termsError && (
        <p id="contact-terms-error" role="alert" className="text-red-300 text-sm -mt-3">
          You must accept the privacy policy and terms of use.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="somnus-btn w-full sm:w-auto px-12 py-4"
      >
        {isSubmitting ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
