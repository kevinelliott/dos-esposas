"use client";

import { ArrowRight, Check, Mail } from "lucide-react";
import { FormEvent, useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (!event.currentTarget.checkValidity()) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="newsletter__success" role="status">
        <span>
          <Check size={20} />
        </span>
        <div>
          <strong>You&apos;re on the list.</strong>
          <p>Watch your inbox for the next drop.</p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="newsletter__form"
      action="https://restaurant.us1.list-manage.com/subscribe/post?u=939a9d2a0c4ee66e364cb8ef7&id=5ed757d3fb"
      method="post"
      target="_blank"
      onSubmit={submit}
    >
      <label htmlFor="newsletter-email">
        <Mail size={18} />
        Email address
      </label>
      <div>
        <input
          id="newsletter-email"
          type="email"
          name="EMAIL"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="amigo@example.com"
          autoComplete="email"
          required
        />
        <button type="submit" aria-label="Join the mailing list">
          <span>Join the list</span>
          <ArrowRight size={20} />
        </button>
      </div>
      <input
        className="newsletter__honeypot"
        type="text"
        name="b_939a9d2a0c4ee66e364cb8ef7_5ed757d3fb"
        tabIndex={-1}
        aria-hidden="true"
      />
    </form>
  );
}
