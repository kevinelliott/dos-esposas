import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="not-found">
      <div className="not-found__code" aria-hidden="true">
        404
      </div>
      <Image
        src="/assets/img/crying-taco.gif"
        alt="A crying taco"
        width={488}
        height={286}
        unoptimized
      />
      <p className="eyebrow">Order not found</p>
      <h1>This taco left the blockchain.</h1>
      <p>We checked every block. There&apos;s nothing to serve at this URL.</p>
      <Link className="button button--primary" href="/">
        <ArrowLeft size={18} />
        Back to the cantina
      </Link>
    </section>
  );
}
