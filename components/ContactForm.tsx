"use client";

import { useState } from "react";
import { toast } from "sonner";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreedToTerms) {
      toast.error("Debes aceptar la política de privacidad y condiciones de uso");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al enviar");
      }

      toast.success(data.message || "¡Gracias! Te contactaremos pronto.");
      setFormData({
        name: "",
        lastName: "",
        email: "",
        phone: "",
        country: "",
        city: "",
        agreedToTerms: false,
      });
    } catch (err: any) {
      toast.error(err.message || "Error al enviar");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contact-name" className="sr-only">
            Nombre
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            placeholder="Nombre"
            className="w-full px-0 py-3 bg-transparent border-0 border-b border-white/40 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold transition-colors"
          />
        </div>
        <div>
          <label htmlFor="contact-lastName" className="sr-only">
            Apellido
          </label>
          <input
            id="contact-lastName"
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
            placeholder="Apellido"
            className="w-full px-0 py-3 bg-transparent border-0 border-b border-white/40 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold transition-colors"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-email" className="sr-only">
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
          placeholder="Email"
          className="w-full px-0 py-3 bg-transparent border-0 border-b border-white/40 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold transition-colors"
        />
      </div>

      <div>
        <label htmlFor="contact-phone" className="sr-only">
          Teléfono
        </label>
        <input
          id="contact-phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
          placeholder="Teléfono"
          className="w-full px-0 py-3 bg-transparent border-0 border-b border-white/40 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contact-country" className="sr-only">
            País
          </label>
          <input
            id="contact-country"
            type="text"
            value={formData.country}
            onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
            placeholder="País"
            className="w-full px-0 py-3 bg-transparent border-0 border-b border-white/40 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold transition-colors"
          />
        </div>
        <div>
          <label htmlFor="contact-city" className="sr-only">
            Ciudad
          </label>
          <input
            id="contact-city"
            type="text"
            value={formData.city}
            onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
            placeholder="Ciudad"
            className="w-full px-0 py-3 bg-transparent border-0 border-b border-white/40 text-white placeholder-white/50 focus:outline-none focus:border-regia-gold transition-colors"
          />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <input
          id="contact-terms"
          type="checkbox"
          required
          checked={formData.agreedToTerms}
          onChange={(e) => setFormData((p) => ({ ...p, agreedToTerms: e.target.checked }))}
          className="mt-1 w-4 h-4 rounded border-white/40 bg-white/5 text-regia-gold focus:ring-regia-gold"
        />
        <label htmlFor="contact-terms" className="text-white/70 text-sm cursor-pointer">
          He leído y acepto la política de privacidad y condiciones generales de uso.
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto px-12 py-4 rounded-lg bg-regia-gold text-white font-semibold uppercase tracking-wider hover:bg-regia-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
}
